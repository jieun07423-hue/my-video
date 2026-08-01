import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { mobilePushService } from '@/lib/services/mobile-push.service';
import { z } from 'zod';

const DeviceRegisterSchema = z.object({
  storeId: z.string().min(1),
  deviceToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = DeviceRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: '유효하지 않은 디바이스 등록 정보입니다.' }, { status: 400 });
    }

    const { storeId, deviceToken } = parsed.data;
    mobilePushService.registerDevice(storeId, deviceToken);

    return NextResponse.json({ success: true, message: '모바일 푸시 디바이스가 등록되었습니다.' });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '디바이스 등록 실패');
    return NextResponse.json({ success: false, error: '디바이스 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
