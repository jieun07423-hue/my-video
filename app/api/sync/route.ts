import { NextRequest, NextResponse } from 'next/server';
import { syncFromPublicDataPortal, getSyncLockStatus } from '@/lib/services/public-data-portal.service';
import { syncStateRepository } from '@/lib/repositories/sync-state.repository';
import { syncLogger, apiLogger } from '@/lib/logger';

interface SyncRequest {
  serviceKey?: string;
  pageSize?: number;
  maxPages?: number;
  force?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json();

    const { serviceKey, pageSize = 10, maxPages = 10, force = false } = body;

    if (!serviceKey) {
      return NextResponse.json(
        { error: 'serviceKey가 필요합니다' },
        { status: 400 }
      );
    }

    apiLogger.info({ serviceKey: '***', pageSize, maxPages, force }, '데이터 동기화 요청 수신');

    await syncStateRepository.setRunning('public-data-portal');

    const result = await syncFromPublicDataPortal({
      serviceKey,
      pageSize,
      maxPages,
      force,
    });

    if (result.isLocked) {
      apiLogger.warn({ message: result.errors[0] }, '동기화가 이미 진행 중');
      return NextResponse.json(
        {
          success: false,
          error: result.errors[0] || '동기화가 이미 진행 중입니다',
          isLocked: true,
        },
        { status: 409 }
      );
    }

    if (!result.success) {
      apiLogger.error({ 
        errors: result.errors,
        failedRecords: result.failedRecords 
      }, '데이터 동기화 실패');

      await syncStateRepository.setFailed(
        'public-data-portal',
        result.errors.join('; ')
      );

      return NextResponse.json(
        {
          success: false,
          error: '데이터 동기화 중 오류가 발생했습니다',
          details: result.errors,
          failedRecords: result.failedRecords,
          summary: {
            totalProcessed: result.totalProcessed,
            newRecords: result.newRecords,
            updatedRecords: result.updatedRecords,
          },
        },
        { status: 207 }
      );
    }

    apiLogger.info(
      {
        totalProcessed: result.totalProcessed,
        newRecords: result.newRecords,
        updatedRecords: result.updatedRecords,
        failedRecords: result.failedRecords,
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
        failedRecords: result.failedRecords,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error(
      { error: errorMessage },
      '데이터 동기화 API 호출 실패'
    );

    await syncStateRepository.setFailed(
      'public-data-portal',
      errorMessage
    );

    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const lockStatus = getSyncLockStatus();
  const syncState = await syncStateRepository.getSyncState();

  return NextResponse.json({
    isLocked: lockStatus.isLocked,
    lockedAt: lockStatus.lockedAt,
    syncState,
  });
}
