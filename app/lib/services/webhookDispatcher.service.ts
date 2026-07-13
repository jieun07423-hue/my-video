import { syncLogger } from '@/lib/logger';
import db from '@/lib/db';

// ---------------------------------------------------------------------------
// 이벤트 카탈로그 — 지원하는 모든 웹훅 이벤트 정의
// ---------------------------------------------------------------------------
export interface EventCatalogEntry {
  event: string;
  category: 'order' | 'stock' | 'payment' | 'settlement';
  description: string;
  payloadFields: Array<{ name: string; type: string; description: string }>;
}

const EVENT_CATALOG: EventCatalogEntry[] = [
  {
    event: 'order.created',
    category: 'order',
    description: '주문이 생성되고 재고가 차감되었습니다',
    payloadFields: [
      { name: 'orderId', type: 'string', description: '주문 ID' },
      { name: 'orderNumber', type: 'string', description: '주문 번호 (ORD-YYYYMMDD-XXXXXX)' },
      { name: 'storeId', type: 'string', description: '매장 ID' },
      { name: 'totalAmount', type: 'number', description: '총 금액' },
      { name: 'itemCount', type: 'number', description: '주문 아이템 수' },
    ],
  },
  {
    event: 'order.cancelled',
    category: 'order',
    description: '주문이 취소되고 재고가 복구되었습니다',
    payloadFields: [
      { name: 'orderId', type: 'string', description: '주문 ID' },
      { name: 'orderNumber', type: 'string', description: '주문 번호' },
      { name: 'storeId', type: 'string', description: '매장 ID' },
    ],
  },
  {
    event: 'order.status_changed',
    category: 'order',
    description: '주문 상태가 변경되었습니다 (pending→confirmed→processing→completed)',
    payloadFields: [
      { name: 'orderId', type: 'string', description: '주문 ID' },
      { name: 'orderNumber', type: 'string', description: '주문 번호' },
      { name: 'previousStatus', type: 'string', description: '이전 상태' },
      { name: 'newStatus', type: 'string', description: '변경된 상태' },
    ],
  },
  {
    event: 'stock.shortage',
    category: 'stock',
    description: '재고가 임계치 이하로 떨어졌습니다',
    payloadFields: [
      { name: 'productId', type: 'string', description: '제품 ID' },
      { name: 'sku', type: 'string', description: 'SKU' },
      { name: 'productName', type: 'string', description: '제품명' },
      { name: 'currentStock', type: 'number', description: '현재 재고량' },
      { name: 'threshold', type: 'number', description: '임계치 (lowStockThreshold)' },
      { name: 'orderId', type: 'string', description: '관련 주문 ID' },
    ],
  },
  {
    event: 'stock.restored',
    category: 'stock',
    description: '주문 취소 등으로 재고가 복구되었습니다',
    payloadFields: [
      { name: 'productId', type: 'string', description: '제품 ID' },
      { name: 'sku', type: 'string', description: 'SKU' },
      { name: 'productName', type: 'string', description: '제품명' },
      { name: 'restoredQuantity', type: 'number', description: '복구된 수량' },
      { name: 'currentStock', type: 'number', description: '복구 후 재고량' },
      { name: 'orderId', type: 'string', description: '관련 주문 ID' },
    ],
  },
  {
    event: 'stock.adjusted',
    category: 'stock',
    description: '재고가 수동으로 조정되었습니다',
    payloadFields: [
      { name: 'productId', type: 'string', description: '제품 ID' },
      { name: 'sku', type: 'string', description: 'SKU' },
      { name: 'previousQuantity', type: 'number', description: '조정 전 수량' },
      { name: 'newQuantity', type: 'number', description: '조정 후 수량' },
      { name: 'reason', type: 'string', description: '조정 사유' },
    ],
  },
  {
    event: 'product.sold_out',
    category: 'stock',
    description: '제품이 품절 상태가 되었습니다 (재고 0)',
    payloadFields: [
      { name: 'productId', type: 'string', description: '제품 ID' },
      { name: 'sku', type: 'string', description: 'SKU' },
      { name: 'productName', type: 'string', description: '제품명' },
      { name: 'orderId', type: 'string', description: '관련 주문 ID' },
    ],
  },
  {
    event: 'payment.completed',
    category: 'payment',
    description: '결제가 완료되었습니다',
    payloadFields: [
      { name: 'paymentId', type: 'string', description: '결제 ID' },
      { name: 'orderId', type: 'string', description: '주문 ID' },
      { name: 'amount', type: 'number', description: '결제 금액' },
      { name: 'method', type: 'string', description: '결제 수단' },
    ],
  },
  {
    event: 'payment.failed',
    category: 'payment',
    description: '결제에 실패했습니다',
    payloadFields: [
      { name: 'paymentId', type: 'string', description: '결제 ID' },
      { name: 'orderId', type: 'string', description: '주문 ID' },
      { name: 'amount', type: 'number', description: '결제 금액' },
      { name: 'errorCode', type: 'string', description: '실패 코드' },
      { name: 'errorMessage', type: 'string', description: '실패 메시지' },
    ],
  },
  {
    event: 'settlement.completed',
    category: 'settlement',
    description: '정산이 완료되었습니다',
    payloadFields: [
      { name: 'settlementId', type: 'string', description: '정산 ID' },
      { name: 'periodStart', type: 'string', description: '정산 시작일' },
      { name: 'periodEnd', type: 'string', description: '정산 종료일' },
      { name: 'totalAmount', type: 'number', description: '정산 총액' },
      { name: 'transactionCount', type: 'number', description: '정산 대상 건수' },
    ],
  },
];

export function getEventCatalog(): EventCatalogEntry[] {
  return EVENT_CATALOG;
}

// ---------------------------------------------------------------------------
// 웹훅 이벤트 타입 (문자열 리터럴 유니언)
// ---------------------------------------------------------------------------
export type WebhookEventType = (typeof EVENT_CATALOG)[number]['event'];

// ---------------------------------------------------------------------------
// API 응답용 웹훅 엔드포인트 타입
// ---------------------------------------------------------------------------
export interface WebhookEndpointResponse {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  maxRetries: number;
  timeoutMs: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// 전송 로그 응답 타입
// ---------------------------------------------------------------------------
export interface DeliveryLogResponse {
  id: string;
  endpointId: string;
  eventType: string;
  status: 'pending' | 'success' | 'failed';
  responseCode?: number;
  errorMessage?: string;
  attempt: number;
  maxRetries: number;
  nextRetryAt?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// emitEvent — 이벤트 발행
// ---------------------------------------------------------------------------
export async function emitEvent(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  syncLogger.info({ eventType: type }, 'Emitting webhook event');

  try {
    // DB에서 활성 웹훅 엔드포인트 조회
    const dbEndpoints = await db.webhookEndpoint.findMany({
      where: { isActive: true },
    });

    const endpoints = [
      ...dbEndpoints,
      ..._testEndpoints.map((ep, i) => ({
        id: `test-ep-${i}`,
        name: `Test Ep ${i}`,
        url: ep.url,
        events: ep.events,
        isActive: true,
        secret: 'test-secret',
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    ];

    const targets = endpoints.filter((ep) => {
      const events = ep.events as string[];
      return events.includes(type);
    });

    if (targets.length === 0) {
      syncLogger.debug({ eventType: type }, 'No webhook targets registered for event');
      return;
    }

    const results = await Promise.allSettled(
      targets.map((config) =>
        attemptDeliveryWithLogging(config.id as string, type, payload, config),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      syncLogger.warn({ eventType: type, failedCount: failed }, 'Some webhook deliveries failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    syncLogger.error({ eventType: type, error: errorMessage }, 'Failed to load webhook endpoints');
  }
}

// ---------------------------------------------------------------------------
// attemptDeliveryWithLogging — 단건 전송 + 로그 기록
// ---------------------------------------------------------------------------
async function attemptDeliveryWithLogging(
  endpointId: string,
  eventType: string,
  payload: Record<string, unknown>,
  config: Record<string, unknown>,
): Promise<boolean> {
  const url = config.url as string;
  const secret = config.secret as string | undefined;
  const maxRetries = (config.maxRetries as number) || 3;
  const timeoutMs = (config.timeoutMs as number) || 5000;

  const eventPayload = {
    event: eventType,
    payload,
    timestamp: new Date().toISOString(),
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let status: 'success' | 'failed' = 'failed';
    let responseCode: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let nextRetryAt: Date | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(secret ? { 'X-Webhook-Secret': secret } : {}),
          },
          body: JSON.stringify(eventPayload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      responseCode = response.status;
      responseBody = await response.text().catch(() => null);

      if (response.ok) {
        status = 'success';
      } else {
        errorMessage = `HTTP ${response.status} ${response.statusText}`;
        if (attempt < maxRetries) {
          nextRetryAt = new Date(Date.now() + Math.pow(2, attempt) * 1000);
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      if (attempt < maxRetries) {
        nextRetryAt = new Date(Date.now() + Math.pow(2, attempt) * 1000);
      }
    }

    // 전송 로그 기록
    try {
      await db.webhookDeliveryLog.create({
        data: {
          endpointId,
          eventType,
          payload,
          status,
          responseCode,
          responseBody,
          errorMessage,
          attempt,
          maxRetries,
          ...(nextRetryAt ? { nextRetryAt } : {}),
        },
      });
    } catch (logError) {
      const logMsg = logError instanceof Error ? logError.message : String(logError);
      syncLogger.error({ eventType, error: logMsg }, 'Failed to record webhook delivery log');
    }

    if (status === 'success') {
      syncLogger.info({ eventType, url, attempt }, 'Webhook delivered successfully');
      return true;
    }

    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  syncLogger.error(
    { eventType, url, maxRetries },
    'Webhook delivery failed after all retries',
  );
  return false;
}

// ---------------------------------------------------------------------------
// retryFailedDelivery — 특정 실패 로그 재시도
// ---------------------------------------------------------------------------
export async function retryFailedDelivery(
  logId: string,
): Promise<{ success: boolean; deliveryLog?: DeliveryLogResponse; error?: string }> {
  try {
    const log = await db.webhookDeliveryLog.findUnique({ where: { id: logId } });
    if (!log) return { success: false, error: '전송 로그를 찾을 수 없습니다' };

    if (log.status === 'success') {
      return { success: false, error: '이미 성공한 전송입니다' };
    }

    const endpoint = await db.webhookEndpoint.findUnique({
      where: { id: log.endpointId },
    });
    if (!endpoint) return { success: false, error: '웹훅 엔드포인트를 찾을 수 없습니다' };

    if (!endpoint.isActive) {
      return { success: false, error: '웹훅 엔드포인트가 비활성화되었습니다' };
    }

    const payload = log.payload as Record<string, unknown>;

    const success = await attemptDeliveryWithLogging(
      log.endpointId,
      log.eventType,
      payload,
      {
        url: endpoint.url,
        secret: endpoint.secret,
        maxRetries: endpoint.maxRetries,
        timeoutMs: endpoint.timeoutMs,
      },
    );

    return { success };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 웹훅 엔드포인트 CRUD 헬퍼 (Repository Pattern)
// ---------------------------------------------------------------------------
export async function listWebhookEndpoints(
  activeOnly?: boolean,
): Promise<WebhookEndpointResponse[]> {
  const where = activeOnly ? { isActive: true } : {};
  const endpoints = await db.webhookEndpoint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return endpoints.map(mapEndpoint);
}

export async function getWebhookEndpoint(
  id: string,
): Promise<WebhookEndpointResponse | null> {
  const endpoint = await db.webhookEndpoint.findUnique({ where: { id } });
  return endpoint ? mapEndpoint(endpoint) : null;
}

export async function createWebhookEndpoint(data: {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  maxRetries?: number;
  timeoutMs?: number;
}): Promise<WebhookEndpointResponse> {
  // 이벤트 유효성 검증
  const validEvents = EVENT_CATALOG.map((e) => e.event);
  const invalidEvents = data.events.filter((e) => !validEvents.includes(e));
  if (invalidEvents.length > 0) {
    throw new Error(
      `지원하지 않는 이벤트: ${invalidEvents.join(', ')}. 지원 목록: GET /api/webhooks/events`,
    );
  }

  const endpoint = await db.webhookEndpoint.create({
    data: {
      name: data.name,
      url: data.url,
      secret: data.secret || null,
      events: data.events,
      maxRetries: data.maxRetries ?? 3,
      timeoutMs: data.timeoutMs ?? 5000,
    },
  });
  return mapEndpoint(endpoint);
}

export async function updateWebhookEndpoint(
  id: string,
  data: Partial<{
    name: string;
    url: string;
    secret: string;
    events: string[];
    isActive: boolean;
    maxRetries: number;
    timeoutMs: number;
  }>,
): Promise<WebhookEndpointResponse | null> {
  if (data.events) {
    const validEvents = EVENT_CATALOG.map((e) => e.event);
    const invalidEvents = data.events.filter((e) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      throw new Error(
        `지원하지 않는 이벤트: ${invalidEvents.join(', ')}. 지원 목록: GET /api/webhooks/events`,
      );
    }
  }

  const endpoint = await db.webhookEndpoint.update({
    where: { id },
    data,
  });
  return endpoint ? mapEndpoint(endpoint) : null;
}

export async function deleteWebhookEndpoint(
  id: string,
): Promise<{ success: boolean }> {
  await db.webhookEndpoint.delete({ where: { id } });
  return { success: true };
}

// ---------------------------------------------------------------------------
// 전송 로그 조회
// ---------------------------------------------------------------------------
export async function listDeliveryLogs(options: {
  endpointId?: string;
  eventType?: string;
  status?: 'pending' | 'success' | 'failed';
  limit?: number;
  offset?: number;
}): Promise<{ items: DeliveryLogResponse[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (options.endpointId) where.endpointId = options.endpointId;
  if (options.eventType) where.eventType = options.eventType;
  if (options.status) where.status = options.status;

  const [items, total] = await Promise.all([
    db.webhookDeliveryLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    }),
    db.webhookDeliveryLog.count({ where }),
  ]);

  return {
    items: items.map((log) => ({
      id: log.id,
      endpointId: log.endpointId,
      eventType: log.eventType,
      status: log.status as 'pending' | 'success' | 'failed',
      responseCode: log.responseCode ?? undefined,
      errorMessage: log.errorMessage ?? undefined,
      attempt: log.attempt,
      maxRetries: log.maxRetries,
      nextRetryAt: log.nextRetryAt?.toISOString(),
      createdAt: log.createdAt.toISOString(),
    })),
    total,
  };
}

// ---------------------------------------------------------------------------
// 이전 in-memory API — 하위 호환성 유지 (테스트 및 기존 호출자 대응)
// ---------------------------------------------------------------------------
const _testEndpoints: Array<{ url: string; events: string[]; maxRetries: number }> = [];

/**
 * @deprecated 새 코드에서는 DB 기반 createWebhookEndpoint()를 사용하세요.
 * 테스트 및 기존 호출자: 엔드포인트를 in-memory 배열에 등록합니다.
 */
export function registerWebhook(config: { url: string; events: string[]; maxRetries?: number }): void {
  _testEndpoints.push({
    url: config.url,
    events: config.events,
    maxRetries: config.maxRetries ?? 3,
  });
}

/**
 * @deprecated 테스트용으로 in-memory 웹훅 엔드포인트를 모두 초기화합니다.
 */
export function clearWebhookConfigs(): void {
  _testEndpoints.length = 0;
}

/**
 * @deprecated in-memory 웹훅 엔드포인트 목록을 반환합니다.
 */
export function getWebhookConfigs(): Array<{ url: string; events: string[]; maxRetries: number }> {
  return [..._testEndpoints];
}

// ---------------------------------------------------------------------------
// 내부 헬퍼
// ---------------------------------------------------------------------------
function mapEndpoint(ep: Record<string, unknown>): WebhookEndpointResponse {
  return {
    id: ep.id as string,
    name: ep.name as string,
    url: ep.url as string,
    secret: ep.secret as string | undefined,
    events: ep.events as string[],
    isActive: ep.isActive as boolean,
    maxRetries: ep.maxRetries as number,
    timeoutMs: ep.timeoutMs as number,
    createdAt: ep.createdAt as Date,
    updatedAt: ep.updatedAt as Date,
  };
}
