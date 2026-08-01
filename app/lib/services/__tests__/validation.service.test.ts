import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { validationService } from '../validation.service';

describe('ValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBusinessInput', () => {
    it('유효한 비즈니스 입력을 검증해야 함', () => {
      const validInput = {
        bizesId: '1234567890',
        name: '테스트 사업체',
        roadNameAddress: '서울시 강남구 테헤란로 123',
        lotNumberAddress: null,
        phone: '02-1234-5678',
        latitude: 37.5665,
        longitude: 126.9780,
        businessCode: '12345',
        businessName: '음식점업',
        indsLclsCd: 'I',
        indsLclsNm: '숙박 및 음식점업',
        indsMclsCd: '56',
        indsMclsNm: '음식점업',
        indsSclsCd: '561',
        indsSclsNm: '한식 음식점업',
        status: 'active' as const,
        recordStatus: 'new' as const,
        dataSource: 'public-data-portal',
      };

      const result = validationService.validateBusinessInput(validInput);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('필수 필드 누락 시 검증 실패해야 함', () => {
      const invalidInput = {
        name: '테스트 사업체',
      };

      const result = validationService.validateBusinessInput(invalidInput);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'bizesId')).toBe(true);
    });

    it('잘못된 전화번호 형식 시 검증 실패해야 함', () => {
      const invalidInput = {
        bizesId: '1234567890',
        name: '테스트 사업체',
        phone: 'invalid-phone',
        status: 'active' as const,
        recordStatus: 'new' as const,
        dataSource: 'test',
      };

      const result = validationService.validateBusinessInput(invalidInput);
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.field === 'phone')).toBe(true);
    });

    it('좌표가 한국 범위를 벗어날 때 경고해야 함', () => {
      const inputWithInvalidCoords = {
        bizesId: '1234567890',
        name: '테스트 사업체',
        latitude: 40, // 한국 위도 범위(33~38.6) 벗어남
        longitude: 135, // 한국 경도 범위(124.5~132) 벗어남
        status: 'active' as const,
        recordStatus: 'new' as const,
        dataSource: 'test',
      };

      const result = validationService.validateBusinessInput(inputWithInvalidCoords);
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.message.includes('위도가 한국 범위를 벗어납니다'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('경도가 한국 범위를 벗어납니다'))).toBe(true);
    });
  });

  describe('validateBatch', () => {
    it('배치 검증 시 유효/무효 항목을 분리해야 함', () => {
      const items = [
        {
          bizesId: '1',
          name: '유효한 사업체',
          status: 'active' as const,
          recordStatus: 'new' as const,
          dataSource: 'test',
        },
        {
          name: 'bizesId 누락',
          status: 'active' as const,
          recordStatus: 'new' as const,
          dataSource: 'test',
        },
      ];

      const result = validationService.validateBatch(items);
      expect(result.totalProcessed).toBe(2);
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(1);
      expect(result.validItems).toHaveLength(1);
      expect(result.invalidItems).toHaveLength(1);
    });
  });

  describe('sanitizeBusinessInput', () => {
    it('입력 데이터를 정리해야 함', () => {
      const input = {
        bizesId: '1234567890',
        name: '  테스트 사업체  ',
        roadNameAddress: '  서울시 강남구  ',
        phone: '02-1234-5678',
        status: 'active' as const,
        recordStatus: 'new' as const,
        dataSource: 'test',
      };

      const result = validationService.sanitizeBusinessInput(input);
      expect(result).toBeDefined();
      expect(result!.name).toBe('테스트 사업체');
      expect(result!.roadNameAddress).toBe('서울시 강남구');
    });
  });

  describe('사용자 정의 검증 규칙', () => {
    it('사용자 정의 규칙을 추가하고 실행해야 함', () => {
      const customErrors: any[] = [];
      validationService.addCustomRule('test-rule', (data: any) => {
        if (data.name === '금지된이름') {
          return [{ field: 'name', message: '금지된 이름입니다', code: 'FORBIDDEN_NAME' }];
        }
        return [];
      });

      const input = {
        bizesId: '1234567890',
        name: '금지된이름',
        status: 'active' as const,
        recordStatus: 'new' as const,
        dataSource: 'test',
      };

      const result = validationService.validateBusinessInput(input);
      expect(result.warnings.some(w => w.code === 'CUSTOM_VALIDATION_WARNING')).toBe(true);
    });
  });
});