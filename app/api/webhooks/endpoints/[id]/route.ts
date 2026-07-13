import { NextRequest, NextResponse } from 'next/server';
import {
  getWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
} from '@/lib/services/webhookDispatcher.service';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/webhooks/endpoints/:id
 * 특정 웹훅 엔드포인트 상세 정보를 조회합니다.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const endpoint = await getWebhookEndpoint(params.id);

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: '웹훅 엔드포인트를 찾을 수 없습니다' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: endpoint });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error({ error: errorMessage, endpointId: params.id }, 'Failed to get webhook endpoint');
    return NextResponse.json(
      { success: false, error: '웹훅 엔드포인트 조회 실패' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/webhooks/endpoints/:id
 * 웹훅 엔드포인트를 수정합니다.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.url !== undefined) {
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json(
          { success: false, error: '올바른 URL 형식이 아닙니다' },
          { status: 400 },
        );
      }
      updateData.url = body.url;
    }
    if (body.secret !== undefined) updateData.secret = body.secret;
    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || body.events.length === 0) {
        return NextResponse.json(
          { success: false, error: 'events는 최소 하나 이상의 이벤트를 포함하는 배열이어야 합니다' },
          { status: 400 },
        );
      }
      updateData.events = body.events;
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.maxRetries !== undefined) updateData.maxRetries = body.maxRetries;
    if (body.timeoutMs !== undefined) updateData.timeoutMs = body.timeoutMs;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '수정할 필드가 없습니다' },
        { status: 400 },
      );
    }

    const endpoint = await updateWebhookEndpoint(
      params.id,
      updateData as Parameters<typeof updateWebhookEndpoint>[1],
    );

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: '웹훅 엔드포인트를 찾을 수 없습니다' },
        { status: 404 },
      );
    }

    apiLogger.info({ endpointId: params.id }, 'Webhook endpoint updated');

    return NextResponse.json({ success: true, data: endpoint });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error({ error: errorMessage, endpointId: params.id }, 'Failed to update webhook endpoint');

    if (errorMessage.includes('지원하지 않는 이벤트')) {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: '웹훅 엔드포인트 수정 실패' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/webhooks/endpoints/:id
 * 웹훅 엔드포인트를 삭제합니다.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const result = await deleteWebhookEndpoint(params.id);

    apiLogger.info({ endpointId: params.id }, 'Webhook endpoint deleted');

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error({ error: errorMessage, endpointId: params.id }, 'Failed to delete webhook endpoint');
    return NextResponse.json(
      { success: false, error: '웹훅 엔드포인트 삭제 실패' },
      { status: 500 },
    );
  }
}
