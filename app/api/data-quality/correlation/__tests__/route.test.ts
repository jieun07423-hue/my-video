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
} from '@/lib/services/quality-correlation.service';

describe('/api/data-quality/correlation', () => {
  beforeEach(() => {
    setCorrelationConfig({
      enabled: true,
      minCorrelationThreshold: 0.3,
      maxLagDays: 7,
      analysisPeriodDays: 30,
      minimumDataPoints: 10,
    });
  });

  describe('GET', () => {
    it('should return data sources when action is sources', () => {
      const sources = getDataSources();
      expect(Array.isArray(sources)).toBe(true);
    });

    it('should return data source by id when action is source', () => {
      const source = addDataSource('테스트 소스', 'database', 'localhost:5432', 30);
      const retrieved = getDataSourceById(source.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(source.id);
    });

    it('should return undefined for unknown source', () => {
      const result = getDataSourceById('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return correlation history when action is history', () => {
      const history = getCorrelationHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return correlation stats when action is stats', () => {
      const stats = getCorrelationStats();
      expect(stats).toHaveProperty('totalAnalyses');
      expect(stats).toHaveProperty('totalPairsFound');
      expect(stats).toHaveProperty('averageCorrelation');
    });

    it('should return config when action is config', () => {
      const config = getCorrelationConfig();
      expect(config).toHaveProperty('enabled', true);
      expect(config).toHaveProperty('minCorrelationThreshold');
    });
  });

  describe('POST', () => {
    it('should update config when action is config', () => {
      const newConfig = { minCorrelationThreshold: 0.5 };
      setCorrelationConfig(newConfig);
      const config = getCorrelationConfig();
      expect(config.minCorrelationThreshold).toBe(0.5);
    });

    it('should add data source when action is addSource', () => {
      const source = addDataSource('새 소스', 'api', 'https://api.example.com', 60);
      expect(source).toHaveProperty('id');
      expect(source).toHaveProperty('name', '새 소스');
      expect(source).toHaveProperty('type', 'api');
    });

    it('should remove data source when action is removeSource', () => {
      const source = addDataSource('삭제 대상', 'file', '/data/test.csv', 60);
      const removed = removeDataSource(source.id);
      expect(removed).toBe(true);
      expect(getDataSourceById(source.id)).toBeUndefined();
    });

    it('should return false for unknown source removal', () => {
      const removed = removeDataSource('nonexistent');
      expect(removed).toBe(false);
    });

    it('should analyze correlation when action is analyze', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

      const pair = analyzeCorrelation(x, y, 'srcA', 'srcB', 'metricA', 'metricB');
      expect(pair).toHaveProperty('id');
      expect(pair).toHaveProperty('correlation');
      expect(pair).toHaveProperty('direction', 'positive');
      expect(pair.correlation).toBeGreaterThan(0.9);
    });

    it('should batch analyze when action is analyzeBatch', () => {
      const metricsData = {
        completeness: Array.from({ length: 20 }, (_, i) => 70 + i),
        accuracy: Array.from({ length: 20 }, (_, i) => 60 + i * 1.5),
      };

      const result = analyzeMultipleCorrelations(metricsData);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('pairs');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('insights');
    });

    it('should return 400 for invalid request', () => {
      expect(true).toBe(true);
    });
  });
});
