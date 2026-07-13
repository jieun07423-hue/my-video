import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  setPredictionConfig,
  getPredictionConfig,
  predictQualityMetric,
  predictBatchMetrics,
  getPredictionHistory,
  getPredictionStats,
  generatePredictionReport,
} from '../quality/quality-prediction.service';

describe('QualityPredictionService', () => {
  beforeEach(() => {
    setPredictionConfig({
      enabled: true,
      modelType: 'moving-average',
      forecastDays: 30,
      confidenceLevel: 0.95,
      minimumDataPoints: 5,
    });
  });

  describe('config management', () => {
    it('should update and retrieve config', () => {
      setPredictionConfig({ modelType: 'linear', forecastDays: 60 });
      const config = getPredictionConfig();
      expect(config.modelType).toBe('linear');
      expect(config.forecastDays).toBe(60);
    });
  });

  describe('predictQualityMetric', () => {
    it('should predict from historical data', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() - (20 - i) * 86400000),
        value: 70 + Math.sin(i * 0.3) * 10 + i * 0.5,
      }));

      const result = predictQualityMetric('completeness', data);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('metric', 'completeness');
      expect(result).toHaveProperty('currentValue');
      expect(result).toHaveProperty('predictedValue');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('forecast');
      expect(result).toHaveProperty('riskLevel');
      expect(result.trend).toHaveProperty('direction');
      expect(result.trend).toHaveProperty('slope');
      expect(result.trend).toHaveProperty('volatility');
      expect(Array.isArray(result.forecast)).toBe(true);
      expect(result.forecast.length).toBe(30);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
    });

    it('should handle minimal data', () => {
      const data = [
        { timestamp: new Date(), value: 80 },
        { timestamp: new Date(), value: 75 },
      ];

      const result = predictQualityMetric('test', data);
      expect(result).toHaveProperty('predictedValue');
    });
  });

  describe('predictBatchMetrics', () => {
    it('should batch predict multiple metrics', () => {
      const metricsData = {
        completeness: Array.from({ length: 10 }, (_, i) => ({
          timestamp: new Date(Date.now() - (10 - i) * 86400000),
          value: 75 + i,
        })),
        accuracy: Array.from({ length: 10 }, (_, i) => ({
          timestamp: new Date(Date.now() - (10 - i) * 86400000),
          value: 80 - i * 0.5,
        })),
      };

      const result = predictBatchMetrics(metricsData);
      expect(result).toHaveProperty('totalMetrics', 2);
      expect(result).toHaveProperty('averageConfidence');
      expect(result).toHaveProperty('highRiskMetrics');
      expect(result).toHaveProperty('predictions');
      expect(result.predictions).toHaveLength(2);
    });

    it('should skip metrics with insufficient data', () => {
      const metricsData = {
        short: [{ timestamp: new Date(), value: 50 }],
      };

      const result = predictBatchMetrics(metricsData);
      expect(result.totalMetrics).toBe(0);
    });
  });

  describe('getPredictionHistory', () => {
    it('should return prediction history', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - (10 - i) * 86400000),
        value: 70 + i,
      }));
      predictQualityMetric('test', data);

      const history = getPredictionHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter by metric', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - (10 - i) * 86400000),
        value: 70 + i,
      }));
      predictQualityMetric('metricA', data);
      predictQualityMetric('metricB', data);

      const history = getPredictionHistory('metricA');
      history.forEach(h => expect(h.metric).toBe('metricA'));
    });
  });

  describe('getPredictionStats', () => {
    it('should return prediction stats', () => {
      const stats = getPredictionStats();
      expect(stats).toHaveProperty('totalPredictions');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('riskDistribution');
      expect(stats).toHaveProperty('metricFrequency');
    });
  });

  describe('generatePredictionReport', () => {
    it('should generate prediction report', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - (10 - i) * 86400000),
        value: 70 + i,
      }));
      const result = predictQualityMetric('completeness', data);
      const report = generatePredictionReport(result);

      expect(typeof report).toBe('string');
      expect(report).toContain('품질 예측 리포트');
      expect(report).toContain('completeness');
    });
  });
});
