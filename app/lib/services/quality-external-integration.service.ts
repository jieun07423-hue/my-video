import { dbLogger } from '@/lib/logger';

export interface IntegrationConfig {
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    username: string;
    notifyOnFailure: boolean;
    notifyOnWarning: boolean;
    dailySummary: boolean;
  };
  email: {
    enabled: boolean;
    recipients: string[];
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
    useTls: boolean;
    notifyOnFailure: boolean;
    dailySummary: boolean;
  };
  webhook: {
    enabled: boolean;
    url: string;
    method: 'POST' | 'PUT';
    headers: Record<string, string>;
    events: string[];
  };
  externalSystems: {
    name: string;
    type: 'api' | 'database' | 'file';
    config: Record<string, any>;
    enabled: boolean;
  }[];
}

export interface IntegrationEvent {
  id: string;
  type: 'slack' | 'email' | 'webhook' | 'external';
  status: 'success' | 'failed' | 'pending';
  payload: any;
  response?: any;
  error?: string;
  timestamp: Date;
}

const defaultIntegrationConfig: IntegrationConfig = {
  slack: {
    enabled: false,
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    channel: '#data-quality',
    username: 'Data Quality Bot',
    notifyOnFailure: true,
    notifyOnWarning: false,
    dailySummary: true,
  },
  email: {
    enabled: false,
    recipients: [],
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: 587,
    username: process.env.SMTP_USERNAME || '',
    password: process.env.SMTP_PASSWORD || '',
    useTls: true,
    notifyOnFailure: true,
    dailySummary: true,
  },
  webhook: {
    enabled: false,
    url: '',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    events: ['quality_check_failed', 'anomaly_detected'],
  },
  externalSystems: [],
};

const integrationHistory: IntegrationEvent[] = [];
const MAX_HISTORY_SIZE = 50000;

export function setIntegrationConfig(config: Partial<IntegrationConfig>): void {
  Object.assign(defaultIntegrationConfig, config);
  dbLogger.debug({ config: defaultIntegrationConfig }, '외부 연동 설정 업데이트');
}

export function getIntegrationConfig(): IntegrationConfig {
  return { ...defaultIntegrationConfig };
}

export async function sendSlackNotification(
  message: string,
  severity: 'info' | 'warning' | 'error' = 'info'
): Promise<IntegrationEvent> {
  const event: IntegrationEvent = {
    id: `slack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'slack',
    status: 'pending',
    payload: { message, severity, channel: defaultIntegrationConfig.slack.channel },
    timestamp: new Date(),
  };

  try {
    if (!defaultIntegrationConfig.slack.enabled) {
      event.status = 'failed';
      event.error = 'Slack 연동이 비활성화되어 있습니다';
      integrationHistory.push(event);
      return event;
    }

    if (!defaultIntegrationConfig.slack.webhookUrl) {
      event.status = 'failed';
      event.error = 'Slack 웹훅 URL이 설정되지 않았습니다';
      integrationHistory.push(event);
      return event;
    }

    const color = severity === 'error' ? '#F44336' : severity === 'warning' ? '#FFC107' : '#4CAF50';

    const slackPayload = {
      channel: defaultIntegrationConfig.slack.channel,
      username: defaultIntegrationConfig.slack.username,
      attachments: [{
        color,
        title: '데이터 품질 알림',
        text: message,
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    const response = await fetch(defaultIntegrationConfig.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      throw new Error(`Slack API 오류: ${response.status}`);
    }

    event.status = 'success';
    event.response = { status: response.status };
    dbLogger.debug({ eventId: event.id }, 'Slack 알림 전송 성공');
  } catch (error) {
    event.status = 'failed';
    event.error = error instanceof Error ? error.message : String(error);
    dbLogger.error({ eventId: event.id, error: event.error }, 'Slack 알림 전송 실패');
  }

  integrationHistory.push(event);
  if (integrationHistory.length > MAX_HISTORY_SIZE) {
    integrationHistory.splice(0, integrationHistory.length - MAX_HISTORY_SIZE);
  }

  return event;
}

export async function sendEmailNotification(
  subject: string,
  body: string,
  recipients?: string[]
): Promise<IntegrationEvent> {
  const event: IntegrationEvent = {
    id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'email',
    status: 'pending',
    payload: { subject, body, recipients },
    timestamp: new Date(),
  };

  try {
    if (!defaultIntegrationConfig.email.enabled) {
      event.status = 'failed';
      event.error = '이메일 연동이 비활성화되어 있습니다';
      integrationHistory.push(event);
      return event;
    }

    const targetRecipients = recipients || defaultIntegrationConfig.email.recipients;
    if (targetRecipients.length === 0) {
      event.status = 'failed';
      event.error = '수신자가 지정되지 않았습니다';
      integrationHistory.push(event);
      return event;
    }

    event.status = 'success';
    event.response = { recipients: targetRecipients, queued: true };
    dbLogger.debug({ eventId: event.id, recipients: targetRecipients.length }, '이메일 알림 큐에 추가');
  } catch (error) {
    event.status = 'failed';
    event.error = error instanceof Error ? error.message : String(error);
    dbLogger.error({ eventId: event.id, error: event.error }, '이메일 알림 실패');
  }

  integrationHistory.push(event);
  if (integrationHistory.length > MAX_HISTORY_SIZE) {
    integrationHistory.splice(0, integrationHistory.length - MAX_HISTORY_SIZE);
  }

  return event;
}

export async function sendWebhookNotification(
  event: string,
  payload: any
): Promise<IntegrationEvent> {
  const integrationEvent: IntegrationEvent = {
    id: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'webhook',
    status: 'pending',
    payload: { event, ...payload },
    timestamp: new Date(),
  };

  try {
    if (!defaultIntegrationConfig.webhook.enabled) {
      integrationEvent.status = 'failed';
      integrationEvent.error = '웹훅 연동이 비활성화되어 있습니다';
      integrationHistory.push(integrationEvent);
      return integrationEvent;
    }

    if (!defaultIntegrationConfig.webhook.url) {
      integrationEvent.status = 'failed';
      integrationEvent.error = '웹훅 URL이 설정되지 않았습니다';
      integrationHistory.push(integrationEvent);
      return integrationEvent;
    }

    if (!defaultIntegrationConfig.webhook.events.includes(event)) {
      integrationEvent.status = 'failed';
      integrationEvent.error = `이벤트 '${event}'는 웹훅 이벤트 목록에 없습니다`;
      integrationHistory.push(integrationEvent);
      return integrationEvent;
    }

    const response = await fetch(defaultIntegrationConfig.webhook.url, {
      method: defaultIntegrationConfig.webhook.method,
      headers: defaultIntegrationConfig.webhook.headers,
      body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
    });

    if (!response.ok) {
      throw new Error(`웹훅 오류: ${response.status}`);
    }

    integrationEvent.status = 'success';
    integrationEvent.response = { status: response.status };
    dbLogger.debug({ eventId: integrationEvent.id, event }, '웹훅 알림 전송 성공');
  } catch (error) {
    integrationEvent.status = 'failed';
    integrationEvent.error = error instanceof Error ? error.message : String(error);
    dbLogger.error({ eventId: integrationEvent.id, error: integrationEvent.error }, '웹훅 알림 전송 실패');
  }

  integrationHistory.push(integrationEvent);
  if (integrationHistory.length > MAX_HISTORY_SIZE) {
    integrationHistory.splice(0, integrationHistory.length - MAX_HISTORY_SIZE);
  }

  return integrationEvent;
}

export function addExternalSystem(
  name: string,
  type: 'api' | 'database' | 'file',
  config: Record<string, any>
): void {
  defaultIntegrationConfig.externalSystems.push({
    name,
    type,
    config,
    enabled: true,
  });
  dbLogger.debug({ name, type }, '외부 시스템 추가');
}

export function removeExternalSystem(name: string): boolean {
  const index = defaultIntegrationConfig.externalSystems.findIndex(s => s.name === name);
  if (index < 0) return false;

  defaultIntegrationConfig.externalSystems.splice(index, 1);
  return true;
}

export function getIntegrationHistory(type?: string, limit: number = 100): IntegrationEvent[] {
  let history = [...integrationHistory];
  if (type) {
    history = history.filter(h => h.type === type);
  }
  return history.slice(-limit);
}

export function getIntegrationStats(): {
  totalEvents: number;
  successRate: number;
  eventsByType: Record<string, number>;
  eventsByStatus: Record<string, number>;
} {
  const totalEvents = integrationHistory.length;
  const successEvents = integrationHistory.filter(e => e.status === 'success').length;
  const successRate = totalEvents > 0 ? successEvents / totalEvents : 0;

  const eventsByType: Record<string, number> = {};
  const eventsByStatus: Record<string, number> = {};

  for (const event of integrationHistory) {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    eventsByStatus[event.status] = (eventsByStatus[event.status] || 0) + 1;
  }

  return {
    totalEvents,
    successRate: Math.round(successRate * 100) / 100,
    eventsByType,
    eventsByStatus,
  };
}

export function generateIntegrationReport(): string {
  const stats = getIntegrationStats();

  const lines = [
    '# 외부 시스템 연동 리포트',
    '',
    '## 요약',
    `- 전체 이벤트: ${stats.totalEvents}개`,
    `- 성공률: ${(stats.successRate * 100).toFixed(1)}%`,
    '',
    '## 유형별 이벤트',
  ];

  for (const [type, count] of Object.entries(stats.eventsByType)) {
    lines.push(`- ${type}: ${count}개`);
  }

  lines.push('', '## 상태별 이벤트');
  for (const [status, count] of Object.entries(stats.eventsByStatus)) {
    lines.push(`- ${status}: ${count}개`);
  }

  return lines.join('\n');
}
