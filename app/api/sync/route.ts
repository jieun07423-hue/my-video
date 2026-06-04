import { NextRequest, NextResponse } from 'next/server';
import { getSyncLockStatus } from '@/lib/services/public-data-portal.service';
import { syncStateRepository } from '@/lib/repositories/sync-state.repository';
import { apiLogger } from '@/lib/logger';
import { addSyncJob } from '@/lib/queues/sync.queue';

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

    await addSyncJob({
      serviceKey,
      pageSize,
      maxPages,
      force,
    });

    return NextResponse.json({
      success: true,
      message: '데이터 동기화가 요청되었습니다. 배경에서 처리가 진행됩니다.',
    }, { status: 202 });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error(
      { error: errorMessage },
      '데이터 동기화 API 호출 실패'
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
  const syncState = await syncStateRepository.getSyncState();

  return NextResponse.json({
    isLocked: syncState?.status === 'running',
    syncState,
  });
}
