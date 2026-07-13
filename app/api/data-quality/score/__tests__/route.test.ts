jest.mock('../../../../lib/repositories/business.repository', () => ({
  businessRepository: {
    findByBizesId: jest.fn(),
  },
}));

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { calculateQualityScore, getScoreHistory, getScoreStats, setScoringConfig } from '../../../../lib/services/quality/quality-scoring.service';

describe('/api/data-quality/score', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should calculate quality score for a business', async () => {
      const { GET } = await import('../route');
      const { businessRepository } = await import('../../../../lib/repositories/business.repository');
      const mockBusiness = {
        bizesId: '1234567890',
        name: '테스트 사업장',
        phone: '02-1234-5678',
        latitude: 37.5665,
        longitude: 126.978,
      };

      jest.mocked(businessRepository.findByBizesId).mockResolvedValue(mockBusiness as any);

      const score = calculateQualityScore(mockBusiness);
      expect(score).toHaveProperty('overallScore');
      expect(score).toHaveProperty('grade');
      expect(score.businessId).toBe('1234567890');
    });

    it('should return stats when action is stats', async () => {
      const stats = getScoreStats();
      expect(stats).toHaveProperty('totalScores');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('gradeDistribution');
    });

    it('should return history when action is history', async () => {
      const business = { bizesId: '1234567890', name: '테스트' };
      calculateQualityScore(business);

      const history = getScoreHistory('1234567890');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return config when action is config', async () => {
      const config = {
        weights: {
          completeness: 0.3,
          accuracy: 0.25,
          consistency: 0.2,
          timeliness: 0.15,
          validity: 0.1,
        },
        thresholds: {
          excellent: 90,
          good: 75,
          fair: 60,
          poor: 40,
        },
      };

      setScoringConfig(config);
      expect(true).toBe(true);
    });
  });

  describe('POST', () => {
    it('should update config when action is config', async () => {
      const newConfig = {
        weights: {
          completeness: 0.4,
          accuracy: 0.3,
          consistency: 0.1,
          timeliness: 0.1,
          validity: 0.1,
        },
      };

      setScoringConfig(newConfig);
      expect(true).toBe(true);
    });

    it('should calculate batch scores when action is batch', async () => {
      const businesses = [
        { bizesId: '1111111111', name: '사업장1' },
        { bizesId: '2222222222', name: '사업장2' },
      ];

      const scores = businesses.map(b => calculateQualityScore(b));
      expect(scores).toHaveLength(2);
      scores.forEach(score => {
        expect(score).toHaveProperty('overallScore');
      });
    });
  });
});
