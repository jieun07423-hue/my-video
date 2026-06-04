import { dbLogger } from '@/lib/logger';
import { QualityMetrics } from './data-quality-monitor.service';

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface TrendAnalysis {
  metric: string;
  dataPoints: TrendDataPoint[];
  trend: 'up' | 'down' | 'stable';
  changeRate: number;
  volatility: number;
  forecast: TrendForecast[];
  seasonality?: SeasonalityInfo;
}

export interface TrendForecast {
  timestamp: Date;
  predictedValue: number;
  confidence: number;
}

export interface SeasonalityInfo {
  detected: boolean;
  period?: number;
  strength?: number;
}

export interface TrendReport {
  generatedAt: Date;
  period: { start: Date; end: Date };
  metrics: TrendAnalysis[];
  insights: TrendInsight[];
  overallTrend: 'improving' | 'declining' | 'stable';
  score: number;
}

export interface TrendInsight {
  type: 'improvement' | 'decline' | 'anomaly' | 'seasonality';
  metric: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  recommendation?: string;
}

const metricsHistory: QualityMetrics[] = [];
const MAX_HISTORY_SIZE = 5000;

export function recordMetrics(metrics: QualityMetrics): void {
  metricsHistory.push(metrics);
  if (metricsHistory.length > MAX_HISTORY_SIZE) {
    metricsHistory.shift();
  }
}

export function getMetricsHistory(): QualityMetrics[] {
  return [...metricsHistory];
}

export function clearMetricsHistory(): void {
  metricsHistory.length = 0;
}

export function analyzeTrend(
  dataPoints: TrendDataPoint[],
  metricName: string
): TrendAnalysis {
  if (dataPoints.length < 2) {
    return {
      metric: metricName,
      dataPoints,
      trend: 'stable',
      changeRate: 0,
      volatility: 0,
      forecast: [],
    };
  }

  const values = dataPoints.map(dp => dp.value);
  const trend = calculateTrendDirection(values);
  const changeRate = calculateChangeRate(values);
  const volatility = calculateVolatility(values);
  const forecast = generateForecast(dataPoints, 5);
  const seasonality = detectSeasonality(values);

  return {
    metric: metricName,
    dataPoints,
    trend,
    changeRate,
    volatility,
    forecast,
    seasonality,
  };
}

function calculateTrendDirection(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }

  if (denominator === 0) return 'stable';

  const slope = numerator / denominator;
  const threshold = yMean * 0.02;

  if (slope > threshold) return 'up';
  if (slope < -threshold) return 'down';
  return 'stable';
}

function calculateChangeRate(values: number[]): number {
  if (values.length < 2) return 0;

  const recent = values.slice(-5);
  const older = values.slice(-10, -5);

  if (older.length === 0) return 0;

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  if (olderAvg === 0) return 0;

  return Math.round(((recentAvg - olderAvg) / olderAvg) * 100 * 10) / 10;
}

function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.round(Math.sqrt(variance) * 10) / 10;
}

function generateForecast(
  dataPoints: TrendDataPoint[],
  periods: number
): TrendForecast[] {
  if (dataPoints.length < 3) return [];

  const values = dataPoints.map(dp => dp.value);
  const n = values.length;

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  const forecast: TrendForecast[] = [];
  const lastTimestamp = dataPoints[dataPoints.length - 1].timestamp;

  for (let i = 1; i <= periods; i++) {
    const predictedValue = slope * (n + i - 1) + intercept;
    const confidence = Math.max(0.5, 1 - (i * 0.1));

    forecast.push({
      timestamp: new Date(lastTimestamp.getTime() + i * 24 * 60 * 60 * 1000),
      predictedValue: Math.round(predictedValue * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  return forecast;
}

function detectSeasonality(values: number[]): SeasonalityInfo {
  if (values.length < 14) {
    return { detected: false };
  }

  const period = 7;
  const周期Strength = calculateSeasonalStrength(values, period);

  if (周期Strength > 0.3) {
    return {
      detected: true,
      period,
      strength: Math.round(周期Strength * 100) / 100,
    };
  }

  return { detected: false };
}

function calculateSeasonalStrength(values: number[], period: number): number {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;

  let totalVariance = 0;
  let seasonalVariance = 0;

  for (let i = 0; i < n; i++) {
    totalVariance += Math.pow(values[i] - mean, 2);
  }

  const seasonalMeans: number[] = [];
  for (let p = 0; p < period; p++) {
    const seasonValues = values.filter((_, i) => i % period === p);
    if (seasonValues.length > 0) {
      seasonalMeans.push(seasonValues.reduce((a, b) => a + b, 0) / seasonValues.length);
    }
  }

  const seasonalMean = seasonalMeans.reduce((a, b) => a + b, 0) / seasonalMeans.length;
  for (const sm of seasonalMeans) {
    seasonalVariance += Math.pow(sm - seasonalMean, 2);
  }

  if (totalVariance === 0) return 0;
  return seasonalVariance / totalVariance;
}

export function generateTrendReport(
  periodDays: number = 30
): TrendReport {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const relevantMetrics = metricsHistory.filter(
    m => m.timestamp >= periodStart
  );

  if (relevantMetrics.length === 0) {
    return {
      generatedAt: now,
      period: { start: periodStart, end: now },
      metrics: [],
      insights: [],
      overallTrend: 'stable',
      score: 0,
    };
  }

  const completenessData: TrendDataPoint[] = relevantMetrics.map(m => ({
    timestamp: m.timestamp,
    value: m.averageCompletenessScore,
  }));

  const duplicateData: TrendDataPoint[] = relevantMetrics.map(m => ({
    timestamp: m.timestamp,
    value: m.duplicateRate,
  }));

  const staleData: TrendDataPoint[] = relevantMetrics.map(m => ({
    timestamp: m.timestamp,
    value: m.staleDataRate,
  }));

  const criticalData: TrendDataPoint[] = relevantMetrics.map(m => ({
    timestamp: m.timestamp,
    value: m.criticalIssuesCount,
  }));

  const metrics: TrendAnalysis[] = [
    analyzeTrend(completenessData, 'averageCompletenessScore'),
    analyzeTrend(duplicateData, 'duplicateRate'),
    analyzeTrend(staleData, 'staleDataRate'),
    analyzeTrend(criticalData, 'criticalIssuesCount'),
  ];

  const insights = generateInsights(metrics);

  const overallScore = calculateOverallScore(metrics);
  const overallTrend = overallScore > 5 ? 'improving' : overallScore < -5 ? 'declining' : 'stable';

  return {
    generatedAt: now,
    period: { start: periodStart, end: now },
    metrics,
    insights,
    overallTrend,
    score: overallScore,
  };
}

function generateInsights(metrics: TrendAnalysis[]): TrendInsight[] {
  const insights: TrendInsight[] = [];

  for (const metric of metrics) {
    if (metric.trend === 'up' && metric.changeRate > 5) {
      insights.push({
        type: 'improvement',
        metric: metric.metric,
        message: `${metric.metric}이(가) 개선되고 있습니다. (${metric.changeRate}% 증가)`,
        severity: 'info',
      });
    } else if (metric.trend === 'down' && metric.changeRate < -5) {
      insights.push({
        type: 'decline',
        metric: metric.metric,
        message: `${metric.metric}이(가) 하락하고 있습니다. (${metric.changeRate}% 감소)`,
        severity: 'warning',
        recommendation: `${metric.metric} 개선을 위한 조치가 필요합니다.`,
      });
    }

    if (metric.volatility > 20) {
      insights.push({
        type: 'anomaly',
        metric: metric.metric,
        message: `${metric.metric}의 변동성이 높습니다.`,
        severity: 'warning',
      });
    }

    if (metric.seasonality?.detected) {
      insights.push({
        type: 'seasonality',
        metric: metric.metric,
        message: `${metric.metric}에 계절성이 감지되었습니다. (주기: ${metric.seasonality.period}일)`,
        severity: 'info',
      });
    }
  }

  return insights;
}

function calculateOverallScore(metrics: TrendAnalysis[]): number {
  let score = 0;

  for (const metric of metrics) {
    if (metric.metric === 'averageCompletenessScore') {
      score += metric.changeRate * 2;
    } else if (metric.metric === 'duplicateRate') {
      score -= metric.changeRate * 1.5;
    } else if (metric.metric === 'staleDataRate') {
      score -= metric.changeRate * 1.5;
    } else if (metric.metric === 'criticalIssuesCount') {
      score -= metric.changeRate * 3;
    }
  }

  return Math.round(score * 10) / 10;
}

export function comparePeriods(
  period1Start: Date,
  period1End: Date,
  period2Start: Date,
  period2End: Date
): {
  period1: TrendReport;
  period2: TrendReport;
  comparison: {
    completenessChange: number;
    duplicateChange: number;
    staleChange: number;
    overallImprovement: boolean;
  };
} {
  const period1Metrics = metricsHistory.filter(
    m => m.timestamp >= period1Start && m.timestamp <= period1End
  );

  const period2Metrics = metricsHistory.filter(
    m => m.timestamp >= period2Start && m.timestamp <= period2End
  );

  const avgCompleteness1 = period1Metrics.length > 0
    ? period1Metrics.reduce((sum, m) => sum + m.averageCompletenessScore, 0) / period1Metrics.length
    : 0;

  const avgCompleteness2 = period2Metrics.length > 0
    ? period2Metrics.reduce((sum, m) => sum + m.averageCompletenessScore, 0) / period2Metrics.length
    : 0;

  const avgDuplicate1 = period1Metrics.length > 0
    ? period1Metrics.reduce((sum, m) => sum + m.duplicateRate, 0) / period1Metrics.length
    : 0;

  const avgDuplicate2 = period2Metrics.length > 0
    ? period2Metrics.reduce((sum, m) => sum + m.duplicateRate, 0) / period2Metrics.length
    : 0;

  const avgStale1 = period1Metrics.length > 0
    ? period1Metrics.reduce((sum, m) => sum + m.staleDataRate, 0) / period1Metrics.length
    : 0;

  const avgStale2 = period2Metrics.length > 0
    ? period2Metrics.reduce((sum, m) => sum + m.staleDataRate, 0) / period2Metrics.length
    : 0;

  return {
    period1: {
      generatedAt: new Date(),
      period: { start: period1Start, end: period1End },
      metrics: [],
      insights: [],
      overallTrend: 'stable',
      score: 0,
    },
    period2: {
      generatedAt: new Date(),
      period: { start: period2Start, end: period2End },
      metrics: [],
      insights: [],
      overallTrend: 'stable',
      score: 0,
    },
    comparison: {
      completenessChange: Math.round((avgCompleteness2 - avgCompleteness1) * 10) / 10,
      duplicateChange: Math.round((avgDuplicate2 - avgDuplicate1) * 10) / 10,
      staleChange: Math.round((avgStale2 - avgStale1) * 10) / 10,
      overallImprovement: avgCompleteness2 > avgCompleteness1 && avgDuplicate2 < avgDuplicate1,
    },
  };
}
