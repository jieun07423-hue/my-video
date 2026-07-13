import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  setCorrelationConfig,
  getCorrelationConfig,
  addDataSource,
  getDataSources,
  getDataSourceById,
  removeDataSource,
  analyzeCorrelation,
  analyzeMultipleCorrelations,
  getCorrelationHistory,
  getCorrelationStats,
  generateCorrelationReport,
} from '../quality/quality-correlation.service';

describe('QualityCorrelationService', () => {
  beforeEach(() => {
    setCorrelationConfig({
      enabled: true,
      minCorrelationThreshold: 0.3,
      maxLagDays: 7,
      analysisPeriodDays: 30,
      minimumDataPoints: 10,
    });
  });

  describe('config management', () => {
    it('should update and retrieve config', () => {
      setCorrelationConfig({ minCorrelationThreshold: 0.5 });
      const config = getCorrelationConfig();
      expect(config.minCorrelationThreshold).toBe(0.5);
    });

    it('should return default config', () => {
      const config = getCorrelationConfig();
      expect(config).toHaveProperty('enabled', true);
      expect(config).toHaveProperty('maxLagDays');
      expect(config).toHaveProperty('minimumDataPoints');
    });
  });

  describe('data source management', () => {
    it('should add data source', () => {
      const source = addDataSource('품질 DB', 'database', 'localhost:5432/quality', 30);
      expect(source).toHaveProperty('id');
      expect(source).toHaveProperty('name', '품질 DB');
      expect(source).toHaveProperty('type', 'database');
      expect(source).toHaveProperty('enabled', true);
    });

    it('should retrieve data sources', () => {
      addDataSource('API A', 'api', 'https://api-a.example.com', 60);
      addDataSource('API B', 'api', 'https://api-b.example.com', 120);

      const sources = getDataSources();
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBeGreaterThanOrEqual(2);
    });

    it('should get data source by id', () => {
      const source = addDataSource('테스트 소스', 'file', '/data/test.csv', 60);
      const retrieved = getDataSourceById(source.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(source.id);
    });

    it('should remove data source', () => {
      const source = addDataSource('삭제 대상', 'stream', 'ws://example.com', 10);
      const removed = removeDataSource(source.id);
      expect(removed).toBe(true);
      expect(getDataSourceById(source.id)).toBeUndefined();
    });

    it('should return false for unknown source', () => {
      expect(removeDataSource('nonexistent')).toBe(false);
    });
  });

  describe('analyzeCorrelation', () => {
    it('should analyze positive correlation', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

      const pair = analyzeCorrelation(x, y, 'srcA', 'srcB', 'metricA', 'metricB');

      expect(pair).toHaveProperty('id');
      expect(pair).toHaveProperty('correlation');
      expect(pair).toHaveProperty('direction', 'positive');
      expect(pair.strength).toMatch(/strong|moderate|weak|none/);
      expect(pair.correlation).toBeGreaterThan(0.9);
    });

    it('should analyze negative correlation', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const y = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2];

      const pair = analyzeCorrelation(x, y, 'srcA', 'srcB', 'metricA', 'metricB');
      expect(pair.direction).toBe('negative');
      expect(pair.correlation).toBeLessThan(-0.9);
    });

    it('should return low correlation for random data', () => {
      const x = [5, 3, 8, 1, 7, 2, 9, 4, 6, 10];
      const y = [2, 8, 1, 9, 4, 7, 3, 6, 10, 5];

      const pair = analyzeCorrelation(x, y, 'srcA', 'srcB', 'metricA', 'metricB');
      expect(Math.abs(pair.correlation)).toBeLessThan(0.9);
    });
  });

  describe('analyzeMultipleCorrelations', () => {
    it('should analyze multiple metrics', () => {
      const metricsData = {
        completeness: Array.from({ length: 20 }, (_, i) => 70 + i + Math.random()),
        accuracy: Array.from({ length: 20 }, (_, i) => 60 + i * 1.5 + Math.random()),
        timeliness: Array.from({ length: 20 }, (_, i) => 50 + i * 2 + Math.random()),
      };

      const result = analyzeMultipleCorrelations(metricsData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('pairs');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('generatedAt');
      expect(result.summary).toHaveProperty('totalPairs');
      expect(result.summary).toHaveProperty('strongCorrelations');
      expect(result.summary).toHaveProperty('averageCorrelation');
    });

    it('should handle insufficient data points', () => {
      const metricsData = {
        shortA: [1, 2, 3],
        shortB: [4, 5, 6],
      };

      const result = analyzeMultipleCorrelations(metricsData);
      expect(result.summary.totalPairs).toBe(0);
    });

    it('should store results in history', () => {
      const data = Array.from({ length: 15 }, (_, i) => ({
        a: i,
        b: i * 2,
      }));

      analyzeMultipleCorrelations({
        m1: data.map(d => d.a),
        m2: data.map(d => d.b),
      });

      const history = getCorrelationHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('getCorrelationHistory', () => {
    it('should return history', () => {
      const data = Array.from({ length: 15 }, (_, i) => i);
      analyzeMultipleCorrelations({ x: data, y: data });

      const history = getCorrelationHistory(10);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getCorrelationStats', () => {
    it('should return stats', () => {
      const stats = getCorrelationStats();
      expect(stats).toHaveProperty('totalAnalyses');
      expect(stats).toHaveProperty('totalPairsFound');
      expect(stats).toHaveProperty('averageCorrelation');
      expect(stats).toHaveProperty('strongestPair');
    });
  });

  describe('generateCorrelationReport', () => {
    it('should generate report', () => {
      const data = Array.from({ length: 15 }, (_, i) => i);
      const result = analyzeMultipleCorrelations({
        completeness: data,
        accuracy: data.map(d => d * 1.5),
      });

      const report = generateCorrelationReport(result);
      expect(typeof report).toBe('string');
      expect(report).toContain('상관 분석 리포트');
      expect(report).toContain('요약');
    });
  });
});
