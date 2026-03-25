import { dbLogger } from '@/lib/logger';
import type { CreateBusinessInput } from '@/lib/repositories/business.repository';

const USE_REAL_DB = !!process.env.DATABASE_URL;

interface MockBusinessDelegate {
  createMany: (data: { data: CreateBusinessInput[] }) => Promise<{ count: number }>;
  findMany: () => Promise<unknown[]>;
  findUnique: (args: { where: { id?: string; bizesId?: string } }) => Promise<unknown | null>;
  count: (args?: { where?: unknown }) => Promise<number>;
  upsert: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
}

interface MockSyncStateDelegate {
  findUnique: (args: { where: { dataSource?: string } }) => Promise<unknown | null>;
  update: (args: unknown) => Promise<unknown>;
}

interface MockAuditLogDelegate {
  create: (args: unknown) => Promise<unknown>;
  findMany: (args?: unknown) => Promise<unknown[]>;
}

interface MockAdminDelegate {
  findUnique: (args: { where: { id?: string; email?: string } }) => Promise<unknown | null>;
}

interface DbDelegate {
  business: MockBusinessDelegate;
  syncState: MockSyncStateDelegate;
  auditLog: MockAuditLogDelegate;
  admin: MockAdminDelegate;
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
}

let db: DbDelegate;
let testConnectionFn: () => Promise<boolean>;
let disconnectDatabaseFn: () => Promise<void>;
let staticBusinessRepo: unknown = null;
let staticSyncStateRepo: unknown = null;

if (USE_REAL_DB) {
  const { PrismaClient } = await import('@prisma/client');

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  prisma.$connect().catch((error: Error) => {
    dbLogger.error({ error: error.message }, '데이터베이스 연결 실패');
  });

  db = {
    business: prisma.business,
    syncState: prisma.syncState,
    auditLog: prisma.auditLog,
    admin: prisma.admin,
    $connect: () => prisma.$connect(),
    $disconnect: () => prisma.$disconnect(),
  };

  testConnectionFn = async () => {
    try {
      await prisma.$connect();
      return true;
    } catch (error) {
      dbLogger.error({ error: error instanceof Error ? error.message : String(error) }, '데이터베이스 연결 테스트 실패');
      return false;
    }
  };

  disconnectDatabaseFn = async () => {
    await prisma.$disconnect();
  };
} else {
  const { staticBusinessRepository, staticSyncStateRepository } = await import('@/lib/db-static');
  staticBusinessRepo = staticBusinessRepository;
  staticSyncStateRepo = staticSyncStateRepository;

  const mockBusinessData = [
    {
      id: '1',
      bizesId: 'TEST001',
      name: '테스트 상가 1',
      roadNameAddress: '서울시 강남구 테헤란로 123',
      lotNumberAddress: '서울시 강남구 역삼동 123-45',
      phone: '02-123-4567',
      latitude: 37.5172,
      longitude: 127.0473,
      businessCode: '12345',
      businessName: '카페',
      status: 'active' as const,
      recordStatus: 'new' as const,
      indsLclsCd: 'I',
      indsLclsNm: '음식',
      indsMclsCd: 'I12',
      indsMclsNm: '커피',
      indsSclsCd: 'I12A',
      indsSclsNm: '카페',
      dataSource: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncedAt: new Date(),
    },
    {
      id: '2',
      bizesId: 'TEST002',
      name: '테스트 상가 2',
      roadNameAddress: '서울시 서초구 강남대로 456',
      lotNumberAddress: '서울시 서초구 서초동 456-78',
      phone: '02-987-6543',
      latitude: 37.4847,
      longitude: 127.0323,
      businessCode: '54321',
      businessName: '식당',
      status: 'pending' as const,
      recordStatus: 'synced' as const,
      indsLclsCd: 'I',
      indsLclsNm: '음식',
      indsMclsCd: 'I11',
      indsMclsNm: '한식',
      indsSclsCd: 'I11A',
      indsSclsNm: '일반한식',
      dataSource: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncedAt: new Date(),
    },
  ];

  db = {
    business: {
      createMany: async (data: { data: CreateBusinessInput[] }) => {
        dbLogger.info({ count: data.data.length }, 'Mock: 비즈니즈 대량 생성');
        return { count: data.data.length };
      },
      findMany: async () => mockBusinessData,
      findUnique: async (args: { where: { id?: string; bizesId?: string } }) => {
        if (args.where.id) return mockBusinessData.find(b => b.id === args.where.id) || null;
        if (args.where.bizesId) return mockBusinessData.find(b => b.bizesId === args.where.bizesId) || null;
        return null;
      },
      count: async () => mockBusinessData.length,
      upsert: async () => ({ id: 'mock-upsert' }),
      update: async () => ({ id: 'mock-update' }),
    },
    syncState: {
      findUnique: async () => null,
      update: async () => ({ id: 'mock-sync-update' }),
    },
    auditLog: {
      create: async () => ({ id: 'mock-audit' }),
      findMany: async () => [],
    },
    admin: {
      findUnique: async () => null,
    },
    $connect: async () => {},
    $disconnect: async () => {},
  };

  testConnectionFn = async () => {
    dbLogger.info('정적 데이터베이스 모드 사용 중');
    return true;
  };

  disconnectDatabaseFn = async () => {};
}

export default db;
export const testConnection = testConnectionFn;
export const disconnectDatabase = disconnectDatabaseFn;
export const staticBusinessRepository = staticBusinessRepo;
export const staticSyncStateRepository = staticSyncStateRepo;