import { NextRequest, NextResponse } from 'next/server';
import { listDeliveryLogs } from '@/lib/services/webhookDispatcher.service';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/webhooks/logs
 * 웹훅 전송 로그를 검색합니다.
 *
 * Query Parameters:
 * - endpointId: 특정 엔드포인트의 로그만 조회
 * - eventType: 특정 이벤트 타입의 로그만 조회
 * - status: pending | success | failed
 * - limit: 페이지당 개수 (기본 50)
 * - offset: 페이지 오프셋 (기본 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const options = {
      endpointId: searchParams.get('endpointId') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      status: (searchParams.get('status') as 'pending' | 'success' | 'failed') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    if (options.limit && (isNaN(options.limit) || options.limit < 1)) {
      return NextResponse.json(
        { success: false, error: 'limit은 1 이상의 정수여야 합니다' },
        { status: 400 },
      );
    }

    if (options.offset && (isNaN(options.offset) || options.offset < 0)) {
      return NextResponse.json(
        { success: false, error: 'offset은 0 이상의 정수여야 합니다' },
        { status: 400 },
      );
    }

    const result = await listDeliveryLogs(options);

    apiLogger.info(
      { total: result.total, returned: result.items.length },
      'Delivery logs retrieved',
    );

    return NextResponse.json({
      success: true,
      data: {
        items: result.items,
        total: result.total,
        limit: options.limit,
        offset: options.offset,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error({ error: errorMessage }, 'Failed to list delivery logs');
    return NextResponse.json(
      { success: false, error: '전송 로그 조회 실패' },
      { status: 500 },
    );
  }
}
