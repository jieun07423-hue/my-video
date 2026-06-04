import { NextResponse } from 'next/server';
import { businessRepository } from '@/lib/repositories/business.repository';
import { runQualityCheck, getCheckHistory, getCheckStats, generateCheckReport, setQualityCheckConfig, getQualityCheckConfig, addQualityCheckRule, removeQualityCheckRule, getQualityCheckRules } from '@/lib/services/realtime-quality-check.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const action = searchParams.get('action') || 'check';

    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const history = getCheckHistory(businessId || undefined, limit);
      return NextResponse.json({ success: true, data: history });
    }

    if (action === 'stats') {
      const stats = getCheckStats();
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'config') {
      const config = getQualityCheckConfig();
      return NextResponse.json({ success: true, data: config });
    }

    if (action === 'rules') {
      const rules = getQualityCheckRules();
      return NextResponse.json({ success: true, data: rules });
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

    const result = runQualityCheck(business, 'sync');
    const report = generateCheckReport(result);

    return NextResponse.json({
      success: true,
      data: {
        result,
        report,
      },
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '실시간 품질 검증 API 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, rule, businessIds } = body;

    if (action === 'config' && config) {
      setQualityCheckConfig(config);
      return NextResponse.json({ success: true, data: getQualityCheckConfig() });
    }

    if (action === 'addRule' && rule) {
      addQualityCheckRule(rule);
      return NextResponse.json({ success: true, data: getQualityCheckRules() });
    }

    if (action === 'removeRule' && rule?.id) {
      const removed = removeQualityCheckRule(rule.id);
      return NextResponse.json({ success: true, data: { removed } });
    }

    if (action === 'batch' && businessIds && Array.isArray(businessIds)) {
      const businesses = await Promise.all(
        businessIds.map((id: string) => businessRepository.findByBizesId(id))
      );
      const validBusinesses = businesses.filter((b): b is NonNullable<typeof b> => b !== null);
      const results = validBusinesses.map(business => runQualityCheck(business, 'batch'));
      return NextResponse.json({ success: true, data: results });
    }

    return NextResponse.json(
      { success: false, error: '잘못된 요청입니다' },
      { status: 400 }
    );
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '실시간 품질 검증 설정 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}