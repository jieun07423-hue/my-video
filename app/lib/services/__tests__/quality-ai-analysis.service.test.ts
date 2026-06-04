import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  setAIAnalysisConfig,
  getAIAnalysisConfig,
  analyzeWithAI,
  analyzeBatchWithAI,
  getAnalysisHistory,
  getAnalysisStats,
  generateAIAnalysisReport,
} from '../quality-ai-analysis.service';

describe('QualityAIAnalysisService', () => {
  beforeEach(() => {
    setAIAnalysisConfig({
      provider: 'auto',
      model: 'llama3.2',
      maxTokens: 2048,
      temperature: 0.3,
      enableFallback: true,
    });
  });

  describe('config management', () => {
    it('should update and retrieve config', () => {
      setAIAnalysisConfig({ provider: 'ollama', temperature: 0.5 });
      const config = getAIAnalysisConfig();
      expect(config.provider).toBe('ollama');
      expect(config.temperature).toBe(0.5);
    });

    it('should return default config', () => {
      const config = getAIAnalysisConfig();
      expect(config).toHaveProperty('provider');
      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('maxTokens');
    });
  });

  describe('analyzeWithAI', () => {
    it('should return fallback result when AI services are unavailable', async () => {
      const result = await analyzeWithAI({
        businessId: '1234567890',
        data: { name: '테스트 사업장', phone: '02-1234-5678' },
        analysisType: 'quality',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('businessId', '1234567890');
      expect(result).toHaveProperty('analysisType', 'quality');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('processedAt');
      expect(result).toHaveProperty('duration');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.findings)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should handle anomaly analysis type', async () => {
      const result = await analyzeWithAI({
        businessId: '1234567890',
        data: { name: '테스트', latitude: 999 },
        analysisType: 'anomaly',
      });

      expect(result.analysisType).toBe('anomaly');
      expect(typeof result.score).toBe('number');
    });

    it('should handle recommendation analysis type', async () => {
      const result = await analyzeWithAI({
        businessId: '1234567890',
        data: { name: '테스트' },
        analysisType: 'recommendation',
      });

      expect(result.analysisType).toBe('recommendation');
    });

    it('should handle summary analysis type', async () => {
      const result = await analyzeWithAI({
        businessId: '1234567890',
        data: { name: '테스트' },
        analysisType: 'summary',
      });

      expect(result.analysisType).toBe('summary');
    });
  });

  describe('analyzeBatchWithAI', () => {
    it('should batch analyze multiple businesses', async () => {
      const requests = [
        { businessId: '111', data: { name: '사업장1' }, analysisType: 'quality' as const },
        { businessId: '222', data: { name: '사업장2' }, analysisType: 'quality' as const },
      ];

      const result = await analyzeBatchWithAI(requests);

      expect(result).toHaveProperty('totalAnalyzed', 2);
      expect(result).toHaveProperty('averageScore');
      expect(result).toHaveProperty('findingsBySeverity');
      expect(result).toHaveProperty('topRecommendations');
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(2);
    });

    it('should handle empty batch', async () => {
      const result = await analyzeBatchWithAI([]);
      expect(result.totalAnalyzed).toBe(0);
    });
  });

  describe('getAnalysisHistory', () => {
    it('should return analysis history', async () => {
      await analyzeWithAI({
        businessId: '123',
        data: { name: '테스트' },
        analysisType: 'quality',
      });

      const history = getAnalysisHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter by businessId', async () => {
      await analyzeWithAI({ businessId: 'aaa', data: {}, analysisType: 'quality' });
      await analyzeWithAI({ businessId: 'bbb', data: {}, analysisType: 'quality' });

      const history = getAnalysisHistory('aaa');
      history.forEach(h => expect(h.businessId).toBe('aaa'));
    });
  });

  describe('getAnalysisStats', () => {
    it('should return stats', () => {
      const stats = getAnalysisStats();
      expect(stats).toHaveProperty('totalAnalyses');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('providerDistribution');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('averageDuration');
    });
  });

  describe('generateAIAnalysisReport', () => {
    it('should generate report', async () => {
      const result = await analyzeWithAI({
        businessId: '123',
        data: { name: '테스트' },
        analysisType: 'quality',
      });

      const report = generateAIAnalysisReport(result);
      expect(typeof report).toBe('string');
      expect(report).toContain('AI 품질 분석 리포트');
      expect(report).toContain('123');
    });
  });
});
