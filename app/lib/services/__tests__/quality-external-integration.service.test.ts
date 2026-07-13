import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  sendSlackNotification,
  sendEmailNotification,
  sendWebhookNotification,
  addExternalSystem,
  removeExternalSystem,
  getIntegrationConfig,
  setIntegrationConfig,
  getIntegrationHistory,
  getIntegrationStats,
  generateIntegrationReport,
} from '../quality/quality-external-integration.service';

describe('QualityExternalIntegrationService', () => {
  beforeEach(() => {
    setIntegrationConfig({
      slack: {
        enabled: false,
        webhookUrl: '',
        channel: '#test',
        username: 'Test Bot',
        notifyOnFailure: true,
        notifyOnWarning: false,
        dailySummary: false,
      },
      email: {
        enabled: false,
        recipients: [],
        smtpHost: 'smtp.test.com',
        smtpPort: 587,
        username: '',
        password: '',
        useTls: true,
        notifyOnFailure: true,
        dailySummary: false,
      },
      webhook: {
        enabled: false,
        url: '',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        events: ['test_event'],
      },
      externalSystems: [],
    });
  });

  describe('sendSlackNotification', () => {
    it('should return failed when slack is disabled', async () => {
      const result = await sendSlackNotification('테스트 메시지');

      expect(result).toHaveProperty('id');
      expect(result.type).toBe('slack');
      expect(result.status).toBe('failed');
      expect(result.error).toContain('비활성화');
    });

    it('should record notification in history', async () => {
      await sendSlackNotification('테스트 메시지');

      const history = getIntegrationHistory('slack');
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('sendEmailNotification', () => {
    it('should return failed when email is disabled', async () => {
      const result = await sendEmailNotification('테스트 제목', '테스트 본문');

      expect(result).toHaveProperty('id');
      expect(result.type).toBe('email');
      expect(result.status).toBe('failed');
      expect(result.error).toContain('비활성화');
    });

    it('should return failed when no recipients', async () => {
      setIntegrationConfig({
        email: {
          enabled: true,
          recipients: [],
          smtpHost: 'smtp.test.com',
          smtpPort: 587,
          username: 'test@test.com',
          password: 'password',
          useTls: true,
          notifyOnFailure: true,
          dailySummary: false,
        },
      });

      const result = await sendEmailNotification('테스트 제목', '테스트 본문');

      expect(result.status).toBe('failed');
      expect(result.error).toContain('수신자');
    });
  });

  describe('sendWebhookNotification', () => {
    it('should return failed when webhook is disabled', async () => {
      const result = await sendWebhookNotification('test_event', { data: 'test' });

      expect(result).toHaveProperty('id');
      expect(result.type).toBe('webhook');
      expect(result.status).toBe('failed');
      expect(result.error).toContain('비활성화');
    });

    it('should return failed for unregistered event', async () => {
      setIntegrationConfig({
        webhook: {
          enabled: true,
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          events: ['registered_event'],
        },
      });

      const result = await sendWebhookNotification('unregistered_event', {});

      expect(result.status).toBe('failed');
      expect(result.error).toContain('목록에 없습니다');
    });
  });

  describe('external system management', () => {
    it('should add and remove external systems', () => {
      addExternalSystem('TestSystem', 'api', { url: 'https://api.test.com' });

      const config = getIntegrationConfig();
      expect(config.externalSystems.length).toBe(1);
      expect(config.externalSystems[0].name).toBe('TestSystem');

      const removed = removeExternalSystem('TestSystem');
      expect(removed).toBe(true);
      expect(getIntegrationConfig().externalSystems.length).toBe(0);
    });

    it('should return false when removing non-existent system', () => {
      const removed = removeExternalSystem('NonExistent');
      expect(removed).toBe(false);
    });
  });

  describe('getIntegrationStats', () => {
    it('should return integration statistics', () => {
      const stats = getIntegrationStats();

      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('eventsByType');
      expect(stats).toHaveProperty('eventsByStatus');
      expect(typeof stats.totalEvents).toBe('number');
      expect(typeof stats.successRate).toBe('number');
    });
  });

  describe('generateIntegrationReport', () => {
    it('should generate integration report', () => {
      const report = generateIntegrationReport();

      expect(typeof report).toBe('string');
      expect(report).toContain('외부 시스템 연동 리포트');
      expect(report).toContain('요약');
    });
  });

  describe('config management', () => {
    it('should update and retrieve config', () => {
      setIntegrationConfig({
        slack: {
          enabled: true,
          webhookUrl: 'https://hooks.slack.com/test',
          channel: '#alerts',
          username: 'Alert Bot',
          notifyOnFailure: true,
          notifyOnWarning: true,
          dailySummary: true,
        },
      });

      const config = getIntegrationConfig();
      expect(config.slack.enabled).toBe(true);
      expect(config.slack.channel).toBe('#alerts');
    });
  });
});
