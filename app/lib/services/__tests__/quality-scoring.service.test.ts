import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  calculateQualityScore,
  calculateQualityScoreBatch,
  getScoreHistory,
  getScoreStats,
  generateScoreReport,
  setScoringConfig,
  getScoringConfig,
} from '../quality/quality-scoring.service';

describe('QualityScoringService', () => {
  beforeEach(() => {
    setScoringConfig({
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
    });
  });

  describe('calculateQualityScore', () => {
    it('should calculate quality score for a valid business', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업장',
        phone: '02-1234-5678',
        latitude: 37.5665,
        longitude: 126.978,
        roadNameAddress: '서울시 강남구 테헤란로 123',
        businessCode: 'I56112',
        indsLclsNm: '음식점',
        status: 'active',
        updatedAt: new Date().toISOString(),
      };

      const score = calculateQualityScore(business);

      expect(score).toHaveProperty('id');
      expect(score).toHaveProperty('businessId', '1234567890');
      expect(score).toHaveProperty('overallScore');
      expect(score).toHaveProperty('grade');
      expect(score).toHaveProperty('dimensions');
      expect(score).toHaveProperty('calculatedAt');
      expect(score).toHaveProperty('validUntil');

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(score.grade);
      expect(score.dimensions.length).toBe(5);

      score.dimensions.forEach(dim => {
        expect(dim).toHaveProperty('name');
        expect(dim).toHaveProperty('score');
        expect(dim).toHaveProperty('weight');
        expect(dim).toHaveProperty('weightedScore');
        expect(dim).toHaveProperty('details');
        expect(dim.score).toBeGreaterThanOrEqual(0);
        expect(dim.score).toBeLessThanOrEqual(100);
      });
    });

    it('should give lower score for incomplete data', () => {
      const completeBusiness = {
        bizesId: '1234567890',
        name: '완전한 사업장',
        phone: '02-1234-5678',
        latitude: 37.5665,
        longitude: 126.978,
        roadNameAddress: '서울시 강남구 테헤란로 123',
        businessCode: 'I56112',
        indsLclsNm: '음식점',
      };

      const incompleteBusiness = {
        bizesId: '1234567890',
        name: '',
      };

      const completeScore = calculateQualityScore(completeBusiness);
      const incompleteScore = calculateQualityScore(incompleteBusiness);

      expect(completeScore.overallScore).toBeGreaterThan(incompleteScore.overallScore);
    });

    it('should handle missing optional fields', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업장',
      };

      const score = calculateQualityScore(business);
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateQualityScoreBatch', () => {
    it('should calculate scores for multiple businesses', () => {
      const businesses = [
        { bizesId: '1111111111', name: '사업장1', phone: '02-1111-1111' },
        { bizesId: '2222222222', name: '사업장2' },
        { bizesId: '3333333333', name: '사업장3', latitude: 37.5, longitude: 127.0 },
      ];

      const scores = calculateQualityScoreBatch(businesses);

      expect(scores).toHaveLength(3);
      scores.forEach(score => {
        expect(score).toHaveProperty('overallScore');
        expect(score).toHaveProperty('grade');
      });
    });

    it('should handle empty array', () => {
      const scores = calculateQualityScoreBatch([]);
      expect(scores).toHaveLength(0);
    });
  });

  describe('getScoreHistory', () => {
    it('should return score history', () => {
      const business = { bizesId: '1234567890', name: '테스트' };
      calculateQualityScore(business);

      const history = getScoreHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter by businessId', () => {
      const business1 = { bizesId: '1111111111', name: '사업장1' };
      const business2 = { bizesId: '2222222222', name: '사업장2' };
      calculateQualityScore(business1);
      calculateQualityScore(business2);

      const history = getScoreHistory('1111111111');
      history.forEach(h => {
        expect(h.businessId).toBe('1111111111');
      });
    });
  });

  describe('getScoreStats', () => {
    it('should return score statistics', () => {
      const stats = getScoreStats();

      expect(stats).toHaveProperty('totalScores');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('gradeDistribution');
      expect(stats).toHaveProperty('averageByDimension');
      expect(typeof stats.totalScores).toBe('number');
      expect(typeof stats.averageScore).toBe('number');
    });
  });

  describe('generateScoreReport', () => {
    it('should generate a readable report', () => {
      const business = {
        bizesId: '1234567890',
        name: '테스트 사업장',
        phone: '02-1234-5678',
      };

      const score = calculateQualityScore(business);
      const report = generateScoreReport(score);

      expect(typeof report).toBe('string');
      expect(report).toContain('품질 점수 리포트');
      expect(report).toContain(score.businessId);
      expect(report).toContain(`${score.overallScore}점`);
    });
  });

  describe('config management', () => {
    it('should update and retrieve config', () => {
      setScoringConfig({
        weights: {
          completeness: 0.4,
          accuracy: 0.3,
          consistency: 0.1,
          timeliness: 0.1,
          validity: 0.1,
        },
      });

      const config = getScoringConfig();
      expect(config.weights.completeness).toBe(0.4);
      expect(config.weights.accuracy).toBe(0.3);
    });
  });
});
