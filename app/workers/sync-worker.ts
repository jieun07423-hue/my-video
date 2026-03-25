import { syncLogger } from '@/lib/logger';
import { fetchBusinessesByDate, checkAPIHealth } from '@/lib/api/public-data-client';
import { parseBusinessItems } from '@/lib/api/parser';
import { businessRepository } from '@/lib/repositories/business.repository';
import { syncStateRepository } from '@/lib/repositories/sync-state.repository';
import {
  notifySyncStart,
  notifySyncComplete,
  notifySyncError,
  notifyNewBusiness,
} from '../lib/notifications/slack';

interface SyncStats {
  totalFetched: number;
  totalSynced: number;
  newRecords: number;
  updatedRecords: number;
  errors: number;
}

export async function syncWorker(date?: string): Promise<SyncStats> {
  const startTime = Date.now();
  const syncDate = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');

  syncLogger.info({ date: syncDate }, '동기화 워커 시작');
  await notifySyncStart();

  const stats: SyncStats = {
    totalFetched: 0,
    totalSynced: 0,
    newRecords: 0,
    updatedRecords: 0,
    errors: 0,
  };

  try {
    await syncStateRepository.setRunning();

    if (!(await checkAPIHealth())) {
      throw new Error('API 헬스체크 실패');
    }

    let pageNo = 1;
    const numOfRows = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      syncLogger.info({ pageNo, numOfRows }, `${pageNo}페이지 조회 중`);

      const response = await fetchBusinessesByDate(syncDate, pageNo, numOfRows);

      if (!response.body?.items || response.body.items.length === 0) {
        hasMoreData = false;
        break;
      }

      stats.totalFetched += response.body.items.length;

      const parsedItems = parseBusinessItems(response.body.items);

      for (const item of parsedItems) {
        try {
          const existing = await businessRepository.findByBizesId(item.bizesId || '');
          const isNew = !existing;

          const businessInput = {
            bizesId: item.bizesId || '',
            name: item.name || '',
            roadNameAddress: item.roadNameAddress || null,
            lotNumberAddress: item.lotNumberAddress || null,
            phone: item.phone || null,
            latitude: item.latitude || null,
            longitude: item.longitude || null,
            businessCode: item.businessCode || null,
            businessName: item.businessName || null,
            indsLclsCd: item.indsLclsCd || null,
            indsLclsNm: item.indsLclsNm || null,
            indsMclsCd: item.indsMclsCd || null,
            indsMclsNm: item.indsMclsNm || null,
            indsSclsCd: item.indsSclsCd || null,
            indsSclsNm: item.indsSclsNm || null,
            status: item.status as 'pending' | 'active' | 'inactive' | 'dissolved' | 'pending_renewal',
            recordStatus: item.recordStatus as 'new' | 'synced' | 'verified',
            dataSource: item.dataSource || 'test',
          };

          await businessRepository.upsertMany([businessInput]);

      if (isNew) {
            stats.newRecords++;
            stats.totalSynced++;

          await notifyNewBusiness({
            businessId: businessInput.bizesId,
            name: businessInput.name,
            address: businessInput.roadNameAddress || businessInput.lotNumberAddress || 'N/A',
            businessType: businessInput.businessName || null,
          });
          } else {
            stats.updatedRecords++;
            stats.totalSynced++;
          }
        } catch (error) {
          stats.errors++;
          syncLogger.error(
            { bizesId: item.bizesId, error },
            '소상공인 저장 실패'
          );
        }
      }

      const totalPages = Math.ceil(response.body.totalCount / numOfRows);
      hasMoreData = pageNo < totalPages;
      pageNo++;
    }

    const duration = Date.now() - startTime;

      await syncStateRepository.setSuccess('public-data-portal', {
        newRecordsCount: stats.newRecords,
        totalSynced: stats.totalSynced,
      });

    await notifySyncComplete(stats, duration);

    syncLogger.info(
      { stats, duration: `${duration}ms` },
      '동기화 완료'
    );

    return stats;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stats.errors++;

    await syncStateRepository.setFailed('public-data-portal', errorMessage);
    await notifySyncError(error as Error);

    syncLogger.error({ error, stats }, '동기화 실패');
    throw error;
  }
}

export async function manualSync(date?: string): Promise<SyncStats> {
  syncLogger.info('수동 동기화 요청');
  return syncWorker(date);
}
