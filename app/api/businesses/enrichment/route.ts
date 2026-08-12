import { NextRequest, NextResponse } from 'next/server';
import { businessEnrichmentService, EnrichmentSource, EnrichmentResult } from '@/lib/services/business-enrichment.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const bizesId = searchParams.get('bizesId');
    const sourceName = searchParams.get('source');

    let data: any;

    switch (action) {
      case 'status':
        if (!bizesId) {
          return NextResponse.json({ error: 'bizesId가 필요합니다' }, { status: 400 });
        }
        data = await businessEnrichmentService.getEnrichmentStatus(bizesId);
        break;

      case 'sources':
        data = businessEnrichmentService.getSources();
        break;

      case 'source-detail':
        if (!sourceName) {
          return NextResponse.json({ error: 'source 이름이 필요합니다' }, { status: 400 });
        }
        data = businessEnrichmentService.getSource(sourceName);
        break;

      case 'statistics':
        data = await businessEnrichmentService.getStatistics();
        break;

      case 'results': {
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const status = searchParams.get('status') as any;
        data = await businessEnrichmentService.getEnrichmentResults({ limit, offset, status });
        break;
      }

      case 'needs-enrichment': {
        const scoreThreshold = parseInt(searchParams.get('scoreThreshold') || '80');
        const needsLimit = parseInt(searchParams.get('limit') || '100');
        data = await businessEnrichmentService.getBusinessesNeedingEnrichment(scoreThreshold, needsLimit);
        break;
      }

      default:
        return NextResponse.json({ error: '지원하지 않는 액션입니다' }, { status: 400 });
    }

    apiLogger.info({ action, bizesId, source: sourceName }, '보강 조회');
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '보강 조회 실패');
    return NextResponse.json({ error: '보강 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    let result: any;

    switch (action) {
      case 'enrich': {
        const { bizesId, sources, force = false } = params;
        if (!bizesId) {
          return NextResponse.json({ error: 'bizesId가 필요합니다' }, { status: 400 });
        }
        result = await businessEnrichmentService.enrichBusiness(bizesId, { sources, force });
        break;
      }

      case 'bulk-enrich': {
        const { bizesIds, sources, force = false, batchSize = 50, concurrency = 3 } = params;
        if (!bizesIds || !Array.isArray(bizesIds) || bizesIds.length === 0) {
          return NextResponse.json({ error: 'bizesIds 배열이 필요합니다' }, { status: 400 });
        }
        result = await businessEnrichmentService.enrichBulk({
          bizesIds,
          sources,
          force,
          batchSize,
          concurrency,
        });
        break;
      }

      case 'enrich-by-area': {
        const { area, sources, force = false, limit = 100 } = params;
        if (!area) {
          return NextResponse.json({ error: '지역(area)이 필요합니다' }, { status: 400 });
        }
        result = await businessEnrichmentService.enrichByArea(area, { sources, force, limit });
        break;
      }

      case 'enrich-by-category': {
        const { categoryCode, sources, force = false, limit = 500 } = params;
        if (!categoryCode) {
          return NextResponse.json({ error: '업종코드(categoryCode)가 필요합니다' }, { status: 400 });
        }
        result = await businessEnrichmentService.enrichByCategory(categoryCode, { sources, force, limit });
        break;
      }

      case 'add-source': {
        const source: EnrichmentSource = params;
        if (!source.name || !source.config) {
          return NextResponse.json({ error: '소스 이름과 설정이 필요합니다' }, { status: 400 });
        }
        businessEnrichmentService.addSource(source);
        result = { success: true, message: '소스가 추가되었습니다' };
        break;
      }

      case 'remove-source': {
        const { name } = params;
        if (!name) {
          return NextResponse.json({ error: '소스 이름이 필요합니다' }, { status: 400 });
        }
        businessEnrichmentService.removeSource(name);
        result = { success: true, message: '소스가 제거되었습니다' };
        break;
      }

      case 'reset-status': {
        const { bizesIds } = params;
        if (!bizesIds || !Array.isArray(bizesIds) || bizesIds.length === 0) {
          return NextResponse.json({ error: 'bizesIds 배열이 필요합니다' }, { status: 400 });
        }
        const count = await businessEnrichmentService.resetEnrichmentStatus(bizesIds);
        result = { success: true, resetCount: count };
        break;
      }

      case 'schedule': {
        const { cron, sources, force = false, batchSize = 100 } = params;
        if (!cron) {
          return NextResponse.json({ error: 'cron 표현식이 필요합니다' }, { status: 400 });
        }
        const jobId = businessEnrichmentService.scheduleEnrichment(cron, { sources, force, batchSize });
        result = { success: true, jobId, message: '예약 작업이 등록되었습니다' };
        break;
      }

      case 'cancel-schedule': {
        const { jobId } = params;
        if (!jobId) {
          return NextResponse.json({ error: 'jobId가 필요합니다' }, { status: 400 });
        }
        businessEnrichmentService.cancelSchedule(jobId);
        result = { success: true, message: '예약 작업이 취소되었습니다' };
        break;
      }

      default:
        return NextResponse.json({ error: '지원하지 않는 액션입니다' }, { status: 400 });
    }

    apiLogger.info({ action }, '보강 작업 실행');
    return NextResponse.json(result, { status: action === 'enrich' || action === 'bulk-enrich' ? 201 : 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '보강 작업 실패');
    return NextResponse.json({ error: '보강 작업 실패' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { source } = body;

    if (!source || !source.name) {
      return NextResponse.json({ error: '소스 정보가 필요합니다' }, { status: 400 });
    }

    const enrichmentSource: EnrichmentSource = {
      ...source,
      priority: source.priority ?? 10,
      enabled: source.enabled ?? true,
      rateLimit: source.rateLimit ?? 100,
    };

    businessEnrichmentService.addSource(enrichmentSource);

    apiLogger.info({ sourceName: source.name }, '보강 소스 업데이트');
    return NextResponse.json({ success: true, source: enrichmentSource });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '보강 소스 업데이트 실패');
    return NextResponse.json({ error: '보강 소스 업데이트 실패' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: '소스 이름이 필요합니다' }, { status: 400 });
    }

    businessEnrichmentService.removeSource(name);

    apiLogger.info({ sourceName: name }, '보강 소스 삭제');
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '보강 소스 삭제 실패');
    return NextResponse.json({ error: '보강 소스 삭제 실패' }, { status: 500 });
  }
}