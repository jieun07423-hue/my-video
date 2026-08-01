import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { z } from 'zod';

const UpdateStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'COOKING', 'READY', 'COMPLETED', 'CANCELLED']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const parsed = UpdateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: '유효하지 않은 주문 상태입니다.' }, { status: 400 });
    }

    const { status } = parsed.data;

    apiLogger.info({ orderId, status }, '모바일 KDS에서 주문 상태 변경');

    return NextResponse.json({
      success: true,
      orderId,
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '모바일 주문 상태 변경 실패');
    return NextResponse.json({ success: false, error: '주문 상태 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
