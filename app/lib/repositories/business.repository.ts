import { Prisma } from '@prisma/client';
import { dbLogger } from '@/lib/logger';
import { validationService, ValidationResult } from '@/lib/services/validation.service';
import { eventPublisher } from '@/lib/services/event-publisher';
import { statisticService } from '@/lib/services/statistic.service';
import db from '@/lib/db';

export interface CreateBusinessInput {
  bizesId: string;
  name: string;
  roadNameAddress: string | null;
  lotNumberAddress: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  businessCode: string | null;
  businessName: string | null;
  indsLclsCd: string | null;
  indsLclsNm: string | null;
  indsMclsCd: string | null;
  indsMclsNm: string | null;
  indsSclsCd: string | null;
  indsSclsNm: string | null;
  status: 'pending' | 'active' | 'inactive' | 'dissolved' | 'pending_renewal';
  recordStatus: 'new' | 'synced' | 'verified';
  dataSource: string;
}

export interface SearchOptions {
  search?: string;
  status?: 'pending' | 'active' | 'inactive' | 'dissolved' | 'pending_renewal';
  recordStatus?: 'new' | 'synced' | 'verified';
  businessCode?: string;
  page?: number;
  limit?: number;
}

export interface BatchCreateResult {
  created: CreateBusinessInput[];
  skipped: CreateBusinessInput[];
  errors: Array<{ input: CreateBusinessInput; errors: string[] }>;
  totalProcessed: number;
  createdCount: number;
  skippedCount: number;
  errorCount: number;
}

export class BusinessRepository {
  private async validateAndSanitize(input: CreateBusinessInput): Promise<ValidationResult<CreateBusinessInput>> {
    return validationService.validateBusinessInput(input);
  }

  async createMany(data: CreateBusinessInput[], options: { validate?: boolean; sanitize?: boolean } = {}): Promise<BatchCreateResult> {
    const { validate = true, sanitize = true } = options;
    dbLogger.info({ count: data.length }, '소상공인 대량 생성 시작');

    const created: CreateBusinessInput[] = [];
    const skipped: CreateBusinessInput[] = [];
    const errors: Array<{ input: CreateBusinessInput; errors: string[] }> = [];

    for (const input of data) {
      let validatedInput = input;

      if (validate) {
        const validation = await this.validateAndSanitize(input);
        if (!validation.success) {
          errors.push({ input, errors: validation.errors.map(e => e.message) });
          continue;
        }
        validatedInput = validation.data!;
        if (sanitize && validation.warnings.length > 0) {
          dbLogger.warn({ input: input.bizesId, warnings: validation.warnings }, '검증 경고 발생');
        }
      }

      if (sanitize) {
        validatedInput = validationService.sanitizeBusinessInput(validatedInput) || validatedInput;
      }

      try {
        const existing = await db.business.findUnique({ where: { bizesId: validatedInput.bizesId } });
        if (existing) {
          skipped.push(validatedInput);
          continue;
        }

        await db.business.create({ data: validatedInput });
        created.push(validatedInput);
        
        await eventPublisher.publishBusinessCreated(validatedInput.bizesId, validatedInput.name);
        await statisticService.recordBusinessMetric('created', 1);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ input: validatedInput, errors: [errorMsg] });
        dbLogger.error({ bizesId: validatedInput.bizesId, error: errorMsg }, '비즈니스 생성 실패');
      }
    }

    const result: BatchCreateResult = {
      created,
      skipped,
      errors,
      totalProcessed: data.length,
      createdCount: created.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
    };

    dbLogger.info({ created: created.length, skipped: skipped.length, errors: errors.length }, '소상공인 대량 생성 완료');
    return result;
  }

  async upsertMany(data: CreateBusinessInput[], options: { validate?: boolean; sanitize?: boolean; skipValidationOnUpdate?: boolean } = {}): Promise<BatchCreateResult> {
    const { validate = true, sanitize = true, skipValidationOnUpdate = false } = options;
    dbLogger.info({ count: data.length }, '소상공인 대량 upsert 시작');

    const created: CreateBusinessInput[] = [];
    const skipped: CreateBusinessInput[] = [];
    const errors: Array<{ input: CreateBusinessInput; errors: string[] }> = [];

    for (const input of data) {
      let validatedInput = input;

      if (validate) {
        const validation = await this.validateAndSanitize(input);
        if (!validation.success) {
          errors.push({ input, errors: validation.errors.map(e => e.message) });
          continue;
        }
        validatedInput = validation.data!;
      }

      if (sanitize) {
        validatedInput = validationService.sanitizeBusinessInput(validatedInput) || validatedInput;
      }

      try {
        const existing = await db.business.findUnique({ where: { bizesId: validatedInput.bizesId } });
        
        if (existing) {
          const changes: Record<string, { from: unknown; to: unknown }> = {};
          for (const key of Object.keys(validatedInput) as Array<keyof CreateBusinessInput>) {
            if (validatedInput[key] !== existing[key]) {
              changes[key] = { from: existing[key], to: validatedInput[key] };
            }
          }

          await db.business.update({
            where: { bizesId: validatedInput.bizesId },
            data: validatedInput,
          });

          if (Object.keys(changes).length > 0) {
            await eventPublisher.publishBusinessUpdated(validatedInput.bizesId, validatedInput.name, changes);
          }
          skipped.push(validatedInput);
        } else {
          await db.business.create({ data: validatedInput });
          created.push(validatedInput);
          await eventPublisher.publishBusinessCreated(validatedInput.bizesId, validatedInput.name);
        }

        await statisticService.recordBusinessMetric(existing ? 'updated' : 'created', 1);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ input: validatedInput, errors: [errorMsg] });
        dbLogger.error({ bizesId: validatedInput.bizesId, error: errorMsg }, '비즈니스 upsert 실패');
      }
    }

    const result: BatchCreateResult = {
      created,
      skipped,
      errors,
      totalProcessed: data.length,
      createdCount: created.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
    };

    dbLogger.info({ created: created.length, updated: skipped.length, errors: errors.length }, '소상공인 대량 upsert 완료');
    return result;
  }

  async findByBizesId(bizesId: string) {
    return await db.business.findUnique({ where: { bizesId } });
  }

  async search(options: SearchOptions) {
    const { search, status, recordStatus, businessCode, page = 1, limit = 20 } = options;

    const where: Prisma.BusinessWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { roadNameAddress: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (recordStatus) where.recordStatus = recordStatus;
    if (businessCode) where.businessCode = businessCode;

    const [items, total] = await Promise.all([
      db.business.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.business.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findNewBusinesses(limit: number = 50) {
    return await db.business.findMany({
      where: { recordStatus: 'new' },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsVerified(bizesId: string) {
    dbLogger.info({ bizesId }, '소상공인 검증 처리');
    const business = await db.business.update({
      where: { bizesId },
      data: { recordStatus: 'verified' },
    });
    await eventPublisher.publishBusinessVerified(bizesId, business.name);
    await statisticService.recordBusinessMetric('verified', 1);
    return business;
  }

  async markAsSynced(bizesId: string) {
    dbLogger.info({ bizesId }, '소상공인 동기화 처리');
    const business = await db.business.update({
      where: { bizesId },
      data: { recordStatus: 'synced' },
    });
    await statisticService.recordBusinessMetric('updated', 1);
    return business;
  }

  async getStats() {
    const total = await db.business.count();
    const active = await db.business.count({ where: { status: 'active' } });
    const inactive = await db.business.count({ where: { status: 'inactive' } });
    const dissolved = await db.business.count({ where: { status: 'dissolved' } });
    const newToday = await db.business.count({ where: { recordStatus: 'new' } });
    const newRecords = await db.business.count({ where: { recordStatus: 'synced' } });
    
    return {
      total,
      active,
      inactive,
      dissolved,
      newToday,
      newRecords,
    };
  }

  async getById(id: string) {
    return await db.business.findUnique({ where: { id } });
  }

  async update(id: string, data: Partial<CreateBusinessInput>) {
    dbLogger.info({ id }, '소상공인 정보 수정 시작');
    const existing = await db.business.findUnique({ where: { id } });
    const result = await db.business.update({
      where: { id },
      data,
    });
    dbLogger.info({ id }, '소상공인 정보 수정 완료');

    if (existing) {
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of Object.keys(data) as Array<keyof CreateBusinessInput>) {
        if (data[key] !== undefined && existing[key] !== data[key]) {
          changes[key] = { from: existing[key], to: data[key] };
        }
      }
      if (Object.keys(changes).length > 0) {
        await eventPublisher.publishBusinessUpdated(result.bizesId, result.name, changes);
      }
    }

    await statisticService.recordBusinessMetric('updated', 1);
    return result;
  }

  async delete(id: string) {
    dbLogger.info({ id }, '소상공인 삭제 시작');
    const existing = await db.business.findUnique({ where: { id } });
    const result = await db.business.delete({
      where: { id },
    });
    dbLogger.info({ id }, '소상공인 삭제 완료');

    if (existing) {
      await eventPublisher.publishBusinessDeleted(existing.bizesId);
      await statisticService.recordBusinessMetric('deleted', 1);
    }

    return result;
  }

  async getDistinctBusinessCodes() {
    const results = await db.business.findMany({
      distinct: ['businessCode'],
      select: { businessCode: true, businessName: true },
      where: { businessCode: { not: null } },
    });
    return results;
  }

  async bulkUpdateStatus(bizesIds: string[], status: CreateBusinessInput['status']): Promise<number> {
    const result = await db.business.updateMany({
      where: { bizesId: { in: bizesIds } },
      data: { status },
    });
    dbLogger.info({ count: result.count, status }, '소상공인 상태 대량 변경');
    return result.count;
  }

  async bulkUpdateRecordStatus(bizesIds: string[], recordStatus: CreateBusinessInput['recordStatus']): Promise<number> {
    const result = await db.business.updateMany({
      where: { bizesId: { in: bizesIds } },
      data: { recordStatus },
    });
    dbLogger.info({ count: result.count, recordStatus }, '소상공인 레코드 상태 대량 변경');
    return result.count;
  }
}

export const businessRepository = new BusinessRepository();