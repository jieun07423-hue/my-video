import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import db from '@/lib/db';
import { resetMockData } from '@/lib/db/mock';
import {
  validateStock,
  deductStock,
  restoreStock,
  createOrderWithStockDeduction,
  cancelOrder,
  generateOrderNumber,
  calculateIsSoldOut,
} from '../orderInventorySync.service';
import { clearWebhookConfigs, registerWebhook } from '../webhookDispatcher.service';

function seedProduct(overrides: Record<string, unknown> = {}) {
  return db.product.create({
    data: {
      name: '테스트 상품',
      sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      price: 10000,
      stockQuantity: 100,
      lowStockThreshold: 5,
      isActive: true,
      ...overrides,
    },
  });
}

describe('orderInventorySync.service', () => {
  beforeEach(async () => {
    resetMockData();
    clearWebhookConfigs();
  });

  describe('calculateIsSoldOut', () => {
    it('stockQuantity가 null이면 false를 반환한다', () => {
      expect(calculateIsSoldOut(null, 5)).toBe(false);
    });

    it('stockQuantity가 threshold 이하면 true를 반환한다', () => {
      expect(calculateIsSoldOut(3, 5)).toBe(true);
      expect(calculateIsSoldOut(5, 5)).toBe(true);
    });

    it('stockQuantity가 threshold보다 크면 false를 반환한다', () => {
      expect(calculateIsSoldOut(6, 5)).toBe(false);
      expect(calculateIsSoldOut(100, 5)).toBe(false);
    });
  });

  describe('generateOrderNumber', () => {
    it('ORD-YYYYMMDD-XXXXXX 형식을 반환한다', () => {
      const orderNumber = generateOrderNumber();
      expect(orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
    });

    it('매 호출마다 다른 번호를 생성한다', () => {
      const a = generateOrderNumber();
      const b = generateOrderNumber();
      expect(a).not.toBe(b);
    });
  });

  describe('validateStock', () => {
    it('재고가 충분하면 valid: true를 반환한다', async () => {
      const product = await seedProduct({ stockQuantity: 10 });

      const result = await validateStock(db, [
        { productId: product.id, quantity: 3, unitPrice: 10000 },
      ]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.products).toHaveLength(1);
    });

    it('제품이 존재하지 않으면 not_found 에러를 반환한다', async () => {
      const result = await validateStock(db, [
        { productId: 'nonexistent-id', quantity: 1, unitPrice: 10000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toBe('not_found');
    });

    it('비활성 제품이면 inactive 에러를 반환한다', async () => {
      const product = await seedProduct({ isActive: false, stockQuantity: 10 });

      const result = await validateStock(db, [
        { productId: product.id, quantity: 1, unitPrice: 10000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toBe('inactive');
    });

    it('품절 제품이면 sold_out 에러를 반환한다', async () => {
      const product = await seedProduct({ isSoldOut: true, stockQuantity: 0 });

      const result = await validateStock(db, [
        { productId: product.id, quantity: 1, unitPrice: 10000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toBe('sold_out');
    });

    it('재고가 부족하면 insufficient_stock 에러를 반환한다', async () => {
      const product = await seedProduct({ stockQuantity: 2 });

      const result = await validateStock(db, [
        { productId: product.id, quantity: 5, unitPrice: 10000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors[0].reason).toBe('insufficient_stock');
      expect(result.errors[0].available).toBe(2);
      expect(result.errors[0].requested).toBe(5);
    });

    it('stockQuantity가 null인 상품(무제한)은 항상 통과한다', async () => {
      const product = await seedProduct({ stockQuantity: null });

      const result = await validateStock(db, [
        { productId: product.id, quantity: 9999, unitPrice: 10000 },
      ]);

      expect(result.valid).toBe(true);
    });

    it('여러 아이템 중 하나라도 실패하면 valid: false를 반환한다', async () => {
      const p1 = await seedProduct({ stockQuantity: 10 });
      const p2 = await seedProduct({ stockQuantity: 1 });

      const result = await validateStock(db, [
        { productId: p1.id, quantity: 3, unitPrice: 10000 },
        { productId: p2.id, quantity: 5, unitPrice: 20000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].productId).toBe(p2.id);
    });
  });

  describe('deductStock', () => {
    it('정상적으로 재고를 차감한다', async () => {
      const product = await seedProduct({ stockQuantity: 10 });
      const order = await db.order.create({
        data: { orderNumber: generateOrderNumber(), storeId: 'store-1', totalAmount: 30000, status: 'confirmed' },
      });

      const result = await deductStock(db, [
        { productId: product.id, quantity: 3, unitPrice: 10000 },
      ], order.id);

      expect(result.deductions).toHaveLength(1);
      expect(result.deductions[0].previousQuantity).toBe(10);
      expect(result.deductions[0].newQuantity).toBe(7);
      expect(result.deductions[0].isShortage).toBe(false);

      const updated = await db.product.findUnique({ where: { id: product.id } });
      expect(updated.stockQuantity).toBe(7);
    });

    it('무제한 재고(null)는 차감하지 않고 기록만 남긴다', async () => {
      const product = await seedProduct({ stockQuantity: null });
      const order = await db.order.create({
        data: { orderNumber: generateOrderNumber(), storeId: 'store-1', totalAmount: 10000, status: 'confirmed' },
      });

      const result = await deductStock(db, [
        { productId: product.id, quantity: 999, unitPrice: 10000 },
      ], order.id);

      expect(result.deductions[0].previousQuantity).toBeNull();
      expect(result.deductions[0].newQuantity).toBeNull();
    });

    it('재고 부족 시 shortage를 반환하고 0으로 클램프한다', async () => {
      const product = await seedProduct({ stockQuantity: 2 });
      const order = await db.order.create({
        data: { orderNumber: generateOrderNumber(), storeId: 'store-1', totalAmount: 50000, status: 'confirmed' },
      });

      const result = await deductStock(db, [
        { productId: product.id, quantity: 5, unitPrice: 10000 },
      ], order.id);

      expect(result.deductions[0].isShortage).toBe(true);
      expect(result.shortages).toHaveLength(1);

      const updated = await db.product.findUnique({ where: { id: product.id } });
      expect(updated.stockQuantity).toBe(0);
    });

    it('재고가 임계치 이하로 떨어지면 is_sold_out을 true로 설정한다', async () => {
      const product = await seedProduct({ stockQuantity: 6, lowStockThreshold: 5 });
      const order = await db.order.create({
        data: { orderNumber: generateOrderNumber(), storeId: 'store-1', totalAmount: 30000, status: 'confirmed' },
      });

      await deductStock(db, [
        { productId: product.id, quantity: 2, unitPrice: 10000 },
      ], order.id);

      const updated = await db.product.findUnique({ where: { id: product.id } });
      expect(updated.isSoldOut).toBe(true);
      expect(updated.stockQuantity).toBe(4);
    });

    it('stock_history를 기록한다', async () => {
      const product = await seedProduct({ stockQuantity: 10 });
      const order = await db.order.create({
        data: { orderNumber: generateOrderNumber(), storeId: 'store-1', totalAmount: 30000, status: 'confirmed' },
      });

      await deductStock(db, [
        { productId: product.id, quantity: 3, unitPrice: 10000 },
      ], order.id);

      const history = await db.stockHistory.findMany({ where: { productId: product.id } });
      expect(history).toHaveLength(1);
      expect(history[0].changeType).toBe('order');
      expect(history[0].quantityChange).toBe(-3);
      expect(history[0].quantityAfter).toBe(7);
    });
  });

  describe('restoreStock', () => {
    it('취소 시 재고를 원복한다', async () => {
      const product = await seedProduct({ stockQuantity: 10 });
      const order = await db.order.create({
        data: { orderNumber: generateOrderNumber(), storeId: 'store-1', totalAmount: 30000, status: 'confirmed' },
      });
      await db.orderItem.create({
        data: { orderId: order.id, productId: product.id, quantity: 3, unitPrice: 10000, subtotal: 30000 },
      });

      await restoreStock(db, order.id);

      const updated = await db.product.findUnique({ where: { id: product.id } });
      expect(updated.stockQuantity).toBe(13);
    });

    it('복구 후 sold_out 상태를 다시 계산한다', async () => {
      const product = await seedProduct({ stockQuantity: 2, lowStockThreshold: 5, isSoldOut: true });
      const order = await db.order.create({
        data: { orderNumber: generateOrderNumber(), storeId: 'store-1', totalAmount: 30000, status: 'cancelled' },
      });
      await db.orderItem.create({
        data: { orderId: order.id, productId: product.id, quantity: 10, unitPrice: 10000, subtotal: 100000 },
      });

      await restoreStock(db, order.id);

      const updated = await db.product.findUnique({ where: { id: product.id } });
      expect(updated.stockQuantity).toBe(12);
      expect(updated.isSoldOut).toBe(false);
    });
  });

  describe('createOrderWithStockDeduction', () => {
    it('단일 트랜잭션으로 주문 생성 + 재고 차감을 수행한다', async () => {
      const product = await seedProduct({ stockQuantity: 10 });

      const result = await createOrderWithStockDeduction(db, 'store-1', [
        { productId: product.id, quantity: 3, unitPrice: 10000 },
      ]);

      expect(result.order.status).toBe('confirmed');
      expect(result.order.totalAmount).toBe(30000);
      expect(result.deductions[0].newQuantity).toBe(7);

      const updated = await db.product.findUnique({ where: { id: product.id } });
      expect(updated.stockQuantity).toBe(7);
    });

    it('재고가 부족하면 에러를 던지고 아무것도 생성되지 않는다', async () => {
      const product = await seedProduct({ stockQuantity: 2 });

      await expect(
        createOrderWithStockDeduction(db, 'store-1', [
          { productId: product.id, quantity: 5, unitPrice: 10000 },
        ])
      ).rejects.toThrow('재고 검증 실패');

      const orders = await db.order.findMany();
      expect(orders).toHaveLength(0);
    });

    it('여러 아이템을 포함한 주문을 생성한다', async () => {
      const p1 = await seedProduct({ sku: 'SKU-A1', stockQuantity: 10, price: 10000 });
      const p2 = await seedProduct({ sku: 'SKU-B1', stockQuantity: 20, price: 20000 });

      const result = await createOrderWithStockDeduction(db, 'store-1', [
        { productId: p1.id, quantity: 2, unitPrice: 10000 },
        { productId: p2.id, quantity: 3, unitPrice: 20000 },
      ]);

      expect(result.items).toHaveLength(2);
      expect(result.deductions).toHaveLength(2);
      expect(result.order.totalAmount).toBe(80000);
    });
  });

  describe('cancelOrder', () => {
    it('주문 취소 시 재고를 복구하고 상태를 cancelled로 변경한다', async () => {
      const product = await seedProduct({ stockQuantity: 10 });
      const created = await createOrderWithStockDeduction(db, 'store-1', [
        { productId: product.id, quantity: 3, unitPrice: 10000 },
      ]);

      const result = await cancelOrder(db, created.order.id as string);

      expect(result.order.status).toBe('cancelled');
      expect(result.restoredItems).toHaveLength(1);
      expect(result.restoredItems[0].newQuantity).toBe(10);
    });

    it('존재하지 않는 주문을 취소하면 에러를 던진다', async () => {
      await expect(cancelOrder(db, 'nonexistent-id')).rejects.toThrow('주문을 찾을 수 없습니다');
    });

    it('이미 취소된 주문을 다시 취소하면 에러를 던진다', async () => {
      const product = await seedProduct({ stockQuantity: 10 });
      const created = await createOrderWithStockDeduction(db, 'store-1', [
        { productId: product.id, quantity: 1, unitPrice: 10000 },
      ]);

      await cancelOrder(db, created.order.id as string);
      await expect(cancelOrder(db, created.order.id as string)).rejects.toThrow('이미 취소된');
    });
  });

  describe('webhook event emission (integration)', () => {
    it('재고 부족 시 stock.shortage 웹훅이 발행된다', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('OK'),
      };
      const mockDelivery = jest.fn().mockResolvedValue(mockResponse);

      global.fetch = mockDelivery as unknown as typeof global.fetch;

      registerWebhook({
        url: 'https://hooks.example.com/stock',
        events: ['stock.shortage', 'product.sold_out'],
        maxRetries: 1,
      });

      const product = await seedProduct({ stockQuantity: 3, lowStockThreshold: 5 });
      await createOrderWithStockDeduction(db, 'store-1', [
        { productId: product.id, quantity: 1, unitPrice: 10000 },
      ]);

      expect(mockDelivery).toHaveBeenCalled();

      const callArg = JSON.parse(mockDelivery.mock.calls[0][1].body as string);
      expect(callArg.event).toBe('stock.shortage');
    });
  });
});
