import { NextResponse } from 'next/server';
import { businessRepository } from '@/lib/repositories/business.repository';
import { calculateQualityScore, getScoreHistory, getScoreStats, generateScoreReport, setScoringConfig, getScoringConfig } from '@/lib/services/quality/quality-scoring.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const action = searchParams.get('action') || 'calculate';

    if (action === 'history' && businessId) {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const history = getScoreHistory(businessId, limit);
      return NextResponse.json({ success: true, data: history });
    }

    if (action === 'stats') {
      const stats = getScoreStats();
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'config') {
      const config = getScoringConfig();
      return NextResponse.json({ success: true, data: config });
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId가 필요합니다' },
        { status: 400 }
      );
    }

    const business = await businessRepository.findByBizesId(businessId);
    if (!business) {
      return NextResponse.json(
        { success: false, error: '사업자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const score = calculateQualityScore(business);
    return NextResponse.json({ success: true, data: score });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '품질 점수 API 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, businessIds } = body;

    if (action === 'config' && config) {
      setScoringConfig(config);
      return NextResponse.json({ success: true, data: getScoringConfig() });
    }

    if (action === 'batch' && businessIds && Array.isArray(businessIds)) {
      const businesses = await Promise.all(
        businessIds.map((id: string) => businessRepository.findByBizesId(id))
      );
      const validBusinesses = businesses.filter((b): b is NonNullable<typeof b> => b !== null);
      const scores = validBusinesses.map(business => calculateQualityScore(business));
      return NextResponse.json({ success: true, data: scores });
    }

    return NextResponse.json(
      { success: false, error: '잘못된 요청입니다' },
      { status: 400 }
    );
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '품질 점수 설정 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}