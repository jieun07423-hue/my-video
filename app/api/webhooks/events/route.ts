import { NextResponse } from 'next/server';
import { getEventCatalog } from '@/lib/services/webhookDispatcher.service';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/webhooks/events
 * 지원하는 웹훅 이벤트 카탈로그를 반환합니다.
 */
export async function GET() {
  try {
    const catalog = getEventCatalog();

    apiLogger.info({ eventCount: catalog.length }, 'Event catalog retrieved');

    return NextResponse.json({
      success: true,
      data: {
        totalEvents: catalog.length,
        categories: groupByCategory(catalog),
        events: catalog,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error({ error: errorMessage }, 'Failed to retrieve event catalog');
    return NextResponse.json(
      { success: false, error: '이벤트 카탈로그 조회 실패' },
      { status: 500 },
    );
  }
}

function groupByCategory(
  catalog: Array<{ event: string; category: string; description: string; payloadFields: Array<{ name: string; type: string; description: string }> }>,
): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const entry of catalog) {
    groups[entry.category] = (groups[entry.category] || 0) + 1;
  }
  return groups;
}
