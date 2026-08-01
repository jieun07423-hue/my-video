import { syncLogger, dbLogger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import db from '@/lib/db';

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface MetricSummary {
  count: number;
  sum: number;
  min: number;
  max: number;
  average: number;
  median: number;
  stdDev: number;
  percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface SyncMetrics {
  totalSynced: number;
  successRate: number;
  averageProcessingTimeMs: number;
  totalErrors: number;
  errorsByType: Record<string, number>;
  itemsPerSecond: number;
  lastSyncAt?: Date;
  timeSeries: TimeSeriesPoint[];
}

export interface DuplicateMetrics {
  totalCompared: number;
  duplicatesFound: number;
  exactMatches: number;
  highSimilarity: number;
  mediumSimilarity: number;
  lowSimilarity: number;
  averageSimilarity: number;
  detectionTimeMs: number;
  comparisonsPerSecond: number;
  topMatchFields: Record<string, number>;
  timeSeries: TimeSeriesPoint[];
}

export interface BusinessMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  inactiveBusinesses: number;
  dissolvedBusinesses: number;
  pendingBusinesses: number;
  newToday: number;
  verifiedBusinesses: number;
  syncedBusinesses: number;
  byIndustry: Record<string, number>;
  byStatus: Record<string, number>;
  byRecordStatus: Record<string, number>;
  growthRate: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  heapUsed: number;
  heapTotal: number;
  eventLoopLag: number;
  activeHandles: number;
  uptime: number;
}

export interface DashboardData {
  sync: SyncMetrics;
  duplicates: DuplicateMetrics;
  businesses: BusinessMetrics;
  system: SystemMetrics;
  updatedAt: Date;
}

const METRICS_KEY_PREFIX = 'metrics:';
const METRICS_TTL = 86400 * 7;

function calculatePercentiles(sortedValues: number[]): MetricSummary['percentiles'] {
  const getPercentile = (p: number) => {
    const index = Math.ceil(p / 100 * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  };
  return {
    p50: getPercentile(50),
    p75: getPercentile(75),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
  };
}

function calculateSummary(values: number[]): MetricSummary {
  if (values.length === 0) {
    return {
      count: 0, sum: 0, min: 0, max: 0, average: 0, median: 0, stdDev: 0,
      percentiles: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 }
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const average = sum / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - average, 2), 0) / sorted.length;

  return {
    count: sorted.length,
    sum,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    average: Math.round(average * 100) / 100,
    median,
    stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
    percentiles: calculatePercentiles(sorted),
  };
}

export class StatisticService {
  private metricsCache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly CACHE_TTL = 60000;

  async recordSyncMetric(
    taskId: string,
    metrics: {
      processed: number;
      success: number;
      failed: number;
      processingTimeMs: number;
      errors: string[];
    }
  ): Promise<void> {
    const key = `${METRICS_KEY_PREFIX}sync:${taskId}`;
    const timestamp = Date.now();

    const data = {
      taskId,
      timestamp,
      processed: metrics.processed,
      success: metrics.success,
      failed: metrics.failed,
      processingTimeMs: metrics.processingTimeMs,
      errors: metrics.errors,
    };

    await redis.lpush(key, JSON.stringify(data));
    await redis.ltrim(key, 0, 999);
    await redis.expire(key, METRICS_TTL);

    await this.recordTimeSeries('sync:processed', timestamp, metrics.processed);
    await this.recordTimeSeries('sync:success_rate', timestamp, metrics.processed > 0 ? metrics.success / metrics.processed : 0);
    await this.recordTimeSeries('sync:processing_time', timestamp, metrics.processingTimeMs);

    this.invalidateCache('sync');
    syncLogger.debug({ taskId, processed: metrics.processed }, '동기화 메트릭 기록');
  }

  async recordDuplicateMetric(
    taskId: string,
    metrics: {
      totalCompared: number;
      duplicatesFound: number;
      exactMatches: number;
      highSimilarity: number;
      mediumSimilarity: number;
      lowSimilarity: number;
      detectionTimeMs: number;
      matchingFields: string[];
    }
  ): Promise<void> {
    const key = `${METRICS_KEY_PREFIX}duplicates:${taskId}`;
    const timestamp = Date.now();

    const data = {
      taskId,
      timestamp,
      ...metrics,
    };

    await redis.lpush(key, JSON.stringify(data));
    await redis.ltrim(key, 0, 999);
    await redis.expire(key, METRICS_TTL);

    await this.recordTimeSeries('duplicates:found', timestamp, metrics.duplicatesFound);
    await this.recordTimeSeries('duplicates:detection_time', timestamp, metrics.detectionTimeMs);
    await this.recordTimeSeries('duplicates:comparisons_per_sec', timestamp, 
      metrics.detectionTimeMs > 0 ? Math.round(metrics.totalCompared / (metrics.detectionTimeMs / 1000)) : 0);

    for (const field of metrics.matchingFields) {
      await this.incrementCounter(`duplicates:field:${field}`, 1);
    }

    this.invalidateCache('duplicates');
    syncLogger.debug({ taskId, duplicatesFound: metrics.duplicatesFound }, '중복 탐지 메트릭 기록');
  }

  async recordBusinessMetric(type: 'created' | 'updated' | 'verified' | 'deleted', count: number = 1): Promise<void> {
    const key = `${METRICS_KEY_PREFIX}business:${type}`;
    const timestamp = Date.now();

    await redis.hincrby(key, 'total', count);
    await redis.hincrby(key, `daily:${new Date().toISOString().split('T')[0]}`, count);
    await redis.expire(key, METRICS_TTL);

    await this.recordTimeSeries(`business:${type}`, timestamp, count);
    this.invalidateCache('business');
  }

  async getSyncMetrics(since?: Date): Promise<SyncMetrics> {
    const cacheKey = `sync:${since?.toISOString() || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as SyncMetrics;

    const cutoffTime = since?.getTime() || Date.now() - 86400000;
    const keys = await redis.keys(`${METRICS_KEY_PREFIX}sync:*`);
    
    let totalSynced = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalProcessingTime = 0;
    const errorsByType: Record<string, number> = {};
    const timeSeries: TimeSeriesPoint[] = [];
    let lastSyncAt: Date | undefined;

    for (const key of keys) {
      const items = await redis.lrange(key, 0, -1);
      for (const itemStr of items) {
        try {
          const item = JSON.parse(itemStr);
          if (item.timestamp < cutoffTime) continue;

          totalSynced += item.processed || 0;
          totalSuccess += item.success || 0;
          totalFailed += item.failed || 0;
          totalProcessingTime += item.processingTimeMs || 0;

          if (item.errors && Array.isArray(item.errors)) {
            for (const error of item.errors) {
              const errorType = error.split(':')[0] || 'unknown';
              errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
            }
          }

          timeSeries.push({ timestamp: new Date(item.timestamp), value: item.processed || 0 });
          
          if (!lastSyncAt || item.timestamp > lastSyncAt.getTime()) {
            lastSyncAt = new Date(item.timestamp);
          }
        } catch {
          continue;
        }
      }
    }

    const successRate = totalSynced > 0 ? totalSuccess / totalSynced : 0;
    const averageProcessingTimeMs = keys.length > 0 ? totalProcessingTime / keys.length : 0;
    const timeSpanHours = (Date.now() - cutoffTime) / 3600000;
    const itemsPerSecond = timeSpanHours > 0 ? totalSynced / (timeSpanHours * 3600) : 0;

    const result: SyncMetrics = {
      totalSynced,
      successRate: Math.round(successRate * 10000) / 100,
      averageProcessingTimeMs: Math.round(averageProcessingTimeMs),
      totalErrors: totalFailed,
      errorsByType,
      itemsPerSecond: Math.round(itemsPerSecond * 100) / 100,
      lastSyncAt,
      timeSeries: timeSeries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async getDuplicateMetrics(since?: Date): Promise<DuplicateMetrics> {
    const cacheKey = `duplicates:${since?.toISOString() || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as DuplicateMetrics;

    const cutoffTime = since?.getTime() || Date.now() - 86400000;
    const keys = await redis.keys(`${METRICS_KEY_PREFIX}duplicates:*`);
    
    let totalCompared = 0;
    let totalDuplicates = 0;
    let totalExact = 0;
    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;
    let totalDetectionTime = 0;
    const matchingFields: Record<string, number> = {};
    const timeSeries: TimeSeriesPoint[] = [];
    let detectionCount = 0;

    for (const key of keys) {
      const items = await redis.lrange(key, 0, -1);
      for (const itemStr of items) {
        try {
          const item = JSON.parse(itemStr);
          if (item.timestamp < cutoffTime) continue;

          totalCompared += item.totalCompared || 0;
          totalDuplicates += item.duplicatesFound || 0;
          totalExact += item.exactMatches || 0;
          totalHigh += item.highSimilarity || 0;
          totalMedium += item.mediumSimilarity || 0;
          totalLow += item.lowSimilarity || 0;
          totalDetectionTime += item.detectionTimeMs || 0;
          detectionCount++;

          if (item.matchingFields && Array.isArray(item.matchingFields)) {
            for (const field of item.matchingFields) {
              matchingFields[field] = (matchingFields[field] || 0) + 1;
            }
          }

          timeSeries.push({ timestamp: new Date(item.timestamp), value: item.duplicatesFound || 0 });
        } catch {
          continue;
        }
      }
    }

    const averageSimilarity = totalDuplicates > 0 
      ? (totalExact * 1 + totalHigh * 0.9 + totalMedium * 0.75 + totalLow * 0.5) / totalDuplicates 
      : 0;
    const averageDetectionTime = detectionCount > 0 ? totalDetectionTime / detectionCount : 0;
    const comparisonsPerSecond = averageDetectionTime > 0 ? Math.round(totalCompared / (averageDetectionTime / 1000)) : 0;

    const result: DuplicateMetrics = {
      totalCompared,
      duplicatesFound: totalDuplicates,
      exactMatches: totalExact,
      highSimilarity: totalHigh,
      mediumSimilarity: totalMedium,
      lowSimilarity: totalLow,
      averageSimilarity: Math.round(averageSimilarity * 10000) / 100,
      detectionTimeMs: Math.round(averageDetectionTime),
      comparisonsPerSecond,
      topMatchFields: matchingFields,
      timeSeries: timeSeries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async getBusinessMetrics(): Promise<BusinessMetrics> {
    const cacheKey = 'business:current';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as BusinessMetrics;

    const [
      total,
      active,
      inactive,
      dissolved,
      pending,
      verified,
      synced,
      byStatus,
      byRecordStatus,
      byIndustry,
    ] = await Promise.all([
      db.business.count(),
      db.business.count({ where: { status: 'active' } }),
      db.business.count({ where: { status: 'inactive' } }),
      db.business.count({ where: { status: 'dissolved' } }),
      db.business.count({ where: { status: 'pending' } }),
      db.business.count({ where: { recordStatus: 'verified' } }),
      db.business.count({ where: { recordStatus: 'synced' } }),
      db.business.groupBy({ by: ['status'], _count: true }),
      db.business.groupBy({ by: ['recordStatus'], _count: true }),
      db.business.groupBy({ by: ['businessCode'], _count: true, where: { businessCode: { not: null } } }),
    ]);

    const yesterday = new Date(Date.now() - 86400000);
    const newToday = await db.business.count({
      where: { createdAt: { gte: yesterday } },
    });

    const statusMap: Record<string, number> = {};
    for (const item of byStatus) {
      statusMap[item.status] = item._count;
    }

    const recordStatusMap: Record<string, number> = {};
    for (const item of byRecordStatus) {
      recordStatusMap[item.recordStatus] = item._count;
    }

    const industryMap: Record<string, number> = {};
    for (const item of byIndustry) {
      if (item.businessCode) {
        industryMap[item.businessCode] = item._count;
      }
    }

    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const lastWeekCount = await db.business.count({
      where: { createdAt: { gte: weekAgo } },
    });
    const growthRate = lastWeekCount > 0 ? (total - lastWeekCount) / lastWeekCount : 0;

    const result: BusinessMetrics = {
      totalBusinesses: total,
      activeBusinesses: active,
      inactiveBusinesses: inactive,
      dissolvedBusinesses: dissolved,
      pendingBusinesses: pending,
      newToday,
      verifiedBusinesses: verified,
      syncedBusinesses: synced,
      byIndustry: industryMap,
      byStatus: statusMap,
      byRecordStatus: recordStatusMap,
      growthRate: Math.round(growthRate * 10000) / 100,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    
    return {
      cpuUsage: Math.round((cpu.user + cpu.system) / 1000000 * 100) / 100,
      memoryUsage: Math.round((mem.heapUsed / mem.heapTotal) * 10000) / 100,
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      eventLoopLag: 0,
      activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
      uptime: Math.round(process.uptime()),
    };
  }

  async getDashboardData(since?: Date): Promise<DashboardData> {
    const [sync, duplicates, businesses, system] = await Promise.all([
      this.getSyncMetrics(since),
      this.getDuplicateMetrics(since),
      this.getBusinessMetrics(),
      this.getSystemMetrics(),
    ]);

    return {
      sync,
      duplicates,
      businesses,
      system,
      updatedAt: new Date(),
    };
  }

  async getTimeSeries(metric: string, since?: Date, limit: number = 100): Promise<TimeSeriesPoint[]> {
    const key = `${METRICS_KEY_PREFIX}timeseries:${metric}`;
    const cutoffTime = since?.getTime() || Date.now() - 3600000;
    
    const items = await redis.lrange(key, 0, limit - 1);
    const result: TimeSeriesPoint[] = [];

    for (const itemStr of items) {
      try {
        const item = JSON.parse(itemStr);
        if (item.timestamp >= cutoffTime) {
          result.push({ timestamp: new Date(item.timestamp), value: item.value, label: item.label });
        }
      } catch {
        continue;
      }
    }

    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getSummary(metric: string, since?: Date): Promise<MetricSummary> {
    const points = await this.getTimeSeries(metric, since, 1000);
    const values = points.map(p => p.value);
    return calculateSummary(values);
  }

  async incrementCounter(name: string, value: number = 1): Promise<number> {
    const key = `${METRICS_KEY_PREFIX}counter:${name}`;
    const result = await redis.incrby(key, value);
    await redis.expire(key, METRICS_TTL);
    return result;
  }

  async getCounter(name: string): Promise<number> {
    const key = `${METRICS_KEY_PREFIX}counter:${name}`;
    const value = await redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  private async recordTimeSeries(metric: string, timestamp: number, value: number, label?: string): Promise<void> {
    const key = `${METRICS_KEY_PREFIX}timeseries:${metric}`;
    const data = JSON.stringify({ timestamp, value, label });
    await redis.lpush(key, data);
    await redis.ltrim(key, 0, 999);
    await redis.expire(key, METRICS_TTL);
  }

  private getFromCache(key: string): unknown | null {
    const cached = this.metricsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.metricsCache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.metricsCache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL });
  }

  private invalidateCache(prefix: string): void {
    for (const key of this.metricsCache.keys()) {
      if (key.startsWith(prefix)) {
        this.metricsCache.delete(key);
      }
    }
  }

  async recordSyncProgress(
    taskId: string,
    percentage: number,
    processed: number,
    total: number
  ): Promise<void> {
    const key = `${METRICS_KEY_PREFIX}sync_progress:${taskId}`;
    await redis.hset(key, {
      percentage: percentage.toString(),
      processed: processed.toString(),
      total: total.toString(),
      updatedAt: Date.now().toString(),
    });
    await redis.expire(key, 3600);
  }

  async recordSyncCompleted(
    taskId: string,
    processed: number,
    success: number,
    failed: number,
    durationMs: number
  ): Promise<void> {
    await this.recordSyncMetric(taskId, {
      processed,
      success,
      failed,
      processingTimeMs: durationMs,
      errors: [],
    });
    
    await redis.del(`${METRICS_KEY_PREFIX}sync_progress:${taskId}`);
    await this.incrementCounter('sync:completed', 1);
    await this.incrementCounter('sync:total_processed', processed);
    await this.incrementCounter('sync:total_success', success);
    await this.incrementCounter('sync:total_failed', failed);
  }

  async recordSyncFailed(
    taskId: string,
    error: string,
    processed: number,
    failed: number
  ): Promise<void> {
    await this.recordSyncMetric(taskId, {
      processed,
      success: 0,
      failed,
      processingTimeMs: 0,
      errors: [error],
    });
    
    await redis.del(`${METRICS_KEY_PREFIX}sync_progress:${taskId}`);
    await this.incrementCounter('sync:failed', 1);
  }

  async incrementBusinessCount(type: 'created' | 'updated' | 'verified' | 'deleted', count: number = 1): Promise<void> {
    await this.recordBusinessMetric(type, count);
  }

  async recordDuplicateDetection(
    taskId: string,
    duplicatesCount: number,
    exactMatches: number,
    highSimilarity: number
  ): Promise<void> {
    await this.recordDuplicateMetric(taskId, {
      totalCompared: 0,
      duplicatesFound: duplicatesCount,
      exactMatches,
      highSimilarity,
      mediumSimilarity: 0,
      lowSimilarity: 0,
      detectionTimeMs: 0,
      matchingFields: [],
    });
    await this.incrementCounter('duplicates:detected', duplicatesCount);
    await this.incrementCounter('duplicates:exact', exactMatches);
    await this.incrementCounter('duplicates:high', highSimilarity);
  }

  async recordDuplicateResolution(
    taskId: string,
    merged: number,
    deleted: number
  ): Promise<void> {
    await this.incrementCounter('duplicates:merged', merged);
    await this.incrementCounter('duplicates:deleted', deleted);
  }

  async cleanupOldMetrics(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - olderThanDays * 86400000;
    const patterns = [
      `${METRICS_KEY_PREFIX}sync:*`,
      `${METRICS_KEY_PREFIX}duplicates:*`,
      `${METRICS_KEY_PREFIX}business:*`,
      `${METRICS_KEY_PREFIX}timeseries:*`,
      `${METRICS_KEY_PREFIX}counter:*`,
    ];

    let deleted = 0;
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      for (const key of keys) {
        const items = await redis.lrange(key, 0, -1);
        let hasRecent = false;
        for (const itemStr of items) {
          try {
            const item = JSON.parse(itemStr);
            if (item.timestamp > cutoffTime) {
              hasRecent = true;
              break;
            }
          } catch {
            continue;
          }
        }
        if (!hasRecent) {
          await redis.del(key);
          deleted++;
        }
      }
    }

    syncLogger.info({ deletedKeys: deleted }, '오래된 메트릭 정리 완료');
    return deleted;
  }
}

export const statisticService = new StatisticService();