import { NextResponse } from 'next/server';
import {
  addDataSource,
  getDataSources,
  getDataSourceById,
  removeDataSource,
  analyzeCorrelation,
  analyzeMultipleCorrelations,
  getCorrelationHistory,
  getCorrelationStats,
  setCorrelationConfig,
  getCorrelationConfig,
  generateCorrelationReport,
} from '@/lib/services/quality/quality-correlation.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'sources';

    if (action === 'sources') {
      const sources = getDataSources();
      return NextResponse.json({ success: true, data: sources });
    }

    if (action === 'source') {
      const sourceId = searchParams.get('sourceId');
      if (!sourceId) {
        return NextResponse.json({ success: false, error: 'sourceId가 필요합니다' }, { status: 400 });
      }
      const source = getDataSourceById(sourceId);
      if (!source) {
        return NextResponse.json({ success: false, error: '데이터 소스를 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: source });
    }

    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const history = getCorrelationHistory(limit);
      return NextResponse.json({ success: true, data: history });
    }

    if (action === 'stats') {
      const stats = getCorrelationStats();
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'config') {
      const config = getCorrelationConfig();
      return NextResponse.json({ success: true, data: config });
    }

    return NextResponse.json({ success: true, data: getDataSources() });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '상관 분석 API 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, name, type, endpoint, refreshInterval, sourceAData, sourceBData, sourceAId, sourceBId, metricA, metricB, metricsData } = body;

    if (action === 'config' && config) {
      setCorrelationConfig(config);
      return NextResponse.json({ success: true, data: getCorrelationConfig() });
    }

    if (action === 'addSource' && name && type && endpoint) {
      const source = addDataSource(name, type, endpoint, refreshInterval || 60);
      return NextResponse.json({ success: true, data: source });
    }

    if (action === 'removeSource') {
      const sourceId = body.sourceId;
      if (!sourceId) {
        return NextResponse.json({ success: false, error: 'sourceId가 필요합니다' }, { status: 400 });
      }
      const removed = removeDataSource(sourceId);
      return NextResponse.json({ success: true, data: { removed } });
    }

    if (action === 'analyze' && sourceAData && sourceBData && sourceAId && sourceBId && metricA && metricB) {
      const pair = analyzeCorrelation(sourceAData, sourceBData, sourceAId, sourceBId, metricA, metricB);
      return NextResponse.json({ success: true, data: pair });
    }

    if (action === 'analyzeBatch' && metricsData && typeof metricsData === 'object') {
      const result = analyzeMultipleCorrelations(metricsData);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '상관 분석 설정 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
