import { NextRequest, NextResponse } from 'next/server';
import { syncStateRepository } from '@/app/lib/repositories/sync-state.repository';
import { apiLogger } from '@/app/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const slug = await getSlug(request);

    apiLogger.info({ slug }, '동기화 상태 조회');

    if (slug === 'sync/status') {
      const { searchParams } = new URL(request.url);
      const dataSource = searchParams.get('dataSource') || 'public-data-portal';

      apiLogger.info({ dataSource }, '동기화 상태 조회');

      const syncState = await syncStateRepository.getSyncState(dataSource);

      if (!syncState) {
        return NextResponse.json(
          {
            error: '동기화 상태를 찾을 수 없습니다',
            dataSource,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        dataSource,
        lastSyncedAt: syncState.lastSyncedAt,
        lastBusinessId: syncState.lastBusinessId,
        syncStatus: syncState.syncStatus,
        syncCount: syncState.syncCount,
        totalSynced: syncState.totalSynced,
        newRecordsCount: syncState.newRecordsCount,
        errorMessage: syncState.errorMessage,
      });
    }

    return NextResponse.json(
      { error: '알 수 없는 엔드포인트입니다', slug },
      { status: 404 }
    );
  } catch (error) {
    apiLogger.error(
      { error: error instanceof Error ? error.message : String(error) },
      '동기화 상태 조회 실패'
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

async function getSlug(request: NextRequest): Promise<string | null> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);

  const apiIndex = segments.indexOf('api');
  if (apiIndex === -1) return null;

  const nextIndex = apiIndex + 1;
  if (nextIndex >= segments.length) return null;

  return segments.slice(nextIndex).join('/');
}
