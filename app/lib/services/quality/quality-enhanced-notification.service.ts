import { dbLogger } from '@/lib/logger';
import { sendSlackNotification, sendEmailNotification, sendWebhookNotification } from './quality-external-integration.service';

export interface NotificationConfig {
  enabled: boolean;
  channels: ('slack' | 'email' | 'webhook')[];
  thresholds: {
    criticalScore: number;
    warningScore: number;
    anomalyCount: number;
    failureCount: number;
  };
  quietHours: {
    enabled: boolean;
    start: number;
    end: number;
  };
  rateLimit: {
    maxPerHour: number;
    maxPerDay: number;
  };
}

export interface Notification {
  id: string;
  type: 'quality_check' | 'anomaly' | 'threshold' | 'daily_summary' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: any;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'suppressed';
  channels: string[];
}

const defaultNotificationConfig: NotificationConfig = {
  enabled: true,
  channels: ['slack'],
  thresholds: {
    criticalScore: 40,
    warningScore: 60,
    anomalyCount: 10,
    failureCount: 5,
  },
  quietHours: {
    enabled: false,
    start: 22,
    end: 8,
  },
  rateLimit: {
    maxPerHour: 10,
    maxPerDay: 50,
  },
};

const notificationHistory: Notification[] = [];
const MAX_HISTORY_SIZE = 50000;
const hourlySentCount = { count: 0, resetTime: Date.now() };
const dailySentCount = { count: 0, resetTime: Date.now() };

export function setNotificationConfig(config: Partial<NotificationConfig>): void {
  Object.assign(defaultNotificationConfig, config);
  dbLogger.debug({ config: defaultNotificationConfig }, '알림 설정 업데이트');
}

export function getNotificationConfig(): NotificationConfig {
  return { ...defaultNotificationConfig };
}

function isQuietHours(): boolean {
  if (!defaultNotificationConfig.quietHours.enabled) return false;

  const currentHour = new Date().getHours();
  const { start, end } = defaultNotificationConfig.quietHours;

  if (start > end) {
    return currentHour >= start || currentHour < end;
  }
  return currentHour >= start && currentHour < end;
}

function checkRateLimit(): boolean {
  const now = Date.now();

  if (now - hourlySentCount.resetTime > 60 * 60 * 1000) {
    hourlySentCount.count = 0;
    hourlySentCount.resetTime = now;
  }

  if (now - dailySentCount.resetTime > 24 * 60 * 60 * 1000) {
    dailySentCount.count = 0;
    dailySentCount.resetTime = now;
  }

  return (
    hourlySentCount.count < defaultNotificationConfig.rateLimit.maxPerHour &&
    dailySentCount.count < defaultNotificationConfig.rateLimit.maxPerDay
  );
}

export async function sendNotification(
  type: Notification['type'],
  severity: Notification['severity'],
  title: string,
  message: string,
  data?: any
): Promise<Notification> {
  const notification: Notification & { timestamp?: Date } = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    title,
    message,
    data,
    status: 'pending',
    channels: [],
    sentAt: new Date(),
    timestamp: new Date(),
  };

  try {
    if (!defaultNotificationConfig.enabled) {
      notification.status = 'suppressed';
      notification.channels = ['none'];
      notificationHistory.push(notification);
      return notification;
    }

    if (isQuietHours() && severity !== 'critical') {
      notification.status = 'suppressed';
      notification.channels = ['quiet_hours'];
      notificationHistory.push(notification);
      return notification;
    }

    if (!checkRateLimit()) {
      notification.status = 'suppressed';
      notification.channels = ['rate_limited'];
      notificationHistory.push(notification);
      return notification;
    }

    const channelsUsed: string[] = [];

    if (defaultNotificationConfig.channels.includes('slack')) {
      const slackMessage = `[${severity.toUpperCase()}] ${title}\n${message}`;
      const slackResult = await sendSlackNotification(slackMessage, severity);
      if (slackResult.status === 'success') {
        channelsUsed.push('slack');
      }
    }

    if (defaultNotificationConfig.channels.includes('email')) {
      const emailSubject = `[데이터 품질] ${title}`;
      const emailBody = `유형: ${type}\n심각도: ${severity}\n\n${message}`;
      const emailResult = await sendEmailNotification(emailSubject, emailBody);
      if (emailResult.status === 'success') {
        channelsUsed.push('email');
      }
    }

    if (defaultNotificationConfig.channels.includes('webhook')) {
      const webhookResult = await sendWebhookNotification(type, {
        title,
        message,
        severity,
        data,
      });
      if (webhookResult.status === 'success') {
        channelsUsed.push('webhook');
      }
    }

    if (channelsUsed.length > 0) {
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.channels = channelsUsed;
      hourlySentCount.count++;
      dailySentCount.count++;
    } else {
      notification.status = 'failed';
      notification.channels = [];
    }

    dbLogger.debug({
      notificationId: notification.id,
      type,
      severity,
      status: notification.status,
      channels: channelsUsed,
    }, '알림 처리 완료');
  } catch (error) {
    notification.status = 'failed';
    dbLogger.error({
      notificationId: notification.id,
      error: error instanceof Error ? error.message : String(error),
    }, '알림 전송 실패');
  }

  notificationHistory.push(notification);
  if (notificationHistory.length > MAX_HISTORY_SIZE) {
    notificationHistory.splice(0, notificationHistory.length - MAX_HISTORY_SIZE);
  }

  return notification;
}

export async function sendQualityCheckAlert(
  businessId: string,
  score: number,
  status: string
): Promise<Notification> {
  const severity = score < defaultNotificationConfig.thresholds.criticalScore
    ? 'critical'
    : score < defaultNotificationConfig.thresholds.warningScore
    ? 'warning'
    : 'info';

  return sendNotification(
    'quality_check',
    severity,
    `품질 검증 ${status === 'failed' ? '실패' : '완료'}: ${businessId}`,
    `사업체 ${businessId}의 품질 검증이 ${status}되었습니다. 점수: ${score}점`,
    { businessId, score, status }
  );
}

export async function sendAnomalyAlert(
  anomalyCount: number,
  topAnomalies: any[]
): Promise<Notification> {
  const severity = anomalyCount >= defaultNotificationConfig.thresholds.anomalyCount
    ? 'critical'
    : anomalyCount > 0
    ? 'warning'
    : 'info';

  const anomalySummary = topAnomalies
    .slice(0, 5)
    .map(a => `- ${a.field}: ${a.businessId} (점수: ${a.anomalyScore})`)
    .join('\n');

  return sendNotification(
    'anomaly',
    severity,
    `이상 탐지 알림: ${anomalyCount}건`,
    `이상 데이터가 ${anomalyCount}건 탐지되었습니다.\n\n상위 이상 항목:\n${anomalySummary}`,
    { anomalyCount, topAnomalies }
  );
}

export async function sendThresholdAlert(
  metric: string,
  currentValue: number,
  threshold: number,
  isBelow: boolean = true
): Promise<Notification> {
  const severity = isBelow && currentValue < defaultNotificationConfig.thresholds.criticalScore
    ? 'critical'
    : 'warning';

  return sendNotification(
    'threshold',
    severity,
    `임계값 초과: ${metric}`,
    `${metric}이(가) ${isBelow ? '미달' : '초과'}되었습니다. 현재값: ${currentValue}, 기준값: ${threshold}`,
    { metric, currentValue, threshold, isBelow }
  );
}

export async function sendDailySummary(
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    averageScore: number;
    anomalyCount: number;
    topIssues: string[];
  }
): Promise<Notification> {
  const message = [
    `일일 품질 요약`,
    `- 전체 검증: ${summary.totalChecks}회`,
    `- 통과: ${summary.passedChecks}회`,
    `- 실패: ${summary.failedChecks}회`,
    `- 평균 점수: ${summary.averageScore}점`,
    `- 이상 탐지: ${summary.anomalyCount}건`,
    '',
    '주요 이슈:',
    ...summary.topIssues.map(issue => `- ${issue}`),
  ].join('\n');

  return sendNotification(
    'daily_summary',
    'info',
    '일일 데이터 품질 요약',
    message,
    summary
  );
}

export function getNotificationHistory(
  type?: string,
  limit: number = 100
): Notification[] {
  let history = [...notificationHistory];
  if (type) {
    history = history.filter(h => h.type === type);
  }
  return history.slice(-limit);
}

export function getNotificationStats(): {
  totalNotifications: number;
  sentCount: number;
  failedCount: number;
  suppressedCount: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
} {
  const totalNotifications = notificationHistory.length;
  const sentCount = notificationHistory.filter(n => n.status === 'sent').length;
  const failedCount = notificationHistory.filter(n => n.status === 'failed').length;
  const suppressedCount = notificationHistory.filter(n => n.status === 'suppressed').length;

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const notification of notificationHistory) {
    byType[notification.type] = (byType[notification.type] || 0) + 1;
    bySeverity[notification.severity] = (bySeverity[notification.severity] || 0) + 1;
  }

  return {
    totalNotifications,
    sentCount,
    failedCount,
    suppressedCount,
    byType,
    bySeverity,
  };
}

export function generateNotificationReport(): string {
  const stats = getNotificationStats();

  const lines = [
    '# 알림 서비스 리포트',
    '',
    '## 요약',
    `- 전체 알림: ${stats.totalNotifications}개`,
    `- 전송 성공: ${stats.sentCount}개`,
    `- 전송 실패: ${stats.failedCount}개`,
    `- 억제됨: ${stats.suppressedCount}개`,
    '',
    '## 유형별 알림',
  ];

  for (const [type, count] of Object.entries(stats.byType)) {
    lines.push(`- ${type}: ${count}개`);
  }

  lines.push('', '## 심각도별 알림');
  for (const [severity, count] of Object.entries(stats.bySeverity)) {
    lines.push(`- ${severity}: ${count}개`);
  }

  return lines.join('\n');
}
