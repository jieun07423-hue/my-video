import { PrismaClient } from '@prisma/client';
import { dbLogger } from '@/lib/logger';
import type { CreateBusinessInput } from '@/lib/repositories/business.repository';

const USE_REAL_DB = !!process.env.DATABASE_URL;

const mockBusinessData: any[] = [];
const mockAdCampaigns: any[] = [];
const mockAdCopies: any[] = [];
const mockSeoulPermits: any[] = [];
const mockSyncStates: any[] = [];

let db: any;

if (USE_REAL_DB) {
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
    adCampaign: prisma.adCampaign,
    adCopy: prisma.adCopy,
    seoulPermit: prisma.seoulPermit,
    $connect: () => prisma.$connect(),
    $disconnect: () => prisma.$disconnect(),
  };
} else {
  db = {
    business: {
      createMany: async (args: { data: CreateBusinessInput[] }) => {
        dbLogger.info({ count: args.data.length }, 'Mock: 비즈니스 대량 생성');
        args.data.forEach(item => mockBusinessData.push({ ...item, id: item.bizesId }));
        return { count: args.data.length };
      },
      findMany: async (args: any) => mockBusinessData,
      findUnique: async (args: { where: { id?: string; bizesId?: string } }) => {
        if (args.where.id) return mockBusinessData.find((b: any) => b.id === args.where.id) || null;
        if (args.where.bizesId) return mockBusinessData.find((b: any) => b.bizesId === args.where.bizesId) || null;
        return null;
      },
      count: async (args: any) => mockBusinessData.length,
      upsert: async (args: any) => ({ id: 'mock-upsert', ...args.create.data }),
      update: async (args: any) => ({ id: args.where.id, ...args.data }),
      delete: async (args: any) => ({ id: args.where.id }),
    },
    syncState: {
      findUnique: async (args: any) => {
        const dataSource = args.where?.dataSource || 'public-data-portal';
        const state = mockSyncStates.find((s: any) => s.dataSource === dataSource);
        return state || { id: '1', dataSource, syncStatus: 'idle' };
      },
      update: async (args: any) => {
        const dataSource = args.where?.dataSource || 'public-data-portal';
        const index = mockSyncStates.findIndex((s: any) => s.dataSource === dataSource);
        const currentState = index !== -1 ? mockSyncStates[index] : { id: '1', dataSource, syncStatus: 'idle' };
        const state = { ...currentState, ...args.data };
        
        if (index !== -1) {
          mockSyncStates[index] = state;
        } else {
          mockSyncStates.push(state);
        }
        return state;
      },
    },
    auditLog: {
      create: async (args: any) => ({ id: 'mock-audit', ...args.data }),
      findMany: async () => [],
    },
    admin: {
      findUnique: async () => null,
    },
    adCampaign: {
      create: async (args: { data: any }) => {
        const campaign = { id: `mock-campaign-${Date.now()}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
        mockAdCampaigns.push(campaign);
        return campaign;
      },
      findUnique: async (args: { where: { id?: string } }) => {
        return mockAdCampaigns.find((c: any) => c.id === args.where.id) || null;
      },
      update: async (args: { where: { id: string }; data: any }) => {
        const campaign = mockAdCampaigns.find((c: any) => c.id === args.where.id);
        if (campaign) return { ...campaign, ...args.data };
        return null;
      },
      findMany: async () => mockAdCampaigns,
      count: async (args: any) => mockAdCampaigns.length,
    },
    adCopy: {
      createMany: async (args: { data: any[] }) => {
        args.data.forEach((copy: any, idx: number) => {
          mockAdCopies.push({ id: `mock-copy-${Date.now()}-${idx}`, ...copy });
        });
        return { count: args.data.length };
      },
      findMany: async () => mockAdCopies,
    },
    note: {
      create: async (args: { data: any }) => {
        const note = { id: `mock-note-${Date.now()}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
        mockBusinessData.push(note);
        return note;
      },
      findMany: async () => mockBusinessData.filter((b: any) => b.content),
      update: async (args: { where: { id: string }; data: any }) => {
        const note = mockBusinessData.find((b: any) => b.id === args.where.id);
        if (note) return { ...note, ...args.data };
        return null;
      },
      delete: async (args: { where: { id: string } }) => {
        return { id: args.where.id };
      },
      count: async () => mockBusinessData.filter((b: any) => b.content).length,
    },
    seoulPermit: {
      findUnique: async (args: { where: { id?: string } }) => {
        return mockSeoulPermits.find((p: any) => p.id === args.where.id) || null;
      },
      upsert: async (args: any) => ({ id: 'mock-permit', ...args.create.data }),
      findMany: async () => mockSeoulPermits,
      count: async () => mockSeoulPermits.length,
      groupBy: async () => [{ serviceCode: 'S001', _count: 10 }],
    },
    $connect: async () => {
      dbLogger.info('정적 데이터베이스 모드 사용 중');
    },
    $disconnect: async () => {},
  };
}

export default db;

export const resetMockData = () => {
  mockBusinessData.length = 0
  mockAdCampaigns.length = 0
  mockAdCopies.length = 0
  mockSeoulPermits.length = 0
  mockSyncStates.length = 0
}

export const testConnection = async () => {
  try {
    await db.$connect();
    return true;
  } catch {
    return false;
  }
};

export const disconnectDatabase = async () => {
  await db.$disconnect();
};
