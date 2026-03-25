import { syncStateRepository } from '@/lib/repositories/sync-state.repository';
import { apiLogger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const syncState = await syncStateRepository.getSyncState('public-data-portal');

    apiLogger.info({ syncStatus: syncState.syncStatus }, 'Sync status fetched');
    return NextResponse.json({
      success: true,
      data: syncState
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch sync status');
    return NextResponse.json(
      {
        success: false,
        error: '동기화 상태를 불러오는데 실패했습니다.'
      },
      { status: 500 }
    );
  }
}
