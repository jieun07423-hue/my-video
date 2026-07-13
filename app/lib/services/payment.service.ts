import { apiLogger } from '@/lib/logger';
import { emitEvent } from '@/lib/services/webhookDispatcher.service';

export interface PaymentInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  method: string;
}

export interface PaymentResult {
  paymentId: string;
  orderId: string;
  amount: number;
  method: string;
  status: 'completed' | 'failed';
  errorCode?: string;
  errorMessage?: string;
}

/**
 * 결제를 처리하고 웹훅 이벤트를 발행합니다.
 *
 * 실제 PG 연동 대신 이벤트 발행 패턴을 보여주는 스텁 구현.
 * 실제 결제 게이트웨이 연동 시 이 함수 내에서 PG API 호출 후
 * 성공/실패에 따라 적절한 이벤트를 emit 합니다.
 */
export async function processPayment(input: PaymentInput): Promise<PaymentResult> {
  apiLogger.info({ orderId: input.orderId, amount: input.amount }, 'Processing payment');

  // 실제 구현에서는 여기서 PG API 호출
  const paymentId = `pay-${Date.now()}`;
  const isSuccess = true; // 실제 PG 응답에 따라 결정

  if (isSuccess) {
    const result: PaymentResult = {
      paymentId,
      orderId: input.orderId,
      amount: input.amount,
      method: input.method,
      status: 'completed',
    };

    await emitEvent('payment.completed', {
      paymentId: result.paymentId,
      orderId: result.orderId,
      amount: result.amount,
      method: result.method,
    });

    apiLogger.info({ paymentId }, 'Payment completed');
    return result;
  }

  const result: PaymentResult = {
    paymentId,
    orderId: input.orderId,
    amount: input.amount,
    method: input.method,
    status: 'failed',
    errorCode: 'PAYMENT_DECLINED',
    errorMessage: '결제가 거절되었습니다',
  };

  await emitEvent('payment.failed', {
    paymentId: result.paymentId,
    orderId: result.orderId,
    amount: result.amount,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  });

  apiLogger.error({ paymentId, errorCode: result.errorCode }, 'Payment failed');
  return result;
}
