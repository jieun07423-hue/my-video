import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  sendSlackNotification,
  getIntegrationConfig,
  setIntegrationConfig,
  getIntegrationStats,
  addExternalSystem,
  removeExternalSystem,
} from '@/lib/services/quality/quality-external-integration.service';

describe('/api/data-quality/integration', () => {
  beforeEach(() => {
    setIntegrationConfig({
      slack: { enabled: false, webhookUrl: '', channel: '#test', username: 'Bot', notifyOnFailure: true, notifyOnWarning: false, dailySummary: false },
      email: { enabled: false, recipients: [], smtpHost: '', smtpPort: 587, username: '', password: '', useTls: true, notifyOnFailure: true, dailySummary: false },
      webhook: { enabled: false, url: '', method: 'POST', headers: {}, events: [] },
      externalSystems: [],
    });
  });

  describe('GET', () => {
    it('should return integration config', async () => {
      const config = getIntegrationConfig();
      expect(config).toHaveProperty('slack');
      expect(config).toHaveProperty('email');
      expect(config).toHaveProperty('webhook');
      expect(config).toHaveProperty('externalSystems');
    });

    it('should return integration stats when action is stats', async () => {
      const stats = getIntegrationStats();
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('eventsByType');
    });
  });

  describe('POST', () => {
    it('should update config when action is config', async () => {
      const newConfig = {
        slack: {
          enabled: true,
          webhookUrl: 'https://hooks.slack.com/test',
          channel: '#alerts',
          username: 'Alert Bot',
          notifyOnFailure: true,
          notifyOnWarning: true,
          dailySummary: true,
        },
      };

      setIntegrationConfig(newConfig);
      const config = getIntegrationConfig();
      expect(config.slack.enabled).toBe(true);
      expect(config.slack.channel).toBe('#alerts');
    });

    it('should send slack notification when action is slack', async () => {
      const result = await sendSlackNotification('테스트 메시지', 'info');
      expect(result).toHaveProperty('id');
      expect(result.type).toBe('slack');
    });

    it('should add external system when action is addSystem', async () => {
      addExternalSystem('TestSystem', 'api', { url: 'https://api.test.com' });
      const config = getIntegrationConfig();
      expect(config.externalSystems.length).toBe(1);
      expect(config.externalSystems[0].name).toBe('TestSystem');
    });

    it('should remove external system when action is removeSystem', async () => {
      addExternalSystem('ToRemove', 'api', {});
      const removed = removeExternalSystem('ToRemove');
      expect(removed).toBe(true);
      expect(getIntegrationConfig().externalSystems.length).toBe(0);
    });
  });
});
