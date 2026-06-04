import { dbLogger } from '@/lib/logger';
import { performQualityCheck, QualityThreshold, MonitoringResult } from './data-quality-monitor.service';
import { sendMetricsNotification } from './quality-notification.service';
import { recordMetrics } from './quality-trend.service';

export interface BatchJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: MonitoringResult;
  error?: string;
  progress: number;
}

export interface BatchSchedule {
  id: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  jobCount: number;
}

export interface BatchConfig {
  chunkSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
}

const jobs: BatchJob[] = [];
const schedules: BatchSchedule[] = [];
const DEFAULT_CONFIG: BatchConfig = {
  chunkSize: 1000,
  maxConcurrency: 3,
  retryAttempts: 3,
  retryDelayMs: 5000,
  timeoutMs: 300000,
};

let isProcessing = false;
let processingInterval: NodeJS.Timeout | null = null;

export function createBatchJob(
  name: string,
  scheduledAt: Date = new Date()
): BatchJob {
  const job: BatchJob = {
    id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    status: 'pending',
    scheduledAt,
    progress: 0,
  };

  jobs.push(job);
  return job;
}

export function getBatchJob(jobId: string): BatchJob | undefined {
  return jobs.find(j => j.id === jobId);
}

export function getBatchJobs(limit: number = 50): BatchJob[] {
  return jobs.slice(-limit);
}

export function cancelBatchJob(jobId: string): boolean {
  const job = jobs.find(j => j.id === jobId);
  if (job && job.status === 'pending') {
    job.status = 'cancelled';
    return true;
  }
  return false;
}

export async function executeBatchJob(
  job: BatchJob,
  businesses: Record<string, any>[],
  thresholds: QualityThreshold[] = [],
  config: BatchConfig = DEFAULT_CONFIG
): Promise<MonitoringResult> {
  job.status = 'running';
  job.startedAt = new Date();
  job.progress = 0;

  try {
    const chunks = chunkArray(businesses, config.chunkSize);
    let allResults: MonitoringResult[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt < config.retryAttempts) {
        try {
          const result = await performQualityCheck(chunk, thresholds);
          allResults.push(result);
          job.progress = Math.round(((i + 1) / chunks.length) * 100);
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          attempt++;
          if (attempt < config.retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, config.retryDelayMs));
          }
        }
      }

      if (lastError && attempt >= config.retryAttempts) {
        throw lastError;
      }
    }

    const mergedResult = mergeResults(allResults);
    job.status = 'completed';
    job.completedAt = new Date();
    job.result = mergedResult;

    recordMetrics(mergedResult.metrics);
    sendMetricsNotification(mergedResult.metrics, mergedResult.overallHealth);

    dbLogger.info({
      jobId: job.id,
      progress: job.progress,
      overallHealth: mergedResult.overallHealth,
    }, '배치 작업 완료');

    return mergedResult;
  } catch (error) {
    job.status = 'failed';
    job.completedAt = new Date();
    job.error = error instanceof Error ? error.message : String(error);

    dbLogger.error({
      jobId: job.id,
      error: job.error,
    }, '배치 작업 실패');

    throw error;
  }
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function mergeResults(results: MonitoringResult[]): MonitoringResult {
  if (results.length === 0) {
    return {
      metrics: {
        timestamp: new Date(),
        totalBusinesses: 0,
        averageCompletenessScore: 0,
        gradeDistribution: {},
        duplicateRate: 0,
        staleDataRate: 0,
        criticalIssuesCount: 0,
        crossValidationScore: 0,
      },
      alerts: [],
      recommendations: [],
      overallHealth: 'healthy',
    };
  }

  const mergedMetrics = {
    timestamp: new Date(),
    totalBusinesses: results.reduce((sum, r) => sum + r.metrics.totalBusinesses, 0),
    averageCompletenessScore: Math.round(
      results.reduce((sum, r) => sum + r.metrics.averageCompletenessScore, 0) / results.length
    ),
    gradeDistribution: mergeGradeDistributions(results.map(r => r.metrics.gradeDistribution)),
    duplicateRate: Math.round(
      results.reduce((sum, r) => sum + r.metrics.duplicateRate, 0) / results.length
    ),
    staleDataRate: Math.round(
      results.reduce((sum, r) => sum + r.metrics.staleDataRate, 0) / results.length
    ),
    criticalIssuesCount: results.reduce((sum, r) => sum + r.metrics.criticalIssuesCount, 0),
    crossValidationScore: Math.round(
      results.reduce((sum, r) => sum + r.metrics.crossValidationScore, 0) / results.length
    ),
  };

  const allAlerts = results.flatMap(r => r.alerts);
  const allRecommendations = [...new Set(results.flatMap(r => r.recommendations))];

  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical');
  const highAlerts = allAlerts.filter(a => a.severity === 'high');

  let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (criticalAlerts.length > 0) {
    overallHealth = 'critical';
  } else if (highAlerts.length > 0 || allAlerts.length > 5) {
    overallHealth = 'warning';
  }

  return {
    metrics: mergedMetrics,
    alerts: allAlerts,
    recommendations: allRecommendations,
    overallHealth,
  };
}

function mergeGradeDistributions(distributions: Record<string, number>[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const dist of distributions) {
    for (const [grade, count] of Object.entries(dist)) {
      merged[grade] = (merged[grade] || 0) + count;
    }
  }
  return merged;
}

export function createSchedule(
  name: string,
  cronExpression: string,
  enabled: boolean = true
): BatchSchedule {
  const schedule: BatchSchedule = {
    id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    cronExpression,
    enabled,
    jobCount: 0,
  };

  schedules.push(schedule);
  return schedule;
}

export function getSchedules(): BatchSchedule[] {
  return [...schedules];
}

export function updateSchedule(
  scheduleId: string,
  updates: Partial<Pick<BatchSchedule, 'name' | 'cronExpression' | 'enabled'>>
): boolean {
  const schedule = schedules.find(s => s.id === scheduleId);
  if (schedule) {
    Object.assign(schedule, updates);
    return true;
  }
  return false;
}

export function deleteSchedule(scheduleId: string): boolean {
  const index = schedules.findIndex(s => s.id === scheduleId);
  if (index >= 0) {
    schedules.splice(index, 1);
    return true;
  }
  return false;
}

export function startBatchProcessor(
  getBusinesses: () => Promise<Record<string, any>[]>,
  config: BatchConfig = DEFAULT_CONFIG
): void {
  if (isProcessing) return;

  isProcessing = true;
  processingInterval = setInterval(async () => {
    if (!isProcessing) return;

    const pendingJobs = jobs.filter(j => j.status === 'pending');
    for (const job of pendingJobs) {
      try {
        const businesses = await getBusinesses();
        await executeBatchJob(job, businesses, [], config);
      } catch (error) {
        dbLogger.error({ jobId: job.id, error: error instanceof Error ? error.message : String(error) }, '배치 처리 중 오류');
      }
    }
  }, 60000);
}

export function stopBatchProcessor(): void {
  isProcessing = false;
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
}

export function getBatchStats(): {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
} {
  return {
    totalJobs: jobs.length,
    pendingJobs: jobs.filter(j => j.status === 'pending').length,
    runningJobs: jobs.filter(j => j.status === 'running').length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    failedJobs: jobs.filter(j => j.status === 'failed').length,
    cancelledJobs: jobs.filter(j => j.status === 'cancelled').length,
  };
}

export function clearCompletedJobs(): number {
  const initialLength = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed');
  jobs.splice(0, completedJobs.length);
  return initialLength - jobs.length;
}
