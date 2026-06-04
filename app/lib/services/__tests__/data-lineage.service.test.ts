import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  queryLineage,
  getLineageSummary,
  getLineageStats,
  getFieldLineage,
  generateLineageReport,
  exportLineage,
} from '../data-lineage.service';

describe('DataLineageService', () => {
  const mockBusinessId = '1234567890';
  const mockField = 'phone';

  describe('queryLineage', () => {
    it('should query lineage with empty filter', () => {
      const lineage = queryLineage({});

      expect(Array.isArray(lineage)).toBe(true);
      lineage.forEach(entry => {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('businessId');
        expect(entry).toHaveProperty('field');
        expect(entry).toHaveProperty('previousValue');
        expect(entry).toHaveProperty('newValue');
        expect(entry).toHaveProperty('changeType');
        expect(entry).toHaveProperty('source');
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('reason');
        expect(entry).toHaveProperty('metadata');
      });
    });

    it('should query lineage with businessId filter', () => {
      const lineage = queryLineage({ businessId: mockBusinessId });

      expect(Array.isArray(lineage)).toBe(true);
      lineage.forEach(entry => {
        expect(entry.businessId).toBe(mockBusinessId);
      });
    });

    it('should query lineage with field filter', () => {
      const lineage = queryLineage({ field: mockField });

      expect(Array.isArray(lineage)).toBe(true);
      lineage.forEach(entry => {
        expect(entry.field).toBe(mockField);
      });
    });

    it('should query lineage with changeType filter', () => {
      const lineage = queryLineage({ changeType: 'correction' });

      expect(Array.isArray(lineage)).toBe(true);
      lineage.forEach(entry => {
        expect(entry.changeType).toBe('correction');
      });
    });

    it('should query lineage with source filter', () => {
      const lineage = queryLineage({ source: 'api' });

      expect(Array.isArray(lineage)).toBe(true);
      lineage.forEach(entry => {
        expect(entry.source).toBe('api');
      });
    });

    it('should query lineage with limit and offset', () => {
      const lineage = queryLineage({ limit: 5, offset: 0 });

      expect(Array.isArray(lineage)).toBe(true);
      expect(lineage.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getLineageSummary', () => {
    it('should get lineage summary for business', () => {
      const summary = getLineageSummary(mockBusinessId);

      expect(summary).toHaveProperty('businessId');
      expect(summary).toHaveProperty('totalChanges');
      expect(summary).toHaveProperty('fieldChanges');
      expect(summary).toHaveProperty('recentChanges');
      expect(summary).toHaveProperty('lastModified');
      expect(summary).toHaveProperty('changeFrequency');

      expect(summary.businessId).toBe(mockBusinessId);
      expect(typeof summary.totalChanges).toBe('number');
      expect(typeof summary.changeFrequency).toBe('number');
      expect(typeof summary.fieldChanges).toBe('object');
    });
  });

  describe('getLineageStats', () => {
    it('should get lineage stats without date filter', () => {
      const stats = getLineageStats();

      expect(stats).toHaveProperty('totalRecords');
      expect(stats).toHaveProperty('totalChanges');
      expect(stats).toHaveProperty('changesByType');
      expect(stats).toHaveProperty('changesByField');
      expect(stats).toHaveProperty('changesBySource');
      expect(stats).toHaveProperty('averageChangesPerBusiness');
      expect(stats).toHaveProperty('mostActiveBusinesses');

      expect(typeof stats.totalChanges).toBe('number');
      expect(typeof stats.averageChangesPerBusiness).toBe('number');
      expect(Array.isArray(stats.mostActiveBusinesses)).toBe(true);
    });

    it('should get lineage stats with date filter', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const stats = getLineageStats(startDate, endDate);

      expect(stats).toHaveProperty('totalRecords');
      expect(stats).toHaveProperty('totalChanges');
      expect(stats).toHaveProperty('changesByType');
      expect(stats).toHaveProperty('changesByField');
      expect(stats).toHaveProperty('changesBySource');
      expect(stats).toHaveProperty('averageChangesPerBusiness');
      expect(stats).toHaveProperty('mostActiveBusinesses');
    });
  });

  describe('getFieldLineage', () => {
    it('should get field lineage', () => {
      const lineage = getFieldLineage(mockBusinessId, mockField);

      expect(Array.isArray(lineage)).toBe(true);
      lineage.forEach(entry => {
        expect(entry.businessId).toBe(mockBusinessId);
        expect(entry.field).toBe(mockField);
      });
    });
  });

  describe('generateLineageReport', () => {
    it('should generate lineage report', () => {
      const report = generateLineageReport(mockBusinessId);

      expect(typeof report).toBe('string');
      expect(report).toContain('데이터 리니지 리포트');
      expect(report).toContain(mockBusinessId);
    });

    it('should generate lineage report with date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const report = generateLineageReport(mockBusinessId, startDate, endDate);

      expect(typeof report).toBe('string');
      expect(report).toContain('데이터 리니지 리포트');
      expect(report).toContain('2024');
    });
  });

  describe('exportLineage', () => {
    it('should export lineage as JSON', () => {
      const data = exportLineage('json');

      expect(typeof data).toBe('string');
      const parsed = JSON.parse(data);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export lineage as CSV', () => {
      const data = exportLineage('csv');

      expect(typeof data).toBe('string');
      const lines = data.split('\n');
      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0]).toContain('businessId');
      expect(lines[0]).toContain('field');
      expect(lines[0]).toContain('changeType');
    });

    it('should export lineage with query filter', () => {
      const data = exportLineage('json', { businessId: mockBusinessId });

      expect(typeof data).toBe('string');
      const parsed = JSON.parse(data);
      expect(Array.isArray(parsed)).toBe(true);
      parsed.forEach((entry: any) => {
        expect(entry.businessId).toBe(mockBusinessId);
      });
    });
  });
});
