import { dbLogger } from '@/app/lib/logger';
import type { CreateBusinessInput, SearchOptions } from '@/app/lib/repositories/business.repository';

const USE_REAL_DB = !!process.env.DATABASE_URL;

if (USE_REAL_DB) {
  const { PrismaClient } = require('@/app/generated/prisma');

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  prisma.$connect().catch((error: Error) => {
    dbLogger.error({ error: error.message }, '데이터베이스 연결 실패');
  });

  const db = {
    business: prisma.business,
    syncState: prisma.syncState,
    auditLog: prisma.auditLog,
    admin: prisma.admin,
    $connect: () => prisma.$connect(),
    $disconnect: () => prisma.$disconnect(),
  };

  module.exports = db;
  module.exports.testConnection = async () => {
    try {
      await prisma.$connect();
      return true;
    } catch (error) {
      dbLogger.error({ error: error instanceof Error ? error.message : String(error) }, '데이터베이스 연결 테스트 실패');
      return false;
    }
  };
  module.exports.disconnectDatabase = async () => {
    await prisma.$disconnect();
  };
  module.exports.staticBusinessRepository = null;
  module.exports.staticSyncStateRepository = null;
} else {
  const { staticBusinessRepository, staticSyncStateRepository } = require('@/app/lib/db-static');

  const db = {
    business: {
      createMany: (data: { data: CreateBusinessInput[] }) => staticBusinessRepository.createMany(data.data),
      findMany: () => Promise.resolve([]),
      findUnique: () => Promise.resolve(null),
      count: () => Promise.resolve(0),
      upsert: () => Promise.resolve({ id: 'mock' }),
      update: () => Promise.resolve({ id: 'mock' }),
    },
    syncState: {
      findUnique: () => Promise.resolve(null),
      update: () => Promise.resolve({ id: 'mock' }),
    },
    auditLog: {
      create: () => Promise.resolve({ id: 'mock' }),
      findMany: () => Promise.resolve([]),
    },
    admin: {
      findUnique: () => Promise.resolve(null),
    },
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
  };

  module.exports = db;
  module.exports.testConnection = async () => {
    dbLogger.info('정적 데이터베이스 모드 사용 중');
    return true;
  };
  module.exports.disconnectDatabase = async () => {};
  module.exports.staticBusinessRepository = staticBusinessRepository;
  module.exports.staticSyncStateRepository = staticSyncStateRepository;
}

export default module.exports;
