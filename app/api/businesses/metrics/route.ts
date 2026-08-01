import { NextRequest, NextResponse } from 'next/server';
import { statisticService } from '@/lib/services/statistic.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';
    const sinceParam = searchParams.get('since');
    const metric = searchParams.get('metric');
    const limit = parseInt(searchParams.get('limit') || '100');

    const since = sinceParam ? new Date(sinceParam) : undefined;

    let data: any;

    switch (type) {
      case 'dashboard':
        data = await statisticService.getDashboardData(since);
        break;

      case 'sync':
        data = await statisticService.getSyncMetrics(since);
        break;

      case 'duplicates':
        data = await statisticService.getDuplicateMetrics(since);
        break;

      case 'business':
        data = await statisticService.getBusinessMetrics();
        break;

      case 'system':
        data = await statisticService.getSystemMetrics();
        break;

      case 'timeseries':
        if (!metric) {
          return NextResponse.json({ error: 'metric 파라미터가 필요합니다' }, { status: 400 });
        }
        data = await statisticService.getTimeSeries(metric, since, limit);
        break;

      case 'summary':
        if (!metric) {
          return NextResponse.json({ error: 'metric 파라미터가 필요합니다' }, { status: 400 });
        }
        data = await statisticService.getSummary(metric, since);
        break;

      case 'counter':
        const counterName = searchParams.get('name');
        if (!counterName) {
          return NextResponse.json({ error: 'name 파라미터가 필요합니다' }, { status: 400 });
        }
        data = await statisticService.getCounter(counterName);
        break;

      default:
        return NextResponse.json({ error: '지원하지 않는 타입입니다' }, { status: 400 });
    }

    apiLogger.info({ type, since: sinceParam, metric }, '메트릭 조회');
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '메트릭 조회 실패');
    return NextResponse.json({ error: '메트릭 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'incrementCounter': {
        const { name, value } = params;
        if (!name) {
          return NextResponse.json({ error: 'name 파라미터가 필요합니다' }, { status: 400 });
        }
        const result = await statisticService.incrementCounter(name, value || 1);
        return NextResponse.json({ name, value: result });
      }

      case 'cleanup': {
        const { olderThanDays } = params;
        const deleted = await statisticService.cleanupOldMetrics(olderThanDays || 30);
        return NextResponse.json({ deletedKeys: deleted });
      }

      default:
        return NextResponse.json({ error: '지원하지 않는 액션입니다' }, { status: 400 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '메트릭 작업 실패');
    return NextResponse.json({ error: '메트릭 작업 실패' }, { status: 500 });
  }
}