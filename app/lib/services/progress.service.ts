import { syncLogger } from '@/lib/logger';
import { redis } from '@/lib/redis';

export type ProgressState = 'waiting' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ProgressData {
  taskId: string;
  taskType: string;
  percentage: number;
  state: ProgressState;
  message: string;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface ProgressUpdate {
  percentage?: number;
  state?: ProgressState;
  message?: string;
  currentStep?: string;
  completedSteps?: number;
  totalSteps?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface CreateProgressOptions {
  taskId: string;
  taskType: string;
  totalSteps?: number;
  initialMessage?: string;
  metadata?: Record<string, unknown>;
  ttlSeconds?: number;
}

export interface ProgressQueryOptions {
  taskId?: string;
  taskType?: string;
  state?: ProgressState;
  limit?: number;
  offset?: number;
}

const PROGRESS_KEY_PREFIX = 'progress:';
const PROGRESS_INDEX_KEY = 'progress:index';
const DEFAULT_TTL = 86400;

export class ProgressService {
  async createProgress(options: CreateProgressOptions): Promise<ProgressData> {
    const now = new Date();
    const progress: ProgressData = {
      taskId: options.taskId,
      taskType: options.taskType,
      percentage: 0,
      state: 'waiting',
      message: options.initialMessage || '대기 중...',
      totalSteps: options.totalSteps,
      completedSteps: 0,
      startedAt: now,
      updatedAt: now,
      metadata: options.metadata,
    };

    await this.saveProgress(progress, options.ttlSeconds || DEFAULT_TTL);
    await this.addToIndex(options.taskId, options.taskType);
    
    syncLogger.info({ taskId: options.taskId, taskType: options.taskType }, '진행 상태 생성');
    return progress;
  }

  async getProgress(taskId: string): Promise<ProgressData | null> {
    const key = `${PROGRESS_KEY_PREFIX}${taskId}`;
    const data = await redis.get(key);
    
    if (!data) return null;
    
    try {
      const progress = JSON.parse(data) as ProgressData;
      progress.startedAt = new Date(progress.startedAt);
      progress.updatedAt = new Date(progress.updatedAt);
      if (progress.completedAt) {
        progress.completedAt = new Date(progress.completedAt);
      }
      return progress;
    } catch {
      return null;
    }
  }

  async updateProgress(taskId: string, update: ProgressUpdate): Promise<ProgressData | null> {
    const progress = await this.getProgress(taskId);
    
    if (!progress) {
      syncLogger.warn({ taskId }, '존재하지 않는 진행 상태 업데이트 시도');
      return null;
    }

    if (progress.state === 'completed' || progress.state === 'failed' || progress.state === 'cancelled') {
      syncLogger.warn({ taskId, state: progress.state }, '완료된 작업의 진행 상태 업데이트 시도');
      return progress;
    }

    const now = new Date();
    
    if (update.percentage !== undefined) {
      progress.percentage = Math.max(0, Math.min(100, update.percentage));
    }
    if (update.state !== undefined) {
      progress.state = update.state;
    }
    if (update.message !== undefined) {
      progress.message = update.message;
    }
    if (update.currentStep !== undefined) {
      progress.currentStep = update.currentStep;
    }
    if (update.completedSteps !== undefined) {
      progress.completedSteps = update.completedSteps;
      if (progress.totalSteps && progress.totalSteps > 0) {
        progress.percentage = Math.round((progress.completedSteps / progress.totalSteps) * 100);
      }
    }
    if (update.metadata !== undefined) {
      progress.metadata = { ...progress.metadata, ...update.metadata };
    }
    if (update.error !== undefined) {
      progress.error = update.error;
    }

    progress.updatedAt = now;

    if (progress.state === 'completed' || progress.state === 'failed') {
      progress.completedAt = now;
      progress.percentage = progress.state === 'completed' ? 100 : progress.percentage;
    }

    await this.saveProgress(progress);
    syncLogger.debug({ taskId, percentage: progress.percentage, state: progress.state }, '진행 상태 업데이트');
    
    return progress;
  }

  async startProgress(taskId: string, message?: string): Promise<ProgressData | null> {
    return this.updateProgress(taskId, { state: 'running', message: message || '실행 중...' });
  }

  async completeProgress(taskId: string, message?: string, metadata?: Record<string, unknown>): Promise<ProgressData | null> {
    return this.updateProgress(taskId, { 
      state: 'completed', 
      percentage: 100, 
      message: message || '완료됨',
      metadata 
    });
  }

  async failProgress(taskId: string, error: string, message?: string): Promise<ProgressData | null> {
    return this.updateProgress(taskId, { 
      state: 'failed', 
      error, 
      message: message || `실패: ${error}` 
    });
  }

  async pauseProgress(taskId: string, message?: string): Promise<ProgressData | null> {
    return this.updateProgress(taskId, { state: 'paused', message: message || '일시 정지됨' });
  }

  async resumeProgress(taskId: string, message?: string): Promise<ProgressData | null> {
    return this.updateProgress(taskId, { state: 'running', message: message || '재개됨' });
  }

  async cancelProgress(taskId: string, message?: string): Promise<ProgressData | null> {
    return this.updateProgress(taskId, { state: 'cancelled', message: message || '취소됨' });
  }

  async updateStep(taskId: string, stepName: string, completedSteps: number, message?: string): Promise<ProgressData | null> {
    return this.updateProgress(taskId, { 
      currentStep: stepName, 
      completedSteps, 
      message: message || `단계 진행: ${stepName}` 
    });
  }

  async deleteProgress(taskId: string): Promise<boolean> {
    const key = `${PROGRESS_KEY_PREFIX}${taskId}`;
    const result = await redis.del(key);
    await this.removeFromIndex(taskId);
    return result > 0;
  }

  async queryProgress(options: ProgressQueryOptions): Promise<ProgressData[]> {
    const { taskId, taskType, state, limit = 50, offset = 0 } = options;
    const results: ProgressData[] = [];

    if (taskId) {
      const progress = await this.getProgress(taskId);
      if (progress) results.push(progress);
      return results;
    }

    const indexKey = `${PROGRESS_INDEX_KEY}:${taskType || 'all'}`;
    const taskIds = await redis.lrange(indexKey, offset, offset + limit - 1);

    for (const id of taskIds) {
      const progress = await this.getProgress(id);
      if (progress) {
        if (taskType && progress.taskType !== taskType) continue;
        if (state && progress.state !== state) continue;
        results.push(progress);
      }
    }

    return results;
  }

  async getActiveProgress(taskType?: string): Promise<ProgressData[]> {
    return this.queryProgress({ taskType, state: 'running', limit: 100 });
  }

  async getProgressStats(taskType?: string): Promise<{
    total: number;
    byState: Record<ProgressState, number>;
    averagePercentage: number;
  }> {
    const allProgress = await this.queryProgress({ taskType, limit: 1000 });
    
    const byState: Record<ProgressState, number> = {
      waiting: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    let totalPercentage = 0;
    
    for (const p of allProgress) {
      byState[p.state]++;
      totalPercentage += p.percentage;
    }

    return {
      total: allProgress.length,
      byState,
      averagePercentage: allProgress.length > 0 ? Math.round(totalPercentage / allProgress.length) : 0,
    };
  }

  async subscribeToProgress(taskId: string, callback: (progress: ProgressData) => void): Promise<() => void> {
    const channel = `progress:${taskId}`;
    const subscriber = redis.duplicate();
    
    await subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const progress = JSON.parse(message) as ProgressData;
          progress.startedAt = new Date(progress.startedAt);
          progress.updatedAt = new Date(progress.updatedAt);
          if (progress.completedAt) progress.completedAt = new Date(progress.completedAt);
          callback(progress);
        } catch {
          // 무시
        }
      }
    });

    return () => {
      subscriber.unsubscribe(channel);
      subscriber.quit();
    };
  }

  private async saveProgress(progress: ProgressData, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    const key = `${PROGRESS_KEY_PREFIX}${progress.taskId}`;
    const data = JSON.stringify(progress);
    await redis.setex(key, ttlSeconds, data);
    
    const channel = `progress:${progress.taskId}`;
    await redis.publish(channel, data);
  }

  private async addToIndex(taskId: string, taskType: string): Promise<void> {
    const typeIndexKey = `${PROGRESS_INDEX_KEY}:${taskType}`;
    const allIndexKey = `${PROGRESS_INDEX_KEY}:all`;
    
    await redis.lpush(typeIndexKey, taskId);
    await redis.lpush(allIndexKey, taskId);
    
    await redis.ltrim(typeIndexKey, 0, 999);
    await redis.ltrim(allIndexKey, 0, 9999);
  }

  private async removeFromIndex(taskId: string): Promise<void> {
    const allIndexKey = `${PROGRESS_INDEX_KEY}:all`;
    await redis.lrem(allIndexKey, 0, taskId);
  }
}

export const progressService = new ProgressService();