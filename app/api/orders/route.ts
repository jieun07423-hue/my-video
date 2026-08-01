import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse, createBadRequestResponse } from '@/lib/api/handlers';
import { createOrderWithStockDeduction } from '@/lib/services/orderInventorySync.service';
import type { OrderItemInput } from '@/lib/services/orderInventorySync.service';
import { kdsEventEmitter } from '@/lib/events/kds.event';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.order.count({ where }),
    ]);

    apiLogger.info({ page, limit, count: items.length }, 'Orders retrieved');
    return NextResponse.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch orders');
    return createApiErrorResponse(error, '조회 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, items, notes } = body;

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return createBadRequestResponse('storeId와 items(배열)는 필수 항목입니다');
    }

    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        return createBadRequestResponse('각 item은 productId, quantity, unitPrice가 필요합니다');
      }
    }

    const orderItems: OrderItemInput[] = items.map((item: Record<string, unknown>) => ({
      productId: item.productId as string,
      quantity: item.quantity as number,
      unitPrice: item.unitPrice as number,
    }));

    const result = await createOrderWithStockDeduction(db, storeId, orderItems, notes as string | undefined);

    // KDS 실시간 주문 스트림에 브로드캐스트 이벤트 발행
    kdsEventEmitter.emit('new-order', { storeId, order: result.order });

    apiLogger.info(
      { orderId: result.order.id, orderNumber: result.order.orderNumber, itemsCount: items.length },
      'Order created with stock deduction and broadcasted to KDS'
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('재고 검증 실패')) {
      apiLogger.warn({ error: message }, 'Order rejected due to stock validation');
      return NextResponse.json({ error: message }, { status: 409 });
    }
    apiLogger.error({ error: message }, 'Failed to create order');
    return createApiErrorResponse(error, '주문 생성 실패', 500);
  }
}
