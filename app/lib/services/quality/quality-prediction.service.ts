import { dbLogger } from '@/lib/logger';

export interface PredictionConfig {
  enabled: boolean;
  modelType: 'linear' | 'moving-average' | 'exponential';
  forecastDays: number;
  confidenceLevel: number;
  minimumDataPoints: number;
}

export interface QualityTrend {
  metric: string;
  values: TrendDataPoint[];
  direction: 'improving' | 'declining' | 'stable';
  slope: number;
  volatility: number;
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  businessId?: string;
}

export interface PredictionResult {
  id: string;
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  trend: QualityTrend;
  forecast: ForecastPoint[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  generatedAt: Date;
}

export interface ForecastPoint {
  date: Date;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface BatchPredictionResult {
  totalMetrics: number;
  averageConfidence: number;
  highRiskMetrics: string[];
  predictions: PredictionResult[];
}

const defaultConfig: PredictionConfig = {
  enabled: true,
  modelType: 'moving-average',
  forecastDays: 30,
  confidenceLevel: 0.95,
  minimumDataPoints: 5,
};

const predictionHistory: PredictionResult[] = [];
const MAX_HISTORY_SIZE = 5000;

export function setPredictionConfig(config: Partial<PredictionConfig>): void {
  Object.assign(defaultConfig, config);
  dbLogger.debug({ config: defaultConfig }, '예측 설정 업데이트');
}

export function getPredictionConfig(): PredictionConfig {
  return { ...defaultConfig };
}

function calculateMovingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function calculateExponentialSmoothing(values: number[], alpha: number): number[] {
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

function calculateLinearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
    sumY2 += values[i] * values[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const ssRes = values.reduce((sum, y, i) => sum + Math.pow(y - (slope * i + intercept), 2), 0);
  const mean = sumY / n;
  const ssTot = values.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

function analyzeTrend(values: number[]): QualityTrend['direction'] {
  if (values.length < 2) return 'stable';
  const recentHalf = values.slice(Math.floor(values.length / 2));
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const diff = recentAvg - firstAvg;

  if (diff > 2) return 'improving';
  if (diff < -2) return 'declining';
  return 'stable';
}

function determineRiskLevel(
  currentValue: number,
  predictedValue: number,
  trend: QualityTrend['direction'],
  volatility: number
): PredictionResult['riskLevel'] {
  const change = predictedValue - currentValue;
  const changeRate = Math.abs(change / (currentValue || 1));

  if (trend === 'declining' && changeRate > 0.2) return 'critical';
  if (trend === 'declining' && changeRate > 0.1) return 'high';
  if (volatility > 15) return 'medium';
  if (trend === 'declining') return 'medium';
  return 'low';
}

export function predictQualityMetric(
  metric: string,
  historicalData: TrendDataPoint[]
): PredictionResult {
  const values = historicalData.map(d => d.value);
  const currentValue = values[values.length - 1] || 0;

  let predicted: number;
  const smoothed = defaultConfig.modelType === 'exponential'
    ? calculateExponentialSmoothing(values, 0.3)
    : calculateMovingAverage(values, 3);

  if (defaultConfig.modelType === 'linear') {
    const { slope, intercept } = calculateLinearRegression(values);
    predicted = slope * values.length + intercept;
  } else {
    const lastSmoothed = smoothed[smoothed.length - 1];
    const prevSmoothed = smoothed[Math.max(0, smoothed.length - 2)];
    const momentum = lastSmoothed - prevSmoothed;
    predicted = lastSmoothed + momentum * defaultConfig.forecastDays * 0.1;
  }

  predicted = Math.max(0, Math.min(100, predicted));

  const direction = analyzeTrend(values);
  const { slope } = calculateLinearRegression(values);
  const volatility = calculateVolatility(values);

  const forecast: ForecastPoint[] = [];
  const baseDate = new Date();
  for (let i = 1; i <= defaultConfig.forecastDays; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const forecastValue = currentValue + slope * i;
    const uncertainty = volatility * Math.sqrt(i) * 0.5;
    forecast.push({
      date,
      predicted: Math.max(0, Math.min(100, forecastValue)),
      lowerBound: Math.max(0, forecastValue - uncertainty * 1.96),
      upperBound: Math.min(100, forecastValue + uncertainty * 1.96),
    });
  }

  const confidence = Math.max(0.3, 1 - volatility / 100) * defaultConfig.confidenceLevel;

  const result: PredictionResult = {
    id: `pred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    metric,
    currentValue,
    predictedValue: Math.round(predicted * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    trend: {
      metric,
      values: historicalData,
      direction,
      slope: Math.round(slope * 1000) / 1000,
      volatility: Math.round(volatility * 100) / 100,
    },
    forecast,
    riskLevel: determineRiskLevel(currentValue, predicted, direction, volatility),
    generatedAt: new Date(),
  };

  predictionHistory.push(result);
  if (predictionHistory.length > MAX_HISTORY_SIZE) {
    predictionHistory.splice(0, predictionHistory.length - MAX_HISTORY_SIZE);
  }

  dbLogger.debug({
    metric,
    currentValue,
    predicted,
    riskLevel: result.riskLevel,
  }, '품질 예측 완료');

  return result;
}

export function predictBatchMetrics(
  metricsData: Record<string, TrendDataPoint[]>
): BatchPredictionResult {
  const predictions: PredictionResult[] = [];

  for (const [metric, data] of Object.entries(metricsData)) {
    if (data.length >= defaultConfig.minimumDataPoints) {
      predictions.push(predictQualityMetric(metric, data));
    }
  }

  const averageConfidence = predictions.length > 0
    ? Math.round((predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length) * 100) / 100
    : 0;

  const highRiskMetrics = predictions
    .filter(p => p.riskLevel === 'critical' || p.riskLevel === 'high')
    .map(p => p.metric);

  return {
    totalMetrics: predictions.length,
    averageConfidence,
    highRiskMetrics,
    predictions,
  };
}

export function getPredictionHistory(
  metric?: string,
  limit: number = 100
): PredictionResult[] {
  let history = [...predictionHistory];
  if (metric) {
    history = history.filter(h => h.metric === metric);
  }
  return history.slice(-limit);
}

export function getPredictionStats(): {
  totalPredictions: number;
  averageConfidence: number;
  riskDistribution: Record<string, number>;
  metricFrequency: Record<string, number>;
} {
  const totalPredictions = predictionHistory.length;
  const averageConfidence = totalPredictions > 0
    ? Math.round((predictionHistory.reduce((sum, p) => sum + p.confidence, 0) / totalPredictions) * 100) / 100
    : 0;

  const riskDistribution: Record<string, number> = {};
  const metricFrequency: Record<string, number> = {};

  for (const pred of predictionHistory) {
    riskDistribution[pred.riskLevel] = (riskDistribution[pred.riskLevel] || 0) + 1;
    metricFrequency[pred.metric] = (metricFrequency[pred.metric] || 0) + 1;
  }

  return {
    totalPredictions,
    averageConfidence,
    riskDistribution,
    metricFrequency,
  };
}

export function generatePredictionReport(result: PredictionResult): string {
  const lines = [
    '# 품질 예측 리포트',
    '',
    `## 기본 정보`,
    `- 지표: ${result.metric}`,
    `- 예측 시간: ${result.generatedAt.toLocaleString('ko-KR')}`,
    `- 신뢰도: ${(result.confidence * 100).toFixed(0)}%`,
    `- 위험 수준: ${result.riskLevel}`,
    '',
    `## 예측 결과`,
    `- 현재값: ${result.currentValue}점`,
    `- 예측값: ${result.predictedValue}점`,
    `- 변화량: ${(result.predictedValue - result.currentValue) >= 0 ? '+' : ''}${(result.predictedValue - result.currentValue).toFixed(2)}점`,
    `- 트렌드: ${result.trend.direction}`,
    `- 변동성: ${result.trend.volatility}`,
    '',
  ];

  if (result.forecast.length > 0) {
    lines.push('## 예측 포인트 (최근 5개)');
    for (const point of result.forecast.slice(0, 5)) {
      lines.push(`- ${point.date.toLocaleDateString('ko-KR')}: ${point.predicted.toFixed(1)}점 (${point.lowerBound.toFixed(1)}~${point.upperBound.toFixed(1)})`);
    }
  }

  return lines.join('\n');
}
