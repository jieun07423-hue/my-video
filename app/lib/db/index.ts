import type { DbClient } from './types';
import { createPrismaClient, getPrismaClientInstance } from './prisma';
import { createMockDb, resetMockData } from './mock';

const USE_REAL_DB = !!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test';

const db: DbClient = USE_REAL_DB ? createPrismaClient() : createMockDb();

export default db;
export { getPrismaClientInstance, resetMockData };
export type { DbClient } from './types';
