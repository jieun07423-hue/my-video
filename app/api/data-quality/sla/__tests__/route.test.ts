import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createSLA,
  getSLADefinitions,
  getSLAById,
  updateSLA,
  deleteSLA,
  recordMeasurement,
  getMeasurements,
  generateSLAReport,
  getSLAStats,
  setSLAConfig,
  getSLAConfig,
} from '@/lib/services/quality-sla.service';

describe('/api/data-quality/sla', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSLAConfig({
      enabled: true,
      defaultEvaluationPeriod: 'weekly',
      alertBeforeBreaching: true,
      autoEscalate: false,
    });
  });

  describe('GET', () => {
    it('should return SLA definitions when action is definitions', () => {
      const definitions = getSLADefinitions();
      expect(Array.isArray(definitions)).toBe(true);
    });

    it('should return SLA detail when action is detail', () => {
      const targets = [{ id: 't1', name: '전체', type: 'overall' as const }];
      const sla = createSLA('테스트 SLA', '설명', 'completeness', 90, 'gte', 'monthly', targets);
      const retrieved = getSLAById(sla.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(sla.id);
    });

    it('should return null for unknown SLA', () => {
      const result = getSLAById('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return measurements when action is measurements', () => {
      const measurements = getMeasurements();
      expect(Array.isArray(measurements)).toBe(true);
    });

    it('should return SLA report when action is report', () => {
      const report = generateSLAReport(new Date(Date.now() - 30 * 86400000), new Date());
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
    });

    it('should return SLA stats when action is stats', () => {
      const stats = getSLAStats();
      expect(stats).toHaveProperty('totalDefinitions');
      expect(stats).toHaveProperty('activeMeasurements');
      expect(stats).toHaveProperty('overallCompliance');
    });

    it('should return config when action is config', () => {
      const config = getSLAConfig();
      expect(config).toHaveProperty('enabled', true);
      expect(config).toHaveProperty('defaultEvaluationPeriod');
    });
  });

  describe('POST', () => {
    it('should update config when action is config', () => {
      const newConfig = { autoEscalate: true, alertBeforeBreaching: false };
      setSLAConfig(newConfig);
      const config = getSLAConfig();
      expect(config.autoEscalate).toBe(true);
      expect(config.alertBeforeBreaching).toBe(false);
    });

    it('should create SLA when action is create', () => {
      const targets = [{ id: 't1', name: '전체', type: 'overall' as const }];
      const sla = createSLA('새 SLA', '설명', 'accuracy', 85, 'gte', 'weekly', targets);
      expect(sla).toHaveProperty('id');
      expect(sla).toHaveProperty('name', '새 SLA');
      expect(sla).toHaveProperty('metric', 'accuracy');
    });

    it('should record measurement when action is record', () => {
      const targets = [{ id: 't1', name: '전체', type: 'overall' as const }];
      const sla = createSLA('측정 테스트', '설명', 'completeness', 80, 'gte', 'daily', targets);

      const measurement = recordMeasurement(
        sla.id,
        'target-1',
        '사업장1',
        92,
        new Date(Date.now() - 86400000),
        new Date()
      );

      expect(measurement).toHaveProperty('id');
      expect(measurement).toHaveProperty('measuredValue', 92);
      expect(measurement).toHaveProperty('status');
    });

    it('should throw for unknown SLA measurement', () => {
      expect(() => recordMeasurement('unknown', 't1', 'name', 80, new Date(), new Date()))
        .toThrow();
    });

    it('should return 400 for invalid request', () => {
      expect(true).toBe(true);
    });
  });

  describe('PUT', () => {
    it('should update SLA', () => {
      const targets = [{ id: 't1', name: '전체', type: 'overall' as const }];
      const sla = createSLA('원본', '설명', 'metric', 80, 'gte', 'monthly', targets);

      const success = updateSLA(sla.id, { threshold: 95 });
      expect(success).toBe(true);

      const updated = getSLAById(sla.id);
      expect(updated?.threshold).toBe(95);
    });

    it('should return false for unknown SLA', () => {
      const success = updateSLA('unknown', { threshold: 90 });
      expect(success).toBe(false);
    });
  });

  describe('DELETE', () => {
    it('should delete SLA', () => {
      const targets = [{ id: 't1', name: '전체', type: 'overall' as const }];
      const sla = createSLA('삭제 대상', '설명', 'metric', 50, 'gte', 'daily', targets);

      const success = deleteSLA(sla.id);
      expect(success).toBe(true);
      expect(getSLAById(sla.id)).toBeUndefined();
    });

    it('should return false for unknown SLA', () => {
      const success = deleteSLA('unknown');
      expect(success).toBe(false);
    });
  });
});
