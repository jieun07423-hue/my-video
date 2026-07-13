import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  sendNotification,
  sendQualityCheckAlert,
  getNotificationConfig,
  setNotificationConfig,
  getNotificationStats,
} from '@/lib/services/quality/quality-enhanced-notification.service';

describe('/api/data-quality/notifications', () => {
  beforeEach(() => {
    setNotificationConfig({
      enabled: true,
      channels: [],
      thresholds: { criticalScore: 40, warningScore: 60, anomalyCount: 10, failureCount: 5 },
      quietHours: { enabled: false, start: 22, end: 8 },
      rateLimit: { maxPerHour: 100, maxPerDay: 1000 },
    });
  });

  describe('GET', () => {
    it('should return notification config', async () => {
      const config = getNotificationConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('channels');
      expect(config).toHaveProperty('thresholds');
    });

    it('should return notification stats when action is stats', async () => {
      const stats = getNotificationStats();
      expect(stats).toHaveProperty('totalNotifications');
      expect(stats).toHaveProperty('sentCount');
      expect(stats).toHaveProperty('failedCount');
    });
  });

  describe('POST', () => {
    it('should update config when action is config', async () => {
      const newConfig = { enabled: false };
      setNotificationConfig(newConfig);
      const config = getNotificationConfig();
      expect(config.enabled).toBe(false);
    });

    it('should send notification when action is send', async () => {
      const result = await sendNotification('quality_check', 'info', '테스트', '테스트 메시지');
      expect(result).toHaveProperty('id');
      expect(result.type).toBe('quality_check');
    });

    it('should send quality check alert when action is qualityCheck', async () => {
      const result = await sendQualityCheckAlert('1234567890', 30, 'failed');
      expect(result.type).toBe('quality_check');
      expect(result.data.businessId).toBe('1234567890');
    });
  });
});
