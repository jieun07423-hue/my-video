import { NextResponse } from 'next/server';
import { businessRepository } from '@/lib/repositories/business.repository';
import {
  analyzeWithAI,
  analyzeBatchWithAI,
  getAnalysisHistory,
  getAnalysisStats,
  setAIAnalysisConfig,
  getAIAnalysisConfig,
  generateAIAnalysisReport,
} from '@/lib/services/quality/quality-ai-analysis.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'analyze';
    const businessId = searchParams.get('businessId');

    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const history = getAnalysisHistory(businessId || undefined, limit);
      return NextResponse.json({ success: true, data: history });
    }

    if (action === 'stats') {
      const stats = getAnalysisStats();
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'config') {
      const config = getAIAnalysisConfig();
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

    const analysisType = (searchParams.get('type') || 'quality') as 'quality' | 'anomaly' | 'recommendation' | 'summary';
    const result = await analyzeWithAI({ businessId, data: business as Record<string, any>, analysisType });
    const report = generateAIAnalysisReport(result);

    return NextResponse.json({ success: true, data: { result, report } });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'AI 분석 API 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, businessIds, analysisType } = body;

    if (action === 'config' && config) {
      setAIAnalysisConfig(config);
      return NextResponse.json({ success: true, data: getAIAnalysisConfig() });
    }

    if (action === 'batch' && businessIds && Array.isArray(businessIds)) {
      const businesses = await Promise.all(
        businessIds.map((id: string) => businessRepository.findByBizesId(id))
      );
      const validBusinesses = businesses.filter((b): b is NonNullable<typeof b> => b !== null);
      const requests = validBusinesses.map(b => ({
        businessId: b.bizesId || b.id || 'unknown',
        data: b as Record<string, any>,
        analysisType: (analysisType || 'quality') as any,
      }));
      const result = await analyzeBatchWithAI(requests);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'AI 분석 설정 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
