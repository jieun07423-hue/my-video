import { syncLogger } from '@/lib/logger';
import db from '@/lib/db';

export interface SyncStateUpdate {
  syncStatus?: 'idle' | 'running' | 'success' | 'failed';
  errorMessage?: string | null;
  lastBusinessId?: string;
  newRecordsCount?: number;
  totalSynced?: number;
  syncCount?: number;
  lastSyncedAt?: Date;
}

export class SyncStateRepository {
  async getSyncState(dataSource: string = 'public-data-portal') {
    const result = await db.syncState.findUnique({
      where: { dataSource },
    });
    if (result) return result;
    return {
      id: '1',
      dataSource,
      syncStatus: 'idle' as const,
      lastSyncedAt: null,
      lastBusinessId: null,
      syncCount: 0,
      totalSynced: 0,
      newRecordsCount: 0,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async createSyncState(dataSource: string = 'public-data-portal') {
    const syncState = await this.getSyncState(dataSource);
    syncLogger.info({ dataSource }, '동기화 상태 생성');
    return syncState;
  }

  async updateSyncState(
    dataSource: string = 'public-data-portal',
    update: SyncStateUpdate
  ) {
    syncLogger.info({ dataSource, update }, '동기화 상태 업데이트');
    return await db.syncState.update({
      where: { dataSource },
      data: update,
    });
  }

  async setRunning(dataSource: string = 'public-data-portal') {
    return this.updateSyncState(dataSource, {
      syncStatus: 'running',
      errorMessage: null,
    });
  }

  async setSuccess(
    dataSource: string = 'public-data-portal',
    options: { lastBusinessId?: string; newRecordsCount?: number; totalSynced?: number; syncCount?: number }
  ) {
    return this.updateSyncState(dataSource, {
      syncStatus: 'success',
      errorMessage: null,
      lastSyncedAt: new Date(),
      ...options,
    });
  }

  async setFailed(
    dataSource: string = 'public-data-portal',
    errorMessage: string
  ) {
    syncLogger.error({ dataSource, errorMessage }, '동기화 실패');

    return this.updateSyncState(dataSource, {
      syncStatus: 'failed',
      errorMessage,
    });
  }

  async setIdle(dataSource: string = 'public-data-portal') {
    return this.updateSyncState(dataSource, {
      syncStatus: 'idle',
      errorMessage: null,
    });
  }
}

export const syncStateRepository = new SyncStateRepository();