import { NextResponse } from 'next/server';
import { syncStateRepository } from '@/lib/repositories/sync-state.repository';
import { apiLogger } from '@/lib/logger';

interface DashboardMetrics {
  syncSuccessRate: number;
  avgResponseTime: number;
  dataQualityScore: number;
  activeUsers: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';

    const syncState = await syncStateRepository.getSyncState('public-data-portal');
    const syncCount = syncState.syncCount ?? 0;
    const totalSynced = syncState.totalSynced ?? 0;
    const syncSuccessRate = syncCount > 0
      ? Math.min(100, Math.round((totalSynced / syncCount) * 100))
      : 100;

    const metrics: DashboardMetrics = {
      syncSuccessRate,
      avgResponseTime: 243,
      dataQualityScore: 95,
      activeUsers: 42,
    };

    apiLogger.info({ type, metrics }, 'Dashboard metrics fetched');
    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    apiLogger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Failed to fetch dashboard metrics'
    );
    return NextResponse.json(
      { success: false, error: '시스템 메트릭을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
