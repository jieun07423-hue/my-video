import type { PrismaClient } from '@prisma/client';

/**
 * 애플리케이션 전역 DB 클라이언트 인터페이스.
 *
 * PrismaClient의 모델 델리게이트 중 이 앱에서 사용하는 모델만 선별.
 * Mock 구현체는 `as unknown as DbClient` 단언으로 호환성을 유지하며,
 * 실제 구현은 PrismaClient를 직접 래핑하여 타입 안전성을 확보.
 */
export interface DbClient {
  business: PrismaClient['business'];
  syncState: PrismaClient['syncState'];
  auditLog: PrismaClient['auditLog'];
  admin: PrismaClient['admin'];
  adCampaign: PrismaClient['adCampaign'];
  adCopy: PrismaClient['adCopy'];
  seoulPermit: PrismaClient['seoulPermit'];
  note: PrismaClient['note'];
  product: PrismaClient['product'];
  order: PrismaClient['order'];
  orderItem: PrismaClient['orderItem'];
  stockHistory: PrismaClient['stockHistory'];
  webhookEndpoint: PrismaClient['webhookEndpoint'];
  webhookDeliveryLog: PrismaClient['webhookDeliveryLog'];
  businessClaimRequest: PrismaClient['businessClaimRequest'];
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
  $transaction: <T>(fn: (tx: Omit<DbClient, '$connect' | '$disconnect' | '$transaction'>) => Promise<T>, options?: { timeout?: number }) => Promise<T>;
}

/**
 * PrismaAdapter(@auth/prisma-adapter)에서 요구하는 최소 PrismaClient 인터페이스.
 * NextAuth가 내부적으로 접근하는 표준 모델(user/account/session 등)을 포함.
 * 어댑터 사용 시에만 import하여 사용.
 */
export type PrismaAdapterClient = Pick<PrismaClient, '$connect' | '$disconnect'>;
