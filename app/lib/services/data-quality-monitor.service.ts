import { dbLogger } from '@/lib/logger';
import { evaluateCompleteness, evaluateBatchCompleteness } from './data-completeness.service';
import { detectDuplicates } from './duplicate-detection.service';

export interface QualityThreshold {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
  value: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
}

export interface QualityAlert {
  id: string;
  thresholdId: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface QualityMetrics {
  timestamp: Date;
  totalBusinesses: number;
  averageCompletenessScore: number;
  gradeDistribution: Record<string, number>;
  duplicateRate: number;
  staleDataRate: number;
  criticalIssuesCount: number;
  crossValidationScore: number;
}

export interface MonitoringResult {
  metrics: QualityMetrics;
  alerts: QualityAlert[];
  recommendations: string[];
  overallHealth: 'healthy' | 'warning' | 'critical';
}

const DEFAULT_THRESHOLDS: QualityThreshold[] = [
  {
    id: 'avg-completeness',
    name: '평균 완성도 점수',
    metric: 'averageCompletenessScore',
    operator: 'lt',
    value: 70,
    severity: 'high',
    enabled: true,
  },
  {
    id: 'duplicate-rate',
    name: '중복률',
    metric: 'duplicateRate',
    operator: 'gt',
    value: 10,
    severity: 'medium',
    enabled: true,
  },
  {
    id: 'stale-data-rate',
    name: '오래된 데이터 비율',
    metric: 'staleDataRate',
    operator: 'gt',
    value: 20,
    severity: 'high',
    enabled: true,
  },
  {
    id: 'critical-issues',
    name: '심각한 이슈 수',
    metric: 'criticalIssuesCount',
    operator: 'gt',
    value: 5,
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'cross-validation-score',
    name: '교차검증 점수',
    metric: 'crossValidationScore',
    operator: 'lt',
    value: 60,
    severity: 'medium',
    enabled: true,
  },
];

const alertHistory: QualityAlert[] = [];
const metricsHistory: QualityMetrics[] = [];
const MAX_HISTORY_SIZE = 1000;

export function getDefaultThresholds(): QualityThreshold[] {
  return [...DEFAULT_THRESHOLDS];
}

export function evaluateThreshold(value: number, threshold: QualityThreshold): boolean {
  switch (threshold.operator) {
    case 'gt': return value > threshold.value;
    case 'lt': return value < threshold.value;
    case 'gte': return value >= threshold.value;
    case 'lte': return value <= threshold.value;
    case 'eq': return value === threshold.value;
    case 'neq': return value !== threshold.value;
    default: return false;
  }
}

export function checkThresholds(
  metrics: QualityMetrics,
  thresholds: QualityThreshold[] = DEFAULT_THRESHOLDS
): QualityAlert[] {
  const alerts: QualityAlert[] = [];

  for (const threshold of thresholds) {
    if (!threshold.enabled) continue;

    const metricValue = metrics[threshold.metric as keyof QualityMetrics];
    if (typeof metricValue !== 'number') continue;

    if (evaluateThreshold(metricValue, threshold)) {
      const alert: QualityAlert = {
        id: `alert-${Date.now()}-${threshold.id}`,
        thresholdId: threshold.id,
        metric: threshold.metric,
        currentValue: metricValue,
        thresholdValue: threshold.value,
        severity: threshold.severity,
        message: generateAlertMessage(threshold, metricValue),
        timestamp: new Date(),
        acknowledged: false,
      };
      alerts.push(alert);
    }
  }

  return alerts;
}

function generateAlertMessage(threshold: QualityThreshold, currentValue: number): string {
  const operatorText = {
    gt: '초과',
    lt: '미달',
    gte: '이상',
    lte: '이하',
    eq: '일치',
    neq: '불일치',
  }[threshold.operator];

  return `${threshold.name}이(가) ${threshold.value}${operatorText}했습니다. 현재 값: ${currentValue}`;
}

export async function collectMetrics(
  businesses: Record<string, any>[]
): Promise<QualityMetrics> {
  const completenessResult = evaluateBatchCompleteness(businesses);
  const duplicateResult = detectDuplicates(businesses, { maxResults: 1000 });

  const staleBusinesses = completenessResult.scores.filter(s => s.freshness.isStale).length;
  const criticalIssues = completenessResult.scores.reduce(
    (sum, s) => sum + s.crossValidation.issues.filter(i => i.severity === 'critical').length,
    0
  );

  const gradeDistribution: Record<string, number> = {};
  for (const score of completenessResult.scores) {
    gradeDistribution[score.grade] = (gradeDistribution[score.grade] || 0) + 1;
  }

  const metrics: QualityMetrics = {
    timestamp: new Date(),
    totalBusinesses: businesses.length,
    averageCompletenessScore: completenessResult.report.averageScore,
    gradeDistribution,
    duplicateRate: businesses.length > 0
      ? Math.round((duplicateResult.duplicatesFound / businesses.length) * 100)
      : 0,
    staleDataRate: businesses.length > 0
      ? Math.round((staleBusinesses / businesses.length) * 100)
      : 0,
    criticalIssuesCount: criticalIssues,
    crossValidationScore: completenessResult.report.crossValidationSummary.averageCrossScore,
  };

  metricsHistory.push(metrics);
  if (metricsHistory.length > MAX_HISTORY_SIZE) {
    metricsHistory.shift();
  }

  return metrics;
}

export function analyzeTrends(
  historicalMetrics: QualityMetrics[] = metricsHistory,
  windowSize: number = 10
): {
  completenessTrend: 'improving' | 'declining' | 'stable';
  duplicateTrend: 'improving' | 'declining' | 'stable';
  staleTrend: 'improving' | 'declining' | 'stable';
  overallTrend: 'improving' | 'declining' | 'stable';
  changeRate: number;
} {
  if (historicalMetrics.length < 2) {
    return {
      completenessTrend: 'stable',
      duplicateTrend: 'stable',
      staleTrend: 'stable',
      overallTrend: 'stable',
      changeRate: 0,
    };
  }

  const recentMetrics = historicalMetrics.slice(-windowSize);
  const olderMetrics = historicalMetrics.slice(-windowSize * 2, -windowSize);

  if (olderMetrics.length === 0) {
    return {
      completenessTrend: 'stable',
      duplicateTrend: 'stable',
      staleTrend: 'stable',
      overallTrend: 'stable',
      changeRate: 0,
    };
  }

  const recentAvgCompleteness = recentMetrics.reduce((sum, m) => sum + m.averageCompletenessScore, 0) / recentMetrics.length;
  const olderAvgCompleteness = olderMetrics.reduce((sum, m) => sum + m.averageCompletenessScore, 0) / olderMetrics.length;

  const recentAvgDuplicate = recentMetrics.reduce((sum, m) => sum + m.duplicateRate, 0) / recentMetrics.length;
  const olderAvgDuplicate = olderMetrics.reduce((sum, m) => sum + m.duplicateRate, 0) / olderMetrics.length;

  const recentAvgStale = recentMetrics.reduce((sum, m) => sum + m.staleDataRate, 0) / recentMetrics.length;
  const olderAvgStale = olderMetrics.reduce((sum, m) => sum + m.staleDataRate, 0) / olderMetrics.length;

  const completenessDiff = recentAvgCompleteness - olderAvgCompleteness;
  const duplicateDiff = recentAvgDuplicate - olderAvgDuplicate;
  const staleDiff = recentAvgStale - olderAvgStale;

  const completenessTrend = completenessDiff > 2 ? 'improving' : completenessDiff < -2 ? 'declining' : 'stable';
  const duplicateTrend = duplicateDiff < -1 ? 'improving' : duplicateDiff > 1 ? 'declining' : 'stable';
  const staleTrend = staleDiff < -1 ? 'improving' : staleDiff > 1 ? 'declining' : 'stable';

  const overallScore = (completenessDiff * 2) + (-duplicateDiff * 1.5) + (-staleDiff * 1.5);
  const overallTrend = overallScore > 2 ? 'improving' : overallScore < -2 ? 'declining' : 'stable';

  return {
    completenessTrend,
    duplicateTrend,
    staleTrend,
    overallTrend,
    changeRate: Math.round(overallScore * 10) / 10,
  };
}

export function generateRecommendations(
  metrics: QualityMetrics,
  trends: ReturnType<typeof analyzeTrends>
): string[] {
  const recommendations: string[] = [];

  if (metrics.averageCompletenessScore < 70) {
    recommendations.push('데이터 완성도가 낮습니다. 누락된 필드를 보완하세요.');
  }

  if (metrics.duplicateRate > 10) {
    recommendations.push('중복 데이터 비율이 높습니다. 중복 탐지 및 병합을 수행하세요.');
  }

  if (metrics.staleDataRate > 20) {
    recommendations.push('오래된 데이터가 많습니다. 데이터 업데이트를 수행하세요.');
  }

  if (metrics.criticalIssuesCount > 5) {
    recommendations.push('심각한 데이터 이슈가 많습니다. 즉시 수정이 필요합니다.');
  }

  if (trends.overallTrend === 'declining') {
    recommendations.push('데이터 품질이 하락 추세입니다. 원인을 분석하고 개선 조치를 취하세요.');
  }

  if (trends.duplicateTrend === 'declining') {
    recommendations.push('중복 데이터가 증가 추세입니다. 데이터 입력 프로세스를 검토하세요.');
  }

  if (recommendations.length === 0) {
    recommendations.push('데이터 품질이 양호한 상태입니다. 현재 수준을 유지하세요.');
  }

  return recommendations;
}

export async function performQualityCheck(
  businesses: Record<string, any>[],
  thresholds: QualityThreshold[] = DEFAULT_THRESHOLDS
): Promise<MonitoringResult> {
  const metrics = await collectMetrics(businesses);
  const alerts = checkThresholds(metrics, thresholds);

  alerts.forEach(alert => {
    alertHistory.push(alert);
    if (alertHistory.length > MAX_HISTORY_SIZE) {
      alertHistory.shift();
    }
  });

  const trends = analyzeTrends();
  const recommendations = generateRecommendations(metrics, trends);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const highAlerts = alerts.filter(a => a.severity === 'high');

  let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (criticalAlerts.length > 0) {
    overallHealth = 'critical';
  } else if (highAlerts.length > 0 || alerts.length > 2) {
    overallHealth = 'warning';
  }

  dbLogger.info({
    totalBusinesses: metrics.totalBusinesses,
    averageScore: metrics.averageCompletenessScore,
    alertsCount: alerts.length,
    overallHealth,
  }, '데이터 품질 검사 완료');

  return {
    metrics,
    alerts,
    recommendations,
    overallHealth,
  };
}

export function getAlertHistory(limit: number = 100): QualityAlert[] {
  return alertHistory.slice(-limit);
}

export function getMetricsHistory(limit: number = 100): QualityMetrics[] {
  return metricsHistory.slice(-limit);
}

export function acknowledgeAlert(alertId: string): boolean {
  const alert = alertHistory.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

export function getUnacknowledgedAlerts(): QualityAlert[] {
  return alertHistory.filter(a => !a.acknowledged);
}
