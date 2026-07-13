import { NextRequest, NextResponse } from 'next/server';
import { retryFailedDelivery } from '@/lib/services/webhookDispatcher.service';
import { apiLogger } from '@/lib/logger';

/**
 * POST /api/webhooks/logs/:id/retry
 * 실패한 웹훅 전송을 재시도합니다.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const result = await retryFailedDelivery(params.id);

    if (!result.success && result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error.includes('찾을 수 없습니다') ? 404 : 400 },
      );
    }

    apiLogger.info({ logId: params.id, success: result.success }, 'Webhook delivery retried');

    return NextResponse.json({
      success: true,
      data: {
        logId: params.id,
        delivered: result.success,
        ...(result.deliveryLog ? { deliveryLog: result.deliveryLog } : {}),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error({ error: errorMessage, logId: params.id }, 'Failed to retry webhook delivery');
    return NextResponse.json(
      { success: false, error: '웹훅 재시도 실패' },
      { status: 500 },
    );
  }
}
