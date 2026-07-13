import { PrismaClient } from '@prisma/client';
import { dbLogger } from '@/lib/logger';
import type { DbClient } from './types';

let prismaClient: PrismaClient | null = null;

/**
 * 실제 PostgreSQL + Prisma 기반 DB 클라이언트를 생성/반환.
 * 싱글턴으로 관리되어 최초 호출 시에만 PrismaClient를 초기화.
 */
export function createPrismaClient(): DbClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });

    prismaClient.$connect().catch((error: Error) => {
      dbLogger.error({ error: error.message }, '데이터베이스 연결 실패');
    });
  }

  return {
    business: prismaClient.business,
    syncState: prismaClient.syncState,
    auditLog: prismaClient.auditLog,
    admin: prismaClient.admin,
    adCampaign: prismaClient.adCampaign,
    adCopy: prismaClient.adCopy,
    seoulPermit: prismaClient.seoulPermit,
    note: prismaClient.note,
    product: prismaClient.product,
    order: prismaClient.order,
    orderItem: prismaClient.orderItem,
    stockHistory: prismaClient.stockHistory,
    webhookEndpoint: prismaClient.webhookEndpoint,
    webhookDeliveryLog: prismaClient.webhookDeliveryLog,
    businessClaimRequest: prismaClient.businessClaimRequest,
    $connect: () => prismaClient!.$connect(),
    $disconnect: () => prismaClient!.$disconnect(),
    $transaction: <T>(fn: (tx: any) => Promise<T>, options?: { timeout?: number }) => {
      return prismaClient!.$transaction(fn, options);
    },
  };
}

/**
 * NextAuth PrismaAdapter에서 사용할 원시 PrismaClient 인스턴스.
 * createPrismaClient()가 먼저 호출된 후에 접근 가능.
 */
export function getPrismaClientInstance(): PrismaClient | null {
  return prismaClient;
}

export type { DbClient };
