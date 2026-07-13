import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';
import { cancelOrder } from '@/lib/services/orderInventorySync.service';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const result = await cancelOrder(db, orderId);

    apiLogger.info({ orderId }, 'Order cancelled with stock restoration');
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('을 찾을 수 없습니다')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes('이미 취소된')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    apiLogger.error({ error: message }, 'Failed to cancel order');
    return createApiErrorResponse(error, '주문 취소 실패', 500);
  }
}
