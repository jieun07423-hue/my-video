import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createSLA,
  getSLAById,
  getSLADefinitions,
  updateSLA,
  deleteSLA,
  recordMeasurement,
  getMeasurements,
  generateSLAReport,
  getSLAStats,
} from '../quality-sla.service';

describe('QualitySLAService', () => {
  describe('SLA management', () => {
    it('should create SLA', () => {
      const sla = createSLA(
        '데이터 완성도 SLA',
        '월간 데이터 완성도 목표',
        'completeness',
        90,
        'gte',
        'monthly',
        [{ id: 't1', name: '전체', type: 'overall' }]
      );

      expect(sla).toHaveProperty('id');
      expect(sla).toHaveProperty('name', '데이터 완성도 SLA');
      expect(sla).toHaveProperty('threshold', 90);
      expect(sla).toHaveProperty('enabled', true);
    });

    it('should retrieve SLA by id', () => {
      const created = createSLA(
        '테스트 SLA',
        '테스트',
        'accuracy',
        85,
        'gte',
        'weekly',
        [{ id: 't1', name: '전체', type: 'overall' }]
      );

      const retrieved = getSLAById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for unknown SLA', () => {
      expect(getSLAById('nonexistent')).toBeUndefined();
    });

    it('should list all SLAs', () => {
      const all = getSLADefinitions();
      expect(Array.isArray(all)).toBe(true);
    });

    it('should update SLA', () => {
      const sla = createSLA(
        '업데이트 테스트',
        '테스트',
        'test',
        80,
        'gte',
        'monthly',
        [{ id: 't1', name: '전체', type: 'overall' }]
      );

      const result = updateSLA(sla.id, { threshold: 95, description: '수정됨' });
      expect(result).toBe(true);
      const updated = getSLAById(sla.id);
      expect(updated?.threshold).toBe(95);
    });

    it('should delete SLA', () => {
      const sla = createSLA(
        '삭제 테스트',
        '테스트',
        'delete_test',
        50,
        'gte',
        'monthly',
        [{ id: 't1', name: '전체', type: 'overall' }]
      );

      const result = deleteSLA(sla.id);
      expect(result).toBe(true);
      expect(getSLAById(sla.id)).toBeUndefined();
    });
  });

  describe('measurement', () => {
    it('should record measurement', () => {
      const sla = createSLA(
        '측정 테스트',
        '테스트',
        'completeness',
        85,
        'gte',
        'daily',
        [{ id: 't1', name: '전체', type: 'overall' }]
      );

      const now = new Date();
      const measurement = recordMeasurement(
        sla.id,
        't1',
        '전체',
        92,
        new Date(now.getTime() - 86400000),
        now
      );
      expect(measurement).toHaveProperty('id');
      expect(measurement).toHaveProperty('slaId', sla.id);
      expect(measurement).toHaveProperty('measuredValue', 92);
      expect(measurement).toHaveProperty('status', 'met');
    });

    it('should detect SLA violation', () => {
      const sla = createSLA(
        '위반 테스트',
        '테스트',
        'accuracy',
        90,
        'gte',
        'daily',
        [{ id: 't1', name: '전체', type: 'overall' }]
      );

      const now = new Date();
      const measurement = recordMeasurement(
        sla.id,
        't1',
        '전체',
        75,
        new Date(now.getTime() - 86400000),
        now
      );
      expect(measurement.status).not.toBe('met');
    });

    it('should track measurement history', () => {
      const sla = createSLA(
        '이력 테스트',
        '테스트',
        'history_test',
        80,
        'gte',
        'daily',
        [{ id: 't1', name: '전체', type: 'overall' }]
      );

      const now = new Date();
      recordMeasurement(sla.id, 't1', '전체', 85, new Date(now.getTime() - 86400000), now);
      recordMeasurement(sla.id, 't1', '전체', 78, new Date(now.getTime() - 86400000), now);

      const measurements = getMeasurements(sla.id);
      expect(measurements.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('reporting', () => {
    it('should generate SLA report', () => {
      const sla = createSLA(
        '리포트 테스트',
        '테스트',
        'completeness',
        85,
        'gte',
        'monthly',
        [{ id: 't1', name: '전체', type: 'overall' }]
      );

      const now = new Date();
      recordMeasurement(sla.id, 't1', '전체', 90, new Date(now.getTime() - 86400000 * 2), now);
      recordMeasurement(sla.id, 't1', '전체', 88, new Date(now.getTime() - 86400000), now);

      const report = generateSLAReport(
        new Date(now.getTime() - 86400000 * 3),
        now
      );
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      expect(report.summary).toHaveProperty('totalSLAs');
      expect(report.summary).toHaveProperty('metCount');
      expect(report.summary).toHaveProperty('breachedCount');
      expect(report.summary).toHaveProperty('complianceRate');
    });
  });

  describe('stats', () => {
    it('should return SLA stats', () => {
      const stats = getSLAStats();
      expect(stats).toHaveProperty('totalDefinitions');
      expect(stats).toHaveProperty('activeMeasurements');
      expect(stats).toHaveProperty('overallCompliance');
      expect(stats).toHaveProperty('breachedSLAs');
      expect(typeof stats.totalDefinitions).toBe('number');
      expect(typeof stats.activeMeasurements).toBe('number');
      expect(typeof stats.overallCompliance).toBe('number');
      expect(Array.isArray(stats.breachedSLAs)).toBe(true);
    });
  });
});
