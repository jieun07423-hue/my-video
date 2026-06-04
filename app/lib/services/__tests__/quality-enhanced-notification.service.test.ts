import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  sendNotification,
  sendQualityCheckAlert,
  sendAnomalyAlert,
  sendThresholdAlert,
  sendDailySummary,
  getNotificationConfig,
  setNotificationConfig,
  getNotificationHistory,
  getNotificationStats,
  generateNotificationReport,
} from '../quality-enhanced-notification.service';

describe('QualityEnhancedNotificationService', () => {
  beforeEach(() => {
    setNotificationConfig({
      enabled: true,
      channels: [],
      thresholds: {
        criticalScore: 40,
        warningScore: 60,
        anomalyCount: 10,
        failureCount: 5,
      },
      quietHours: { enabled: false, start: 22, end: 8 },
      rateLimit: { maxPerHour: 100, maxPerDay: 1000 },
    });
  });

  describe('sendNotification', () => {
    it('should send a notification with no channels configured', async () => {
      const result = await sendNotification('quality_check', 'info', '테스트', '테스트 메시지');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('type', 'quality_check');
      expect(result).toHaveProperty('severity', 'info');
      expect(result).toHaveProperty('title', '테스트');
      expect(result).toHaveProperty('message', '테스트 메시지');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('channels');
      expect(result).toHaveProperty('timestamp');
    });

    it('should record notification in history', async () => {
      await sendNotification('quality_check', 'info', '테스트', '테스트 메시지');

      const history = getNotificationHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should suppress notifications when disabled', async () => {
      setNotificationConfig({ enabled: false });

      const result = await sendNotification('quality_check', 'info', '테스트', '테스트 메시지');

      expect(result.status).toBe('suppressed');
    });
  });

  describe('sendQualityCheckAlert', () => {
    it('should send alert for failed quality check', async () => {
      const result = await sendQualityCheckAlert('1234567890', 30, 'failed');

      expect(result.type).toBe('quality_check');
      expect(result.severity).toBe('critical');
      expect(result.data).toHaveProperty('businessId', '1234567890');
      expect(result.data).toHaveProperty('score', 30);
    });

    it('should send warning for medium score', async () => {
      const result = await sendQualityCheckAlert('1234567890', 50, 'completed');

      expect(result.severity).toBe('warning');
    });

    it('should send info for high score', async () => {
      const result = await sendQualityCheckAlert('1234567890', 85, 'completed');

      expect(result.severity).toBe('info');
    });
  });

  describe('sendAnomalyAlert', () => {
    it('should send critical alert for many anomalies', async () => {
      const topAnomalies = [
        { field: 'phone', businessId: '123', anomalyScore: 0.9 },
        { field: 'address', businessId: '456', anomalyScore: 0.8 },
      ];

      const result = await sendAnomalyAlert(15, topAnomalies);

      expect(result.type).toBe('anomaly');
      expect(result.severity).toBe('critical');
      expect(result.data).toHaveProperty('anomalyCount', 15);
    });

    it('should send warning for some anomalies', async () => {
      const result = await sendAnomalyAlert(5, []);

      expect(result.severity).toBe('warning');
    });
  });

  describe('sendThresholdAlert', () => {
    it('should send critical alert when below critical threshold', async () => {
      const result = await sendThresholdAlert('품질점수', 30, 60, true);

      expect(result.type).toBe('threshold');
      expect(result.severity).toBe('critical');
      expect(result.data).toHaveProperty('metric', '품질점수');
      expect(result.data).toHaveProperty('currentValue', 30);
    });

    it('should send warning when below warning threshold', async () => {
      const result = await sendThresholdAlert('품질점수', 55, 60, true);

      expect(result.severity).toBe('warning');
    });
  });

  describe('sendDailySummary', () => {
    it('should send daily summary notification', async () => {
      const summary = {
        totalChecks: 100,
        passedChecks: 85,
        failedChecks: 15,
        averageScore: 75,
        anomalyCount: 5,
        topIssues: ['전화번호 형식 오류', '주소 누락'],
      };

      const result = await sendDailySummary(summary);

      expect(result.type).toBe('daily_summary');
      expect(result.severity).toBe('info');
      expect(result.data).toHaveProperty('totalChecks', 100);
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history', async () => {
      await sendNotification('quality_check', 'info', '테스트', '메시지');

      const history = getNotificationHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter by type', async () => {
      await sendNotification('quality_check', 'info', '테스트1', '메시지1');
      await sendNotification('anomaly', 'warning', '테스트2', '메시지2');

      const qualityHistory = getNotificationHistory('quality_check');
      qualityHistory.forEach(h => {
        expect(h.type).toBe('quality_check');
      });
    });
  });

  describe('getNotificationStats', () => {
    it('should return notification statistics', () => {
      const stats = getNotificationStats();

      expect(stats).toHaveProperty('totalNotifications');
      expect(stats).toHaveProperty('sentCount');
      expect(stats).toHaveProperty('failedCount');
      expect(stats).toHaveProperty('suppressedCount');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('bySeverity');
      expect(typeof stats.totalNotifications).toBe('number');
    });
  });

  describe('generateNotificationReport', () => {
    it('should generate notification report', () => {
      const report = generateNotificationReport();

      expect(typeof report).toBe('string');
      expect(report).toContain('알림 서비스 리포트');
      expect(report).toContain('요약');
    });
  });

  describe('config management', () => {
    it('should update and retrieve config', () => {
      setNotificationConfig({
        enabled: false,
        quietHours: { enabled: true, start: 23, end: 7 },
      });

      const config = getNotificationConfig();
      expect(config.enabled).toBe(false);
      expect(config.quietHours.enabled).toBe(true);
      expect(config.quietHours.start).toBe(23);
    });
  });
});
