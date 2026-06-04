import { dbLogger } from '@/lib/logger';

export interface AnomalyScore {
  businessId: string;
  field: string;
  value: any;
  anomalyScore: number;
  isAnomaly: boolean;
  confidence: number;
  expectedRange?: { min: number; max: number };
  deviation?: number;
}

export interface AnomalyDetectionResult {
  totalBusinesses: number;
  anomaliesDetected: number;
  anomalyRate: number;
  anomalies: AnomalyScore[];
  statistics: FieldStatistics[];
  detectedAt: Date;
}

export interface FieldStatistics {
  field: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  outlierThreshold: { lower: number; upper: number };
}

export interface DetectionConfig {
  zScoreThreshold: number;
  iqrMultiplier: number;
  minSampleSize: number;
  fieldsToAnalyze: string[];
}

const DEFAULT_CONFIG: DetectionConfig = {
  zScoreThreshold: 3,
  iqrMultiplier: 1.5,
  minSampleSize: 30,
  fieldsToAnalyze: ['latitude', 'longitude', 'phone', 'name', 'roadNameAddress'],
};

const statisticsCache = new Map<string, FieldStatistics>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export function calculateStatistics(values: number[]): FieldStatistics | null {
  if (values.length < 2) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  return {
    field: '',
    mean: Math.round(mean * 1000) / 1000,
    stdDev: Math.round(stdDev * 1000) / 1000,
    min: sorted[0],
    max: sorted[n - 1],
    median: Math.round(median * 1000) / 1000,
    q1: Math.round(q1 * 1000) / 1000,
    q3: Math.round(q3 * 1000) / 1000,
    iqr: Math.round(iqr * 1000) / 1000,
    outlierThreshold: {
      lower: Math.round(lowerFence * 1000) / 1000,
      upper: Math.round(upperFence * 1000) / 1000,
    },
  };
}

export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

export function calculateIQRScore(value: number, q1: number, q3: number): number {
  const iqr = q3 - q1;
  if (iqr === 0) return 0;

  if (value < q1) {
    return (q1 - value) / iqr;
  } else if (value > q3) {
    return (value - q3) / iqr;
  }
  return 0;
}

export function detectAnomalies(
  businesses: Record<string, any>[],
  config: DetectionConfig = DEFAULT_CONFIG
): AnomalyDetectionResult {
  const anomalies: AnomalyScore[] = [];
  const statistics: FieldStatistics[] = [];

  for (const field of config.fieldsToAnalyze) {
    const numericValues = businesses
      .map(b => b[field])
      .filter(v => typeof v === 'number' && !isNaN(v));

    if (numericValues.length < config.minSampleSize) continue;

    const stats = calculateStatistics(numericValues);
    if (!stats) continue;

    stats.field = field;
    statistics.push(stats);
    statisticsCache.set(field, stats);

    for (const business of businesses) {
      const value = business[field];
      if (typeof value !== 'number' || isNaN(value)) continue;

      const zScore = Math.abs(calculateZScore(value, stats.mean, stats.stdDev));
      const iqrScore = calculateIQRScore(value, stats.q1, stats.q3);

      const isZScoreAnomaly = zScore > config.zScoreThreshold;
      const isIQRAnomaly = iqrScore > config.iqrMultiplier;

      const anomalyScore = Math.max(
        Math.min(zScore / config.zScoreThreshold, 1),
        Math.min(iqrScore / config.iqrMultiplier, 1)
      );

      if (isZScoreAnomaly || isIQRAnomaly) {
        const deviation = value - stats.mean;
        anomalies.push({
          businessId: business.bizesId || business.id || 'unknown',
          field,
          value,
          anomalyScore: Math.round(anomalyScore * 100) / 100,
          isAnomaly: true,
          confidence: Math.round((1 - 1 / (1 + anomalyScore)) * 100) / 100,
          expectedRange: {
            min: stats.outlierThreshold.lower,
            max: stats.outlierThreshold.upper,
          },
          deviation: Math.round(deviation * 1000) / 1000,
        });
      }
    }
  }

  anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);

  return {
    totalBusinesses: businesses.length,
    anomaliesDetected: anomalies.length,
    anomalyRate: businesses.length > 0
      ? Math.round((anomalies.length / businesses.length) * 100 * 100) / 100
      : 0,
    anomalies,
    statistics,
    detectedAt: new Date(),
  };
}

export function detectTextAnomalies(
  businesses: Record<string, any>[]
): AnomalyScore[] {
  const anomalies: AnomalyScore[] = [];
  const textFields = ['name', 'roadNameAddress', 'lotNumberAddress', 'phone'];

  for (const field of textFields) {
    const values = businesses
      .map(b => b[field])
      .filter(v => typeof v === 'string' && v.length > 0);

    if (values.length < 10) continue;

    const lengths = values.map(v => v.length);
    const stats = calculateStatistics(lengths);
    if (!stats) continue;

    for (const business of businesses) {
      const value = business[field];
      if (typeof value !== 'string') continue;

      const length = value.length;
      const zScore = Math.abs(calculateZScore(length, stats.mean, stats.stdDev));

      if (zScore > 2.5) {
        anomalies.push({
          businessId: business.bizesId || business.id || 'unknown',
          field,
          value,
          anomalyScore: Math.round(Math.min(zScore / 3, 1) * 100) / 100,
          isAnomaly: true,
          confidence: Math.round((1 - 1 / (1 + zScore)) * 100) / 100,
          expectedRange: {
            min: Math.max(0, Math.round(stats.mean - 2 * stats.stdDev)),
            max: Math.round(stats.mean + 2 * stats.stdDev),
          },
          deviation: Math.round((length - stats.mean) * 1000) / 1000,
        });
      }
    }
  }

  return anomalies;
}

export function detectPatternAnomalies(
  businesses: Record<string, any>[]
): AnomalyScore[] {
  const anomalies: AnomalyScore[] = [];

  const phonePattern = /^\d{2,4}-?\d{3,4}-?\d{4}$/;
  const addressPatterns = [
    /시.*구.*로/,
    /시.*구.*동/,
    /군.*면.*리/,
  ];

  for (const business of businesses) {
    if (business.phone && !phonePattern.test(business.phone)) {
      anomalies.push({
        businessId: business.bizesId || business.id || 'unknown',
        field: 'phone',
        value: business.phone,
        anomalyScore: 0.8,
        isAnomaly: true,
        confidence: 0.9,
      });
    }

    if (business.roadNameAddress) {
      const hasValidPattern = addressPatterns.some(p => p.test(business.roadNameAddress));
      if (!hasValidPattern && business.roadNameAddress.length > 5) {
        anomalies.push({
          businessId: business.bizesId || business.id || 'unknown',
          field: 'roadNameAddress',
          value: business.roadNameAddress,
          anomalyScore: 0.6,
          isAnomaly: true,
          confidence: 0.7,
        });
      }
    }
  }

  return anomalies;
}

export function analyzeAnomalyPatterns(
  anomalies: AnomalyScore[]
): {
  fieldDistribution: Record<string, number>;
  scoreDistribution: { range: string; count: number }[];
  topAnomalies: AnomalyScore[];
  recommendations: string[];
} {
  const fieldDistribution: Record<string, number> = {};
  for (const anomaly of anomalies) {
    fieldDistribution[anomaly.field] = (fieldDistribution[anomaly.field] || 0) + 1;
  }

  const scoreRanges = [
    { range: '0.0-0.3', min: 0, max: 0.3 },
    { range: '0.3-0.6', min: 0.3, max: 0.6 },
    { range: '0.6-0.8', min: 0.6, max: 0.8 },
    { range: '0.8-1.0', min: 0.8, max: 1.0 },
  ];

  const scoreDistribution = scoreRanges.map(({ range, min, max }) => ({
    range,
    count: anomalies.filter(a => a.anomalyScore >= min && a.anomalyScore < max).length,
  }));

  const topAnomalies = anomalies.slice(0, 10);

  const recommendations: string[] = [];
  const highScoreAnomalies = anomalies.filter(a => a.anomalyScore > 0.8);
  if (highScoreAnomalies.length > 0) {
    recommendations.push(`${highScoreAnomalies.length}건의 높은 신뢰도 이상치가 발견되었습니다. 즉시 검토가 필요합니다.`);
  }

  const fieldCounts = Object.entries(fieldDistribution).sort(([, a], [, b]) => b - a);
  if (fieldCounts.length > 0) {
    const [topField, topCount] = fieldCounts[0];
    recommendations.push(`가장 많은 이상치가 '${topField}' 필드에서 발견되었습니다 (${topCount}건).`);
  }

  return {
    fieldDistribution,
    scoreDistribution,
    topAnomalies,
    recommendations,
  };
}

export function getStatisticsFromCache(field: string): FieldStatistics | undefined {
  return statisticsCache.get(field);
}

export function clearStatisticsCache(): void {
  statisticsCache.clear();
}

export function generateAnomalyReport(
  result: AnomalyDetectionResult
): string {
  const lines = [
    '# 데이터 이상 탐지 리포트',
    '',
    `## 요약`,
    `- 전체 사업체: ${result.totalBusinesses}건`,
    `- 탐지된 이상치: ${result.anomaliesDetected}건`,
    `- 이상치 비율: ${result.anomalyRate}%`,
    `- 탐지 시간: ${result.detectedAt.toLocaleString('ko-KR')}`,
    '',
    '## 필드별 통계',
  ];

  for (const stats of result.statistics) {
    lines.push(`### ${stats.field}`);
    lines.push(`- 평균: ${stats.mean}`);
    lines.push(`- 표준편차: ${stats.stdDev}`);
    lines.push(`- 범위: ${stats.min} ~ ${stats.max}`);
    lines.push(`- 이상치 기준: ${stats.outlierThreshold.lower} ~ ${stats.outlierThreshold.upper}`);
    lines.push('');
  }

  if (result.anomalies.length > 0) {
    lines.push('## 주요 이상치');
    for (const anomaly of result.anomalies.slice(0, 10)) {
      lines.push(`- ${anomaly.businessId}: ${anomaly.field} = ${anomaly.value} (점수: ${anomaly.anomalyScore})`);
    }
  }

  return lines.join('\n');
}
