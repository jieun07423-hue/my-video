import { syncLogger } from '@/lib/logger';
import type { DbClient } from '@/lib/db/types';
import { emitEvent } from '@/lib/services/webhookDispatcher.service';

export interface OrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface DeductionResult {
  productId: string;
  sku: string;
  previousQuantity: number | null;
  newQuantity: number | null;
  isShortage: boolean;
}

export interface ValidationError {
  productId: string;
  sku: string;
  reason: 'not_found' | 'inactive' | 'sold_out' | 'insufficient_stock';
  available: number;
  requested: number;
}

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

function calculateIsSoldOut(stockQuantity: number | null, lowStockThreshold: number): boolean {
  if (stockQuantity === null) return false;
  return stockQuantity <= lowStockThreshold;
}

export async function validateStock(
  tx: Omit<DbClient, '$connect' | '$disconnect' | '$transaction'>,
  items: OrderItemInput[]
): Promise<{ valid: boolean; errors: ValidationError[]; products: Array<{ product: Record<string, unknown>; requestedQty: number }> }> {
  const errors: ValidationError[] = [];
  const products: Array<{ product: Record<string, unknown>; requestedQty: number }> = [];

  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } }) as Record<string, unknown> | null;

    if (!product) {
      errors.push({
        productId: item.productId,
        sku: 'unknown',
        reason: 'not_found',
        available: 0,
        requested: item.quantity,
      });
      continue;
    }

    const sku = product.sku as string;
    const stockQty = product.stockQuantity as number | null;

    if (!(product.isActive as boolean)) {
      errors.push({
        productId: item.productId,
        sku,
        reason: 'inactive',
        available: stockQty ?? Infinity,
        requested: item.quantity,
      });
      continue;
    }

    if (product.isSoldOut as boolean) {
      errors.push({
        productId: item.productId,
        sku,
        reason: 'sold_out',
        available: stockQty ?? 0,
        requested: item.quantity,
      });
      continue;
    }

    if (stockQty !== null && stockQty < item.quantity) {
      errors.push({
        productId: item.productId,
        sku,
        reason: 'insufficient_stock',
        available: stockQty,
        requested: item.quantity,
      });
      continue;
    }

    products.push({ product, requestedQty: item.quantity });
  }

  return { valid: errors.length === 0, errors, products };
}

export async function deductStock(
  tx: Omit<DbClient, '$connect' | '$disconnect' | '$transaction'>,
  items: OrderItemInput[],
  orderId: string
): Promise<{ deductions: DeductionResult[]; shortages: DeductionResult[] }> {
  const deductions: DeductionResult[] = [];
  const shortages: DeductionResult[] = [];

  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } }) as Record<string, unknown> | null;
    if (!product) {
      syncLogger.warn({ productId: item.productId }, 'Product not found during stock deduction');
      continue;
    }

    const currentStock = product.stockQuantity as number | null;
    const threshold = (product.lowStockThreshold as number) ?? 5;

    if (currentStock === null) {
      deductions.push({
        productId: item.productId,
        sku: product.sku as string,
        previousQuantity: null,
        newQuantity: null,
        isShortage: false,
      });
      continue;
    }

    const newQuantity = currentStock - item.quantity;
    const isShortage = newQuantity < 0;

    const safeNewQty = Math.max(0, newQuantity);

    await tx.product.update({
      where: { id: item.productId },
      data: {
        stockQuantity: safeNewQty,
        isSoldOut: calculateIsSoldOut(safeNewQty, threshold),
      },
    });

    await tx.stockHistory.create({
      data: {
        productId: item.productId,
        orderId,
        changeType: 'order',
        quantityChange: -item.quantity,
        quantityAfter: safeNewQty,
        reason: isShortage ? `주문 처리 중 재고 부족 (요청: ${item.quantity}, 가용: ${currentStock})` : null,
      },
    });

    const isNowSoldOut = calculateIsSoldOut(safeNewQty, threshold);
    if (isNowSoldOut) {
      await emitEvent('stock.shortage', {
        productId: item.productId,
        sku: product.sku,
        productName: product.name,
        currentStock: safeNewQty,
        threshold,
        orderId,
      });
    }

    if (safeNewQty === 0) {
      await emitEvent('product.sold_out', {
        productId: item.productId,
        sku: product.sku,
        productName: product.name,
        orderId,
      });
    }

    deductions.push({
      productId: item.productId,
      sku: product.sku as string,
      previousQuantity: currentStock,
      newQuantity: safeNewQty,
      isShortage,
    });

    if (isShortage) {
      shortages.push({
        productId: item.productId,
        sku: product.sku as string,
        previousQuantity: currentStock,
        newQuantity: safeNewQty,
        isShortage: true,
      });
    }
  }

  return { deductions, shortages };
}

export async function restoreStock(
  tx: Omit<DbClient, '$connect' | '$disconnect' | '$transaction'>,
  orderId: string
): Promise<DeductionResult[]> {
  const orderItems = await tx.orderItem.findMany({ where: { orderId } }) as Array<Record<string, unknown>>;
  const results: DeductionResult[] = [];

  for (const orderItem of orderItems) {
    const productId = orderItem.productId as string;
    const quantity = orderItem.quantity as number;

    const product = await tx.product.findUnique({ where: { id: productId } }) as Record<string, unknown> | null;
    if (!product) {
      syncLogger.warn({ productId }, 'Product not found during stock restoration');
      continue;
    }

    const currentStock = product.stockQuantity as number | null;
    const threshold = (product.lowStockThreshold as number) ?? 5;

    if (currentStock === null) {
      results.push({
        productId,
        sku: product.sku as string,
        previousQuantity: null,
        newQuantity: null,
        isShortage: false,
      });
      continue;
    }

    const newQuantity = currentStock + quantity;

    await tx.product.update({
      where: { id: productId },
      data: {
        stockQuantity: newQuantity,
        isSoldOut: calculateIsSoldOut(newQuantity, threshold),
      },
    });

    await tx.stockHistory.create({
      data: {
        productId,
        orderId,
        changeType: 'cancel',
        quantityChange: quantity,
        quantityAfter: newQuantity,
      },
    });

    await emitEvent('stock.restored', {
      productId,
      sku: product.sku,
      productName: product.name,
      restoredQuantity: quantity,
      currentStock: newQuantity,
      orderId,
    });

    results.push({
      productId,
      sku: product.sku as string,
      previousQuantity: currentStock,
      newQuantity,
      isShortage: false,
    });
  }

  return results;
}

export async function createOrderWithStockDeduction(
  db: DbClient,
  storeId: string,
  items: OrderItemInput[],
  notes?: string
): Promise<{ order: Record<string, unknown>; items: Array<Record<string, unknown>>; deductions: DeductionResult[] }> {
  const validation = await validateStock(db, items);
  if (!validation.valid) {
    const errorMessages = validation.errors
      .map((e) => `${e.sku}: ${e.reason} (요청: ${e.requested}, 가용: ${e.available})`)
      .join(', ');
    throw new Error(`재고 검증 실패: ${errorMessages}`);
  }

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const orderNumber = generateOrderNumber();

  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        storeId,
        totalAmount,
        notes: notes || null,
        status: 'confirmed',
      },
    }) as Record<string, unknown>;

    const orderId = order.id as string;

    for (const item of items) {
      await tx.orderItem.create({
        data: {
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        },
      });
    }

    const { deductions } = await deductStock(tx, items, orderId);

    const createdItems = await tx.orderItem.findMany({ where: { orderId } }) as Array<Record<string, unknown>>;

    await emitEvent('order.created', {
      orderId,
      orderNumber,
      storeId,
      totalAmount,
      itemCount: items.length,
    });

    return { order, items: createdItems, deductions };
  });

  return result;
}

export async function cancelOrder(
  db: DbClient,
  orderId: string
): Promise<{ order: Record<string, unknown>; restoredItems: DeductionResult[] }> {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } }) as Record<string, unknown> | null;
    if (!order) throw new Error('주문을 찾을 수 없습니다');
    if (order.status === 'cancelled') throw new Error('이미 취소된 주문입니다');

    const restoredItems = await restoreStock(tx, orderId);

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    }) as Record<string, unknown>;

    await emitEvent('order.cancelled', {
      orderId,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
    });

    return { order: updatedOrder, restoredItems };
  });

  return result;
}

export { generateOrderNumber, calculateIsSoldOut };
