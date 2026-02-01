import { NextRequest, NextResponse } from 'next/server';
import { syncFromPublicDataPortal } from '@/app/lib/services/public-data-portal.service';
import { syncStateRepository } from '@/app/lib/repositories/sync-state.repository';
import { syncLogger, apiLogger } from '@/app/lib/logger';

interface SyncRequest {
  serviceKey?: string;
  pageSize?: number;
  maxPages?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json();

    const { serviceKey, pageSize = 10, maxPages = 10 } = body;

    if (!serviceKey) {
      return NextResponse.json(
        { error: 'serviceKey가 필요합니다' },
        { status: 400 }
      );
    }

    apiLogger.info({ serviceKey, pageSize, maxPages }, '데이터 동기화 요청 수신');

    await syncStateRepository.setRunning('public-data-portal');

    const result = await syncFromPublicDataPortal({
      serviceKey,
      pageSize,
      maxPages,
    });

    if (!result.success) {
      apiLogger.error({ errors: result.errors }, '데이터 동기화 실패');

      await syncStateRepository.setFailed(
        'public-data-portal',
        result.errors.join(', ')
      );

      return NextResponse.json(
        {
          success: false,
          error: '데이터 동기화 중 오류가 발생했습니다',
          details: result.errors,
        },
        { status: 500 }
      );
    }

    apiLogger.info(
      {
        totalProcessed: result.totalProcessed,
        newRecords: result.newRecords,
        updatedRecords: result.updatedRecords,
      },
      '데이터 동기화 성공'
    );

    await syncStateRepository.setSuccess('public-data-portal', {
      lastBusinessId: result.lastBusinessId,
      syncCount: result.totalProcessed,
      newRecordsCount: result.newRecords,
      totalSynced: result.totalProcessed,
    });

    return NextResponse.json({
      success: true,
      message: '데이터 동기화가 완료되었습니다',
      summary: {
        totalProcessed: result.totalProcessed,
        newRecords: result.newRecords,
        updatedRecords: result.updatedRecords,
      },
    });
  } catch (error) {
    apiLogger.error(
      { error: error instanceof Error ? error.message : String(error) },
      '데이터 동기화 API 호출 실패'
    );

    await syncStateRepository.setFailed(
      'public-data-portal',
      error instanceof Error ? error.message : String(error)
    );

    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
