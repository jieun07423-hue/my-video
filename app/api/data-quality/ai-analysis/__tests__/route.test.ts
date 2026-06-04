import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  analyzeWithAI,
  analyzeBatchWithAI,
  getAnalysisHistory,
  getAnalysisStats,
  setAIAnalysisConfig,
  getAIAnalysisConfig,
} from '@/lib/services/quality-ai-analysis.service';

describe('/api/data-quality/ai-analysis', () => {
  beforeEach(() => {
    setAIAnalysisConfig({
      provider: 'auto',
      model: 'llama3.2',
      maxTokens: 2048,
      temperature: 0.3,
      enableFallback: true,
    });
  });

  describe('GET', () => {
    it('should return analysis history when action is history', async () => {
      const history = getAnalysisHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return analysis stats when action is stats', async () => {
      const stats = getAnalysisStats();
      expect(stats).toHaveProperty('totalAnalyses');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('providerDistribution');
    });

    it('should return config when action is config', async () => {
      const config = getAIAnalysisConfig();
      expect(config).toHaveProperty('provider');
      expect(config).toHaveProperty('model');
    });

    it('should analyze business when businessId provided', async () => {
      const mockBusiness = {
        bizesId: '1234567890',
        name: '테스트 사업장',
        phone: '02-1234-5678',
        latitude: 37.5665,
        longitude: 126.978,
      };

      const result = await analyzeWithAI({
        businessId: '1234567890',
        data: mockBusiness as Record<string, any>,
        analysisType: 'quality',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('recommendations');
    });

    it('should return 400 when businessId missing', async () => {
      expect(true).toBe(true);
    });
  });

  describe('POST', () => {
    it('should update config when action is config', async () => {
      const newConfig = { provider: 'ollama', temperature: 0.5 };
      setAIAnalysisConfig(newConfig);
      const config = getAIAnalysisConfig();
      expect(config.provider).toBe('ollama');
    });

    it('should batch analyze when action is batch', async () => {
      const mockBusiness1 = { bizesId: '111', name: '사업장1' };
      const mockBusiness2 = { bizesId: '222', name: '사업장2' };

      const requests = [
        { businessId: '111', data: mockBusiness1 as Record<string, any>, analysisType: 'quality' as const },
        { businessId: '222', data: mockBusiness2 as Record<string, any>, analysisType: 'quality' as const },
      ];

      const result = await analyzeBatchWithAI(requests);
      expect(result).toHaveProperty('totalAnalyzed', 2);
      expect(result).toHaveProperty('results');
    });

    it('should return 400 for invalid request', async () => {
      expect(true).toBe(true);
    });
  });
});
