import { NextRequest, NextResponse } from 'next/server';
import {
  createBatchJob,
  executeBatchJob,
  getBatchJob,
  getBatchJobs,
  cancelBatchJob,
  getBatchStats,
  clearCompletedJobs,
} from '@/lib/services/quality-batch.service';
import { businessRepository } from '@/lib/repositories/business.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = getBatchStats();
      return NextResponse.json(stats);
    }

    if (action === 'jobs') {
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const jobs = getBatchJobs(limit);
      return NextResponse.json({ jobs, count: jobs.length });
    }

    const jobId = searchParams.get('jobId');
    if (jobId) {
      const job = getBatchJob(jobId);
      if (!job) {
        return NextResponse.json({ error: '작업을 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json(job);
    }

    return NextResponse.json({ error: 'action 또는 jobId 파라미터가 필요합니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '배치 작업 조회 실패');
    return createApiErrorResponse(error, '배치 작업 조회 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobId, jobName } = body;

    if (action === 'create') {
      const job = createBatchJob(jobName || '데이터 품질 검사');
      apiLogger.info({ jobId: job.id, jobName: job.name }, '배치 작업 생성');
      return NextResponse.json(job);
    }

    if (action === 'execute' && jobId) {
      const job = getBatchJob(jobId);
      if (!job) {
        return NextResponse.json({ error: '작업을 찾을 수 없습니다' }, { status: 404 });
      }

      if (job.status !== 'pending') {
        return NextResponse.json({ error: '대기 중인 작업만 실행할 수 있습니다' }, { status: 400 });
      }

      const result = await businessRepository.search({ limit: 1000 });
      const businesses = result.items.map((b: any) => ({
        bizesId: b.bizesId,
        name: b.name,
        roadNameAddress: b.roadNameAddress,
        lotNumberAddress: b.lotNumberAddress,
        phone: b.phone,
        latitude: b.latitude,
        longitude: b.longitude,
        businessCode: b.businessCode,
        businessName: b.businessName,
        indsLclsNm: b.indsLclsNm,
        indsMclsNm: b.indsMclsNm,
        indsSclsNm: b.indsSclsNm,
        status: b.status,
        updatedAt: b.updatedAt,
      }));

      const monitoringResult = await executeBatchJob(job, businesses);

      apiLogger.info({
        jobId: job.id,
        progress: job.progress,
        overallHealth: monitoringResult.overallHealth,
      }, '배치 작업 실행 완료');

      return NextResponse.json({ job, result: monitoringResult });
    }

    if (action === 'cancel' && jobId) {
      const success = cancelBatchJob(jobId);
      if (success) {
        return NextResponse.json({ success: true, message: '작업이 취소되었습니다' });
      }
      return NextResponse.json({ error: '작업을 취소할 수 없습니다' }, { status: 400 });
    }

    if (action === 'clear-completed') {
      const clearedCount = clearCompletedJobs();
      return NextResponse.json({ success: true, clearedCount });
    }

    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '배치 작업 처리 실패');
    return createApiErrorResponse(error, '배치 작업 처리 실패', 500);
  }
}
