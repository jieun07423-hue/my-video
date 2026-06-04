import { describe, it, expect, beforeEach } from '@jest/globals';
import { SyncStateRepository } from '../sync-state.repository';
import { resetMockData } from '@/lib/db';

describe('SyncStateRepository', () => {
  let repository: SyncStateRepository;

  beforeEach(() => {
    resetMockData();
    repository = new SyncStateRepository();
  });

  describe('getSyncState', () => {
    it('동기화 상태를 조회해야 한다', async () => {
      const state = await repository.getSyncState();

      expect(state).toBeDefined();
      expect(state.dataSource).toBeDefined();
      expect(state.syncStatus).toBeDefined();
    });
  });

  describe('setRunning', () => {
    it('상태를 running으로 변경해야 한다', async () => {
      const state = await repository.setRunning();

      expect(state).toBeDefined();
      expect(state.syncStatus).toBe('running');
    });
  });

  describe('setSuccess', () => {
    it('상태를 success로 변경하고 결과를 기록해야 한다', async () => {
      const state = await repository.setSuccess('portal', { totalSynced: 100 });

      expect(state).toBeDefined();
      expect(state.syncStatus).toBe('success');
      expect(state.totalSynced).toBe(100);
    });
  });

  describe('setFailed', () => {
    it('상태를 failed로 변경하고 에러 메시지를 기록해야 한다', async () => {
      const state = await repository.setFailed('portal', 'Error');

      expect(state).toBeDefined();
      expect(state.syncStatus).toBe('failed');
      expect(state.errorMessage).toBe('Error');
    });
  });
});
