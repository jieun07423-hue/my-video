import { z } from 'zod';
import { dbLogger, syncLogger } from '@/lib/logger';
import type { CreateBusinessInput } from '@/lib/repositories/business.repository';

export const BusinessInputSchema = z.object({
  bizesId: z.string().min(1, '사업자등록번호는 필수입니다'),
  name: z.string().min(1, '상호명은 필수입니다').max(200, '상호명은 200자 이하여야 합니다'),
  roadNameAddress: z.string().max(500).nullable().optional(),
  lotNumberAddress: z.string().max(500).nullable().optional(),
  phone: z.string().regex(/^[\d\-+\s()]{0,20}$/, '전화번호 형식이 올바르지 않습니다').nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  businessCode: z.string().max(20).nullable().optional(),
  businessName: z.string().max(100).nullable().optional(),
  indsLclsCd: z.string().max(10).nullable().optional(),
  indsLclsNm: z.string().max(100).nullable().optional(),
  indsMclsCd: z.string().max(10).nullable().optional(),
  indsMclsNm: z.string().max(100).nullable().optional(),
  indsSclsCd: z.string().max(10).nullable().optional(),
  indsSclsNm: z.string().max(100).nullable().optional(),
  status: z.enum(['pending', 'active', 'inactive', 'dissolved', 'pending_renewal']),
  recordStatus: z.enum(['new', 'synced', 'verified']),
  dataSource: z.string().min(1, '데이터 출처는 필수입니다').max(50),
});

export const SyncOptionsSchema = z.object({
  serviceKey: z.string().min(1, '서비스 키는 필수입니다'),
  pageSize: z.number().int().min(1).max(1000).default(100),
  maxPages: z.number().int().min(1).max(1000).default(100),
  force: z.boolean().default(false),
});

export const SearchOptionsSchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(['pending', 'active', 'inactive', 'dissolved', 'pending_renewal']).optional(),
  recordStatus: z.enum(['new', 'synced', 'verified']).optional(),
  businessCode: z.string().max(20).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface BatchValidationResult {
  validItems: CreateBusinessInput[];
  invalidItems: Array<{ item: unknown; errors: ValidationError[] }>;
  totalProcessed: number;
  validCount: number;
  invalidCount: number;
  warnings: ValidationWarning[];
}

export class ValidationService {
  private customRules: Map<string, (data: unknown) => ValidationError[]> = new Map();

  validateBusinessInput(data: unknown): ValidationResult<CreateBusinessInput> {
    const result = BusinessInputSchema.safeParse(data);
    
    if (!result.success) {
      const errors: ValidationError[] = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
        value: this.getValueAtPath(data, err.path as (string | number)[]),
      }));
      
      dbLogger.warn({ errors: errors.length }, '비즈니스 입력 검증 실패');
      return { success: false, errors, warnings: [] };
    }

    const warnings = this.runCustomValidations(result.data as CreateBusinessInput);
    dbLogger.debug({ warnings: warnings.length }, '비즈니스 입력 검증 완료');
    return { success: true, data: result.data as CreateBusinessInput, errors: [], warnings };
  }

  validateSyncOptions(data: unknown) {
    const result = SyncOptionsSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        errors: result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      };
    }
    return { success: true, data: result.data };
  }

  validateSearchOptions(data: unknown) {
    const result = SearchOptionsSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        errors: result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      };
    }
    return { success: true, data: result.data };
  }

  validateBatch(items: unknown[]): BatchValidationResult {
    const validItems: CreateBusinessInput[] = [];
    const invalidItems: Array<{ item: unknown; errors: ValidationError[] }> = [];
    const allWarnings: ValidationWarning[] = [];

    for (const item of items) {
      const result = this.validateBusinessInput(item);
      if (result.success && result.data) {
        validItems.push(result.data);
        allWarnings.push(...result.warnings);
      } else {
        invalidItems.push({ item, errors: result.errors });
      }
    }

    syncLogger.info(
      { 
        total: items.length, 
        valid: validItems.length, 
        invalid: invalidItems.length 
      },
      '배치 검증 완료'
    );

    return {
      validItems,
      invalidItems,
      totalProcessed: items.length,
      validCount: validItems.length,
      invalidCount: invalidItems.length,
      warnings: allWarnings,
    };
  }

  addCustomRule(name: string, validator: (data: unknown) => ValidationError[]) {
    this.customRules.set(name, validator);
  }

  removeCustomRule(name: string) {
    this.customRules.delete(name);
  }

  recordValidationError(error: ValidationError): void {
    dbLogger.warn({ field: error.field, code: error.code, value: error.value }, '유효성 검증 오류 기록');
  }

  private runCustomValidations(data: CreateBusinessInput): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    for (const [ruleName, validator] of this.customRules.entries()) {
      try {
        const errors = validator(data);
        for (const error of errors) {
          warnings.push({
            field: error.field,
            message: `[${ruleName}] ${error.message}`,
            code: 'CUSTOM_VALIDATION_WARNING',
            value: error.value,
          });
        }
      } catch (error) {
        syncLogger.error({ ruleName, error }, '사용자 정의 검증 규칙 실행 실패');
      }
    }

    return warnings;
  }

  private getValueAtPath(obj: unknown, path: (string | number)[]): unknown {
    let current: unknown = obj;
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    return current;
  }

  sanitizeBusinessInput(data: unknown): CreateBusinessInput | null {
    const result = this.validateBusinessInput(data);
    if (result.success && result.data) {
      return this.cleanData(result.data);
    }
    return null;
  }

  private cleanData(data: CreateBusinessInput): CreateBusinessInput {
    return {
      ...data,
      name: data.name.trim(),
      roadNameAddress: data.roadNameAddress?.trim() || null,
      lotNumberAddress: data.lotNumberAddress?.trim() || null,
      phone: data.phone?.replace(/[^\d\-+\s()]/g, '') || null,
      businessName: data.businessName?.trim() || null,
      indsLclsNm: data.indsLclsNm?.trim() || null,
      indsMclsNm: data.indsMclsNm?.trim() || null,
      indsSclsNm: data.indsSclsNm?.trim() || null,
    };
  }
}

export const validationService = new ValidationService();

validationService.addCustomRule('phone-format', (data: unknown) => {
  const input = data as CreateBusinessInput;
  const errors: ValidationError[] = [];
  
  if (input.phone && !/^(\+?82|0)(1[0-9]|2|[3-6][1-5]|70)[-\s]?\d{3,4}[-\s]?\d{4}$/.test(input.phone.replace(/\s/g, ''))) {
    errors.push({
      field: 'phone',
      message: '한국 전화번호 형식이 아닙니다',
      code: 'INVALID_PHONE_FORMAT',
      value: input.phone,
    });
  }
  return errors;
});

validationService.addCustomRule('address-consistency', (data: unknown) => {
  const input = data as CreateBusinessInput;
  const errors: ValidationError[] = [];
  
  if (input.roadNameAddress && input.lotNumberAddress) {
    const roadNorm = input.roadNameAddress.replace(/\s+/g, '').toLowerCase();
    const lotNorm = input.lotNumberAddress.replace(/\s+/g, '').toLowerCase();
    if (roadNorm === lotNorm) {
      errors.push({
        field: 'address',
        message: '도로명 주소와 지번 주소가 동일합니다',
        code: 'DUPLICATE_ADDRESS',
        value: { road: input.roadNameAddress, lot: input.lotNumberAddress },
      });
    }
  }
  return errors;
});

validationService.addCustomRule('coordinate-range', (data: unknown) => {
  const input = data as CreateBusinessInput;
  const errors: ValidationError[] = [];
  
  if (input.latitude !== null && input.longitude !== null) {
    if (input.latitude < 33 || input.latitude > 38.6) {
      errors.push({
        field: 'latitude',
        message: '위도가 한국 범위를 벗어납니다',
        code: 'LATITUDE_OUT_OF_KOREA',
        value: input.latitude,
      });
    }
    if (input.longitude < 124.5 || input.longitude > 132) {
      errors.push({
        field: 'longitude',
        message: '경도가 한국 범위를 벗어납니다',
        code: 'LONGITUDE_OUT_OF_KOREA',
        value: input.longitude,
      });
    }
  }
  return errors;
});