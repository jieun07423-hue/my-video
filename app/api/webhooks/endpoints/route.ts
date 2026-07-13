import { NextRequest, NextResponse } from 'next/server';
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
} from '@/lib/services/webhookDispatcher.service';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/webhooks/endpoints
 * 등록된 웹훅 엔드포인트 목록을 조회합니다.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const endpoints = await listWebhookEndpoints(activeOnly ?? undefined);

    apiLogger.info({ count: endpoints.length }, 'Webhook endpoints listed');

    return NextResponse.json({
      success: true,
      data: endpoints,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error({ error: errorMessage }, 'Failed to list webhook endpoints');
    return NextResponse.json(
      { success: false, error: '웹훅 엔드포인트 조회 실패' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/webhooks/endpoints
 * 새로운 웹훅 엔드포인트를 등록합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 필수 필드 검증
    if (!body.name || !body.url || !body.events) {
      return NextResponse.json(
        {
          success: false,
          error: '필수 필드 누락: name, url, events',
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'events는 최소 하나 이상의 이벤트를 포함하는 배열이어야 합니다',
        },
        { status: 400 },
      );
    }

    // URL 형식 검증
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { success: false, error: '올바른 URL 형식이 아닙니다' },
        { status: 400 },
      );
    }

    const endpoint = await createWebhookEndpoint({
      name: body.name,
      url: body.url,
      secret: body.secret,
      events: body.events,
      maxRetries: body.maxRetries,
      timeoutMs: body.timeoutMs,
    });

    apiLogger.info({ endpointId: endpoint.id, eventCount: endpoint.events.length }, 'Webhook endpoint created');

    return NextResponse.json(
      { success: true, data: endpoint },
      { status: 201 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error({ error: errorMessage }, 'Failed to create webhook endpoint');

    if (errorMessage.includes('지원하지 않는 이벤트')) {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: '웹훅 엔드포인트 생성 실패' },
      { status: 500 },
    );
  }
}
