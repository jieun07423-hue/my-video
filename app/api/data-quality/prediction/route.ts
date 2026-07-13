import { NextResponse } from 'next/server';
import {
  predictQualityMetric,
  predictBatchMetrics,
  getPredictionHistory,
  getPredictionStats,
  setPredictionConfig,
  getPredictionConfig,
  generatePredictionReport,
} from '@/lib/services/quality/quality-prediction.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'predict';
    const metric = searchParams.get('metric');

    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const history = getPredictionHistory(metric || undefined, limit);
      return NextResponse.json({ success: true, data: history });
    }

    if (action === 'stats') {
      const stats = getPredictionStats();
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'config') {
      const config = getPredictionConfig();
      return NextResponse.json({ success: true, data: config });
    }

    return NextResponse.json({ success: true, data: { message: 'POST 요청을 사용해주세요' } });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '예측 API 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, metric, historicalData, metricsData } = body;

    if (action === 'config' && config) {
      setPredictionConfig(config);
      return NextResponse.json({ success: true, data: getPredictionConfig() });
    }

    if (action === 'predict' && metric && historicalData && Array.isArray(historicalData)) {
      const result = predictQualityMetric(metric, historicalData);
      const report = generatePredictionReport(result);
      return NextResponse.json({ success: true, data: { result, report } });
    }

    if (action === 'batch' && metricsData && typeof metricsData === 'object') {
      const result = predictBatchMetrics(metricsData);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '예측 설정 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
