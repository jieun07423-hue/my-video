import { apiLogger } from '@/lib/logger';

export interface AlimTalkPayload {
  phone: string;
  templateCode: string;
  variables: Record<string, string>;
}

export class NotificationSenderService {
  async sendKakaoAlimTalk(payload: AlimTalkPayload): Promise<{ success: boolean; messageId: string }> {
    apiLogger.info({ phone: payload.phone, templateCode: payload.templateCode }, '카카오 알림톡 발송 요청 (시뮬레이션)');
    return {
      success: true,
      messageId: `alimtalk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  async sendWebPush(deviceToken: string, title: string, body: string): Promise<{ success: boolean }> {
    apiLogger.info({ deviceToken, title }, '웹 푸시 알림 발송');
    return { success: true };
  }
}

export const notificationSender = new NotificationSenderService();
