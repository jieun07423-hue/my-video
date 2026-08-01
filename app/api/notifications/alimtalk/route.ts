import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { notificationSender } from '@/lib/services/notification-sender.service';
import { z } from 'zod';

const AlimTalkRequestSchema = z.object({
  phone: z.string().min(10),
  templateCode: z.string().min(1),
  variables: z.record(z.string(), z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AlimTalkRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: '알림톡 요청 데이터가 올바르지 않습니다.' }, { status: 400 });
    }

    const result = await notificationSender.sendKakaoAlimTalk(parsed.data);

    apiLogger.info({ messageId: result.messageId }, '카카오 알림톡 발송 완료');
    return NextResponse.json({ success: true, result });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '알림톡 발송 실패');
    return NextResponse.json({ success: false, error: '알림톡 발송 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
