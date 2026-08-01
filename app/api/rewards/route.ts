import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { rewardService } from '@/lib/services/reward.service';
import { z } from 'zod';

const StampRequestSchema = z.object({
  phone: z.string().min(10),
  storeId: z.string().min(1),
  count: z.number().int().positive().default(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = StampRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: '잘못된 스탬프 적립 요청입니다.' }, { status: 400 });
    }

    const { phone, storeId, count } = parsed.data;
    const result = await rewardService.addStamp(phone, storeId, count);

    apiLogger.info({ phone, storeId, stamps: result.stamps }, '스탬프 적립 성공');
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '스탬프 적립 실패');
    return NextResponse.json({ success: false, error: '스탬프 적립 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const storeId = searchParams.get('storeId');

    if (!phone || !storeId) {
      return NextResponse.json({ success: false, error: 'phone과 storeId 파라미터가 필요합니다.' }, { status: 400 });
    }

    const rewards = await rewardService.getCustomerRewards(phone, storeId);
    return NextResponse.json({ success: true, rewards });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '리워드 조회 실패');
    return NextResponse.json({ success: false, error: '리워드 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
