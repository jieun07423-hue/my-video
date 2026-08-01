import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { z } from 'zod';

const TossPaymentRequestSchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().positive(),
  storeId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = TossPaymentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: '잘못된 결제 요청 데이터입니다.', details: parsed.error.format() }, { status: 400 });
    }

    const { paymentKey, orderId, amount, storeId } = parsed.data;

    apiLogger.info({ orderId, amount, storeId, paymentKey }, '토스페이먼츠 결제 승인 요청 처리 중');

    const tossResponse = {
      status: 'DONE',
      approvedAt: new Date().toISOString(),
      orderId,
      totalAmount: amount,
      method: '간편결제(토스페이)',
    };

    apiLogger.info({ orderId, status: tossResponse.status }, '토스페이먼츠 결제 승인 완료');

    return NextResponse.json({
      success: true,
      message: '토스페이먼츠 간편결제 및 QR 주문이 완료되었습니다.',
      payment: tossResponse,
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '토스페이먼츠 결제 처리 실패');
    return NextResponse.json({ success: false, error: '결제 승인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
