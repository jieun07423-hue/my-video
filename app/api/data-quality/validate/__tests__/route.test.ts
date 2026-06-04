import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

jest.mock('@/lib/services/business-validation.service', () => ({
  validateBusinessRegistration: jest.fn(),
  batchValidateBusinesses: jest.fn(),
  formatBizesId: jest.fn((id) => id),
}));

jest.mock('@/lib/logger', () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/data-quality/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('bizesId 파라미터가 없으면 400 에러를 반환해야 한다', async () => {
      const request = { url: 'http://localhost:3000/api/data-quality/validate' } as NextRequest;
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('bizesId 파라미터가 필요합니다');
    });

    it('bizesId가 있으면 검증 결과를 반환해야 한다', async () => {
      const { validateBusinessRegistration } = await import('@/lib/services/business-validation.service');
      jest.mocked(validateBusinessRegistration).mockResolvedValue({
        isValid: true,
        bizesId: '1234567890',
        validatedAt: new Date(),
      });

      const request = {
        url: 'http://localhost:3000/api/data-quality/validate?bizesId=1234567890',
      } as NextRequest;

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isValid).toBe(true);
    });
  });

  describe('POST', () => {
    it('bizesIds 배열이 없으면 400 에러를 반환해야 한다', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({}),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('bizesIds 배열이 필요합니다');
    });

    it('빈 배열을 전달하면 400 에러를 반환해야 한다', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({ bizesIds: [] }),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('bizesIds 배열이 필요합니다');
    });

    it('50건 초과하면 400 에러를 반환해야 한다', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({ bizesIds: Array(51).fill('1234567890') }),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('최대 50건');
    });
  });
});
