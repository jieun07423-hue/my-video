import { Prisma } from '@prisma/client';
import { dbLogger } from '../logger';
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

export class BusinessRepository {
  async createMany(data: CreateBusinessInput[]) {
    dbLogger.info({ count: data.length }, '소상공인 대량 생성 시작');
    const result = await db.business.createMany({ data, skipDuplicates: true });
    dbLogger.info({ created: result.count }, '소상공인 대량 생성 완료');
    return result;
  }

  async upsertMany(data: CreateBusinessInput[]) {
    dbLogger.info({ count: data.length }, '소상공인 대량 upsert 시작');
    // Prisma는 upsertMany를 지원하지 않으므로 루프로 처리하거나 
    // 실제 프로덕션에서는 별도의 bulk upsert 로직을 구현해야 합니다.
    const results = await Promise.all(
      data.map(item => 
        db.business.upsert({
          where: { bizesId: item.bizesId },
          update: item,
          create: item,
        })
      )
    );
    dbLogger.info({ processed: results.length }, '소상공인 대량 upsert 완료');
    return results;
  }

  async findByBizesId(bizesId: string) {
    return await db.business.findUnique({ where: { bizesId } });
  }

  async search(options: SearchOptions) {
    const { search, status, recordStatus, businessCode, page = 1, limit = 20 } = options;

    // 실제 Prisma 쿼리 조건 생성
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
    return await db.business.update({
      where: { bizesId },
      data: { recordStatus: 'verified' },
    });
  }

  async markAsSynced(bizesId: string) {
    dbLogger.info({ bizesId }, '소상공인 동기화 처리');
    return await db.business.update({
      where: { bizesId },
      data: { recordStatus: 'synced' },
    });
  }

  async getStats() {
    const total = await db.business.count();
    const active = await db.business.count({ where: { status: 'active' } });
    const inactive = await db.business.count({ where: { status: 'inactive' } });
    const dissolved = await db.business.count({ where: { status: 'dissolved' } });
    
    return {
      total,
      active,
      inactive,
      dissolved,
    };
  }

  async getById(id: string) {
    return await db.business.findUnique({ where: { id } });
  }

  async update(id: string, data: Partial<CreateBusinessInput>) {
    dbLogger.info({ id }, '소상공인 정보 수정 시작');
    const result = await db.business.update({
      where: { id },
      data,
    });
    dbLogger.info({ id }, '소상공인 정보 수정 완료');
    return result;
  }

  async delete(id: string) {
    dbLogger.info({ id }, '소상공인 삭제 시작');
    const result = await db.business.delete({
      where: { id },
    });
    dbLogger.info({ id }, '소상공인 삭제 완료');
    return result;
  }

  async getDistinctBusinessCodes() {
    // Prisma groupBy 또는 distinct 사용
    const results = await db.business.findMany({
      distinct: ['businessCode'],
      select: { businessCode: true, businessName: true },
      where: { businessCode: { not: null } },
    });
    return results;
  }
}

export const businessRepository = new BusinessRepository();
