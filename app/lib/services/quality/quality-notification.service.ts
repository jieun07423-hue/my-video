import axios from 'axios';
import { dbLogger } from '@/lib/logger';
import { QualityAlert, QualityMetrics } from './data-quality-monitor.service';

export interface NotificationConfig {
  webhookUrl: string;
  channel?: string;
  enabled: boolean;
  minSeverity: 'critical' | 'high' | 'medium' | 'low';
  batchSize: number;
  flushIntervalMs: number;
}

export interface Notification {
  id: string;
  alertId: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  metrics?: QualityMetrics;
  timestamp: Date;
  sent: boolean;
}

const SEVERITY_EMOJI = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

const SEVERITY_COLOR = {
  critical: '#dc3545',
  high: '#fd7e14',
  medium: '#ffc107',
  low: '#28a745',
};

let notificationQueue: Notification[] = [];
let flushTimer: NodeJS.Timeout | null = null;

const defaultConfig: NotificationConfig = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  enabled: true,
  minSeverity: 'medium',
  batchSize: 10,
  flushIntervalMs: 30000,
};

export function configureNotifications(config: Partial<NotificationConfig>): void {
  Object.assign(defaultConfig, config);
}

export function createNotificationFromAlert(alert: QualityAlert): Notification {
  return {
    id: `notif-${Date.now()}-${alert.id}`,
    alertId: alert.id,
    title: `${SEVERITY_EMOJI[alert.severity]} 데이터 품질 알림`,
    message: alert.message,
    severity: alert.severity,
    timestamp: new Date(),
    sent: false,
  };
}

export function createMetricsNotification(
  metrics: QualityMetrics,
  overallHealth: 'healthy' | 'warning' | 'critical'
): Notification {
  const healthEmoji = {
    healthy: '✅',
    warning: '⚠️',
    critical: '🚨',
  }[overallHealth];

  return {
    id: `notif-metrics-${Date.now()}`,
    alertId: 'metrics-summary',
    title: `${healthEmoji} 데이터 품질 요약 리포트`,
    message: formatMetricsSummary(metrics, overallHealth),
    severity: overallHealth === 'critical' ? 'critical' : overallHealth === 'warning' ? 'high' : 'low',
    metrics,
    timestamp: new Date(),
    sent: false,
  };
}

function formatMetricsSummary(metrics: QualityMetrics, overallHealth: string): string {
  const gradeInfo = Object.entries(metrics.gradeDistribution)
    .map(([grade, count]) => `${grade}: ${count}건`)
    .join(', ');

  return [
    `📊 *데이터 품질 요약*`,
    `• 전체 사업체: ${metrics.totalBusinesses}건`,
    `• 평균 완성도: ${metrics.averageCompletenessScore}%`,
    `• 등급 분포: ${gradeInfo || 'N/A'}`,
    `• 중복률: ${metrics.duplicateRate}%`,
    `• 오래된 데이터: ${metrics.staleDataRate}%`,
    `• 심각한 이슈: ${metrics.criticalIssuesCount}건`,
    `• 교차검증 점수: ${metrics.crossValidationScore}%`,
    `• 전체 상태: ${overallHealth}`,
  ].join('\n');
}

export function queueNotification(notification: Notification): void {
  if (!defaultConfig.enabled) return;

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  if (severityOrder[notification.severity] > severityOrder[defaultConfig.minSeverity]) {
    return;
  }

  notificationQueue.push(notification);

  if (notificationQueue.length >= defaultConfig.batchSize) {
    flushNotifications();
  }
}

export async function flushNotifications(): Promise<void> {
  if (notificationQueue.length === 0) return;

  const notificationsToSend = [...notificationQueue];
  notificationQueue = [];

  try {
    await sendSlackNotifications(notificationsToSend);
    notificationsToSend.forEach(n => { n.sent = true; });
    dbLogger.info({ count: notificationsToSend.length }, 'Slack 알림 전송 완료');
  } catch (error) {
    dbLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Slack 알림 전송 실패');
    notificationQueue.unshift(...notificationsToSend);
  }
}

async function sendSlackNotifications(notifications: Notification[]): Promise<void> {
  if (!defaultConfig.webhookUrl) {
    dbLogger.warn('Slack 웹훅 URL이 설정되지 않았습니다');
    return;
  }

  for (const notification of notifications) {
    const payload = {
      channel: defaultConfig.channel,
      username: '데이터 품질 모니터',
      icon_emoji: ':mag:',
      attachments: [
        {
          color: SEVERITY_COLOR[notification.severity],
          title: notification.title,
          text: notification.message,
          fields: [
            {
              title: '심각도',
              value: notification.severity.toUpperCase(),
              short: true,
            },
            {
              title: '시간',
              value: notification.timestamp.toLocaleString('ko-KR'),
              short: true,
            },
          ],
          footer: '데이터 품질 모니터링 시스템',
          ts: Math.floor(notification.timestamp.getTime() / 1000),
        },
      ],
    };

    await axios.post(defaultConfig.webhookUrl, payload, { timeout: 5000 });
  }
}

export function startAutoFlush(): void {
  if (flushTimer) return;

  flushTimer = setInterval(() => {
    flushNotifications();
  }, defaultConfig.flushIntervalMs);
}

export function stopAutoFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export function getNotificationQueue(): Notification[] {
  return [...notificationQueue];
}

export function clearNotificationQueue(): void {
  notificationQueue = [];
}

export function sendAlertNotification(alert: QualityAlert): void {
  const notification = createNotificationFromAlert(alert);
  queueNotification(notification);
}

export function sendMetricsNotification(
  metrics: QualityMetrics,
  overallHealth: 'healthy' | 'warning' | 'critical'
): void {
  const notification = createMetricsNotification(metrics, overallHealth);
  queueNotification(notification);
}

export async function sendImmediateAlert(alert: QualityAlert): Promise<void> {
  const notification = createNotificationFromAlert(alert);
  await sendSlackNotifications([notification]);
  notification.sent = true;
}

export async function sendImmediateMetricsReport(
  metrics: QualityMetrics,
  overallHealth: 'healthy' | 'warning' | 'critical'
): Promise<void> {
  const notification = createMetricsNotification(metrics, overallHealth);
  await sendSlackNotifications([notification]);
  notification.sent = true;
}
