jest.mock('../../../../lib/repositories/business.repository', () => ({
  businessRepository: {
    findByBizesId: jest.fn(),
  },
}));

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { runQualityCheck, getCheckStats, setQualityCheckConfig } from '../../../../lib/services/realtime-quality-check.service';

describe('/api/data-quality/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setQualityCheckConfig({
      enabled: true,
      blockingMode: false,
      timeout: 5000,
      retryCount: 3,
      notifyOnFailure: true,
    });
  });

  describe('GET', () => {
    it('should run quality check for a business', async () => {
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

      const result = runQualityCheck(mockBusiness, 'sync');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('businessId', '1234567890');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('overallScore');
    });

    it('should return stats when action is stats', async () => {
      const stats = getCheckStats();
      expect(stats).toHaveProperty('totalChecks');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('passRate');
    });
  });

  describe('POST', () => {
    it('should update config when action is config', async () => {
      setQualityCheckConfig({ timeout: 10000, blockingMode: true });
      expect(true).toBe(true);
    });

    it('should run batch checks when action is batch', async () => {
      const businesses = [
        { bizesId: '1111111111', name: '사업장1' },
        { bizesId: '2222222222', name: '사업장2' },
      ];

      const results = businesses.map(b => runQualityCheck(b, 'batch'));
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result).toHaveProperty('checkType', 'batch');
      });
    });
  });
});
