import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface NotificationEvent {
  type: 'sync_update' | 'new_businesses' | 'ad_completed' | 'system';
  title: string;
  message: string;
  timestamp: string;
  link?: string;
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let lastSyncCheck: string | null = null;
  let lastBusinessCount = 0;
  let lastAdCheck: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: NotificationEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const poll = async () => {
        try {
          const syncState = await db.syncState.findFirst({ orderBy: { updatedAt: 'desc' } });
          if (syncState) {
            const syncStr = `${syncState.syncStatus}|${syncState.updatedAt.toISOString()}`;
            if (syncStr !== lastSyncCheck) {
              lastSyncCheck = syncStr;
              if (syncState.syncStatus === 'success') {
                sendEvent({
                  type: 'sync_update',
                  title: '동기화 완료',
                  message: `데이터 동기화가 완료되었습니다. (${syncState.syncCount}건)`,
                  timestamp: syncState.updatedAt.toISOString(),
                  link: '/dashboard',
                });
              } else if (syncState.syncStatus === 'failed' && syncState.errorMessage) {
                sendEvent({
                  type: 'sync_update',
                  title: '동기화 실패',
                  message: syncState.errorMessage,
                  timestamp: syncState.updatedAt.toISOString(),
                  link: '/admin',
                });
              }
            }
          }

          const businessCount = await db.business.count();
          if (lastBusinessCount > 0 && businessCount > lastBusinessCount) {
            sendEvent({
              type: 'new_businesses',
              title: '신규 업소 발견',
              message: `${businessCount - lastBusinessCount}개의 새로운 업소가 추가되었습니다.`,
              timestamp: new Date().toISOString(),
              link: '/new',
            });
          }
          lastBusinessCount = businessCount;

          const lastCampaign = await db.adCampaign.findFirst({
            where: { status: 'completed' },
            orderBy: { updatedAt: 'desc' },
          });
          if (lastCampaign) {
            const adStr = `${lastCampaign.id}|${lastCampaign.updatedAt.toISOString()}`;
            if (adStr !== lastAdCheck) {
              lastAdCheck = adStr;
              sendEvent({
                type: 'ad_completed',
                title: '광고 생성 완료',
                message: `"${lastCampaign.industry}" 광고 캠페인이 완료되었습니다.`,
                timestamp: lastCampaign.updatedAt.toISOString(),
                link: '/ad',
              });
            }
          }

          sendEvent({ type: 'system', title: '연결 유지', message: '', timestamp: new Date().toISOString() });
        } catch (err) {
          apiLogger.error({ error: err instanceof Error ? err.message : String(err) }, 'SSE poll error');
        }
      };

      await poll();

      const interval = setInterval(poll, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}