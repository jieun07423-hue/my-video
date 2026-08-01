import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || 'default-store';

    apiLogger.info({ storeId }, 'AI 경영 인사이트 및 매출 분석 조회');

    const insightData = {
      storeId,
      prediction: {
        expectedNextWeekGrowth: '+14.5%',
        peakHours: ['12:00 - 13:30', '18:30 - 20:00'],
        topRecommendedMenu: '시그니처 세트메뉴',
      },
      weatherFactor: {
        condition: '맑음',
        temperature: '22°C',
        impactOnSales: '긍정적 (야외 유동인구 15% 증가 예상)',
      },
      aiManagementTips: [
        '점심 피크타임(12시~13시) 대비 사전 식자재 준비량을 20% 늘리시는 것을 추천합니다.',
        '최근 주말 저녁 단골 고객 재방문율이 높으므로, 세트메뉴 할인 프로모션을 제안합니다.',
        '토스페이 간편결제 이용 고객의 재주문율이 일반 결제보다 30% 높습니다. QR 주문 프로모션을 활용해보세요.',
      ],
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: insightData });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'AI 인사이트 생성 실패');
    return NextResponse.json({ success: false, error: 'AI 인사이트 조회 실패' }, { status: 500 });
  }
}
