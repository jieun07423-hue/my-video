import { apiLogger } from '@/lib/logger';

const deviceTokens = new Map<string, string[]>(); // storeId -> tokens[]

export class MobilePushService {
  registerDevice(storeId: string, token: string) {
    const tokens = deviceTokens.get(storeId) || [];
    if (!tokens.includes(token)) {
      tokens.push(token);
      deviceTokens.set(storeId, tokens);
    }
    apiLogger.info({ storeId, tokenCount: tokens.length }, '모바일 디바이스 토큰 등록');
  }

  async sendPushToStoreStaff(storeId: string, title: string, body: string) {
    const tokens = deviceTokens.get(storeId) || [];
    apiLogger.info({ storeId, targetTokens: tokens.length, title }, '매장 스태프 모바일 푸시 발송 (시뮬레이션)');
    return { success: true, deliveredCount: tokens.length };
  }
}

export const mobilePushService = new MobilePushService();
