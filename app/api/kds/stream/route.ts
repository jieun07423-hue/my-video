import { NextRequest } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { kdsEventEmitter } from '@/lib/events/kds.event';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId') || 'default-store';

  apiLogger.info({ storeId }, 'KDS 실시간 주문 스트림 연결 시작');

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', storeId, timestamp: new Date().toISOString() })}\n\n`));

      const handleNewOrder = (orderData: { storeId: string; order: unknown }) => {
        if (orderData.storeId === storeId || storeId === 'all') {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'NEW_ORDER', order: orderData.order, timestamp: new Date().toISOString() })}\n\n`));
          } catch (err) {
            apiLogger.error({ error: err instanceof Error ? err.message : String(err) }, 'KDS SSE 스트림 전송 실패');
          }
        }
      };

      kdsEventEmitter.on('new-order', handleNewOrder);

      const intervalId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })}\n\n`));
        } catch {
          clearInterval(intervalId);
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        kdsEventEmitter.off('new-order', handleNewOrder);
        apiLogger.info({ storeId }, 'KDS 실시간 주문 스트림 연결 종료');
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
