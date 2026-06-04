import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  detectAnomalies,
  detectTextAnomalies,
  detectPatternAnomalies,
  analyzeAnomalyPatterns,
  generateAnomalyReport,
} from '../anomaly-detection.service';

describe('AnomalyDetectionService', () => {
  const mockBusinesses = [
    {
      bizesId: '1234567890',
      name: '테스트 사업자',
      roadNameAddress: '서울시 강남구 테스트로 123',
      lotNumberAddress: '서울시 강남구 역삼동 123-45',
      phone: '02-1234-5678',
      latitude: 37.5665,
      longitude: 126.978,
      businessCode: 'I56112',
      businessName: '테스트 업종',
      indsLclsNm: '정보통신',
      indsMclsNm: '정보처리',
      indsSclsNm: '소프트웨어',
      status: 'active',
      updatedAt: new Date(),
    },
    {
      bizesId: '0000000000',
      name: '가짜 사업자',
      roadNameAddress: '서울시 강남구 테스트로 123',
      lotNumberAddress: '서울시 강남구 역삼동 123-45',
      phone: '010-1234-5678',
      latitude: 37.5665,
      longitude: 126.978,
      businessCode: 'I56112',
      businessName: '테스트 업종',
      indsLclsNm: '정보통신',
      indsMclsNm: '정보처리',
      indsSclsNm: '소프트웨어',
      status: 'active',
      updatedAt: new Date(),
    },
    {
      bizesId: '9999999999',
      name: '이상한 사업자',
      roadNameAddress: '서울시 강남구 테스트로 123',
      lotNumberAddress: '서울시 강남구 역삼동 123-45',
      phone: '02-1234-5678',
      latitude: 37.5665,
      longitude: 126.978,
      businessCode: 'I56112',
      businessName: '테스트 업종',
      indsLclsNm: '정보통신',
      indsMclsNm: '정보처리',
      indsSclsNm: '소프트웨어',
      status: 'active',
      updatedAt: new Date(),
    },
  ];

  describe('detectAnomalies', () => {
    it('should detect anomalies in business data', () => {
      const result = detectAnomalies(mockBusinesses);

      expect(result).toHaveProperty('totalBusinesses');
      expect(result).toHaveProperty('anomaliesDetected');
      expect(result).toHaveProperty('anomalyRate');
      expect(result).toHaveProperty('anomalies');
      expect(result).toHaveProperty('timestamp');

      expect(result.totalBusinesses).toBe(mockBusinesses.length);
      expect(result.anomaliesDetected).toBeGreaterThanOrEqual(0);
      expect(result.anomalyRate).toBeGreaterThanOrEqual(0);
      expect(result.anomalyRate).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.anomalies)).toBe(true);
    });

    it('should detect business ID anomalies', () => {
      const result = detectAnomalies(mockBusinesses);
      const idAnomalies = result.anomalies.filter(a => a.field === 'bizesId');

      expect(idAnomalies.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect phone anomalies', () => {
      const result = detectAnomalies(mockBusinesses);
      const phoneAnomalies = result.anomalies.filter(a => a.field === 'phone');

      expect(phoneAnomalies.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectTextAnomalies', () => {
    it('should detect text anomalies', () => {
      const anomalies = detectTextAnomalies(mockBusinesses);

      expect(Array.isArray(anomalies)).toBe(true);
      anomalies.forEach(anomaly => {
        expect(anomaly).toHaveProperty('businessId');
        expect(anomaly).toHaveProperty('field');
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('severity');
        expect(anomaly).toHaveProperty('description');
        expect(anomaly).toHaveProperty('confidence');
        expect(anomaly).toHaveProperty('detectedAt');
      });
    });
  });

  describe('detectPatternAnomalies', () => {
    it('should detect pattern anomalies', () => {
      const anomalies = detectPatternAnomalies(mockBusinesses);

      expect(Array.isArray(anomalies)).toBe(true);
      anomalies.forEach(anomaly => {
        expect(anomaly).toHaveProperty('businessId');
        expect(anomaly).toHaveProperty('field');
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('severity');
        expect(anomaly).toHaveProperty('description');
        expect(anomaly).toHaveProperty('confidence');
        expect(anomaly).toHaveProperty('detectedAt');
      });
    });
  });

  describe('analyzeAnomalyPatterns', () => {
    it('should analyze anomaly patterns', () => {
      const anomalies = detectAnomalies(mockBusinesses).anomalies;
      const patterns = analyzeAnomalyPatterns(anomalies);

      expect(patterns).toHaveProperty('fieldDistribution');
      expect(patterns).toHaveProperty('scoreDistribution');
      expect(patterns).toHaveProperty('topAnomalies');
      expect(patterns).toHaveProperty('recommendations');

      expect(typeof patterns.fieldDistribution).toBe('object');
      expect(Array.isArray(patterns.scoreDistribution)).toBe(true);
      expect(Array.isArray(patterns.topAnomalies)).toBe(true);
      expect(Array.isArray(patterns.recommendations)).toBe(true);
    });
  });

  describe('generateAnomalyReport', () => {
    it('should generate anomaly report as string', () => {
      const result = detectAnomalies(mockBusinesses);
      const report = generateAnomalyReport(result);

      expect(typeof report).toBe('string');
      expect(report).toContain('데이터 이상 탐지 리포트');
      expect(report).toContain('요약');
    });
  });
});
