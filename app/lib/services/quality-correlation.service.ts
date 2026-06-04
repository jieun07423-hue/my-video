import { dbLogger } from '@/lib/logger';

export interface CorrelationConfig {
  enabled: boolean;
  minCorrelationThreshold: number;
  maxLagDays: number;
  analysisPeriodDays: number;
  minimumDataPoints: number;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'file' | 'stream';
  endpoint: string;
  refreshInterval: number;
  enabled: boolean;
  lastSynced?: Date;
}

export interface CorrelationPair {
  id: string;
  sourceA: string;
  sourceB: string;
  metricA: string;
  metricB: string;
  correlation: number;
  pValue: number;
  lagDays: number;
  direction: 'positive' | 'negative' | 'none';
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  analyzedAt: Date;
}

export interface CorrelationResult {
  id: string;
  pairs: CorrelationPair[];
  summary: {
    totalPairs: number;
    strongCorrelations: number;
    moderateCorrelations: number;
    weakCorrelations: number;
    averageCorrelation: number;
  };
  insights: CorrelationInsight[];
  generatedAt: Date;
}

export interface CorrelationInsight {
  type: 'finding' | 'warning' | 'recommendation';
  description: string;
  affectedPairs: string[];
  severity: 'high' | 'medium' | 'low';
}

const defaultConfig: CorrelationConfig = {
  enabled: true,
  minCorrelationThreshold: 0.3,
  maxLagDays: 7,
  analysisPeriodDays: 30,
  minimumDataPoints: 10,
};

const dataSources: DataSource[] = [];
const correlationHistory: CorrelationResult[] = [];
const MAX_HISTORY_SIZE = 500;

export function setCorrelationConfig(config: Partial<CorrelationConfig>): void {
  Object.assign(defaultConfig, config);
  dbLogger.debug({ config: defaultConfig }, '상관 분석 설정 업데이트');
}

export function getCorrelationConfig(): CorrelationConfig {
  return { ...defaultConfig };
}

export function addDataSource(
  name: string,
  type: DataSource['type'],
  endpoint: string,
  refreshInterval: number
): DataSource {
  const source: DataSource = {
    id: `ds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    endpoint,
    refreshInterval,
    enabled: true,
  };

  dataSources.push(source);
  dbLogger.debug({ sourceId: source.id, name, type }, '데이터 소스 추가');
  return source;
}

export function getDataSourceById(sourceId: string): DataSource | undefined {
  return dataSources.find(s => s.id === sourceId);
}

export function removeDataSource(sourceId: string): boolean {
  const index = dataSources.findIndex(s => s.id === sourceId);
  if (index < 0) return false;

  dataSources.splice(index, 1);
  return true;
}

export function getDataSources(): DataSource[] {
  return [...dataSources];
}

function calculatePearsonCorrelation(x: number[], y: number[]): { r: number; pValue: number } {
  const n = x.length;
  if (n < 3) return { r: 0, pValue: 1 };

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (den === 0) return { r: 0, pValue: 1 };

  const r = num / den;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;

  const pValue = Math.min(1, 2 * Math.exp(-0.5 * Math.abs(t)));

  return { r: Math.max(-1, Math.min(1, r)), pValue };
}

function calculateCrossCorrelation(x: number[], y: number[], maxLag: number): {
  correlations: { lag: number; r: number }[];
  bestLag: number;
  bestR: number;
} {
  const correlations: { lag: number; r: number }[] = [];
  let bestLag = 0;
  let bestR = 0;

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const xSlice = lag >= 0 ? x.slice(lag) : x.slice(0, x.length + lag);
    const ySlice = lag >= 0 ? y.slice(0, y.length - lag) : y.slice(-lag);

    const minLen = Math.min(xSlice.length, ySlice.length);
    if (minLen < defaultConfig.minimumDataPoints) continue;

    const { r } = calculatePearsonCorrelation(xSlice.slice(0, minLen), ySlice.slice(0, minLen));
    correlations.push({ lag, r });

    if (Math.abs(r) > Math.abs(bestR)) {
      bestR = r;
      bestLag = lag;
    }
  }

  return { correlations, bestLag, bestR };
}

function classifyStrength(r: number): CorrelationPair['strength'] {
  const absR = Math.abs(r);
  if (absR >= 0.7) return 'strong';
  if (absR >= 0.4) return 'moderate';
  if (absR >= defaultConfig.minCorrelationThreshold) return 'weak';
  return 'none';
}

function generateInsights(pairs: CorrelationPair[]): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];

  const strongPairs = pairs.filter(p => p.strength === 'strong');
  if (strongPairs.length > 0) {
    insights.push({
      type: 'finding',
      description: `${strongPairs.length}개의 강한 상관관계가 발견되었습니다`,
      affectedPairs: strongPairs.map(p => p.id),
      severity: 'high',
    });
  }

  const negativePairs = pairs.filter(p => p.direction === 'negative' && p.strength !== 'none');
  if (negativePairs.length > 0) {
    insights.push({
      type: 'warning',
      description: `${negativePairs.length}개의 음의 상관관계가 발견되었습니다. 한 지표의 개선이 다른 지표를 악화시킬 수 있습니다.`,
      affectedPairs: negativePairs.map(p => p.id),
      severity: 'medium',
    });
  }

  const laggedPairs = pairs.filter(p => p.lagDays !== 0 && p.strength !== 'none');
  if (laggedPairs.length > 0) {
    insights.push({
      type: 'recommendation',
      description: `${laggedPairs.length}개의 지연 상관관계가 발견되었습니다. 선행 지표를 활용한 예측이 가능합니다.`,
      affectedPairs: laggedPairs.map(p => p.id),
      severity: 'medium',
    });
  }

  return insights;
}

export function analyzeCorrelation(
  sourceAData: number[],
  sourceBData: number[],
  sourceAId: string,
  sourceBId: string,
  metricA: string,
  metricB: string
): CorrelationPair {
  const minLen = Math.min(sourceAData.length, sourceBData.length);
  const x = sourceAData.slice(0, minLen);
  const y = sourceBData.slice(0, minLen);

  const { r, pValue } = calculatePearsonCorrelation(x, y);
  const { bestLag } = calculateCrossCorrelation(x, y, defaultConfig.maxLagDays);

  const pair: CorrelationPair = {
    id: `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sourceA: sourceAId,
    sourceB: sourceBId,
    metricA,
    metricB,
    correlation: Math.round(r * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    lagDays: bestLag,
    direction: r > 0 ? 'positive' : r < 0 ? 'negative' : 'none',
    strength: classifyStrength(r),
    analyzedAt: new Date(),
  };

  dbLogger.debug({
    pairId: pair.id,
    correlation: pair.correlation,
    strength: pair.strength,
  }, '상관 분석 완료');

  return pair;
}

export function analyzeMultipleCorrelations(
  metricsData: Record<string, number[]>
): CorrelationResult {
  const metricNames = Object.keys(metricsData);
  const pairs: CorrelationPair[] = [];

  for (let i = 0; i < metricNames.length; i++) {
    for (let j = i + 1; j < metricNames.length; j++) {
      const metricA = metricNames[i];
      const metricB = metricNames[j];
      const dataA = metricsData[metricA];
      const dataB = metricsData[metricB];

      if (dataA.length >= defaultConfig.minimumDataPoints && dataB.length >= defaultConfig.minimumDataPoints) {
        const pair = analyzeCorrelation(dataA, dataB, metricA, metricB, metricA, metricB);
        if (Math.abs(pair.correlation) >= defaultConfig.minCorrelationThreshold) {
          pairs.push(pair);
        }
      }
    }
  }

  const strongCorrelations = pairs.filter(p => p.strength === 'strong').length;
  const moderateCorrelations = pairs.filter(p => p.strength === 'moderate').length;
  const weakCorrelations = pairs.filter(p => p.strength === 'weak').length;
  const averageCorrelation = pairs.length > 0
    ? Math.round((pairs.reduce((sum, p) => sum + Math.abs(p.correlation), 0) / pairs.length) * 1000) / 1000
    : 0;

  const insights = generateInsights(pairs);

  const result: CorrelationResult = {
    id: `corr-result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pairs,
    summary: {
      totalPairs: pairs.length,
      strongCorrelations,
      moderateCorrelations,
      weakCorrelations,
      averageCorrelation,
    },
    insights,
    generatedAt: new Date(),
  };

  correlationHistory.push(result);
  if (correlationHistory.length > MAX_HISTORY_SIZE) {
    correlationHistory.splice(0, correlationHistory.length - MAX_HISTORY_SIZE);
  }

  dbLogger.debug({
    totalPairs: pairs.length,
    strong: strongCorrelations,
    moderate: moderateCorrelations,
  }, '다중 상관 분석 완료');

  return result;
}

export function getCorrelationHistory(limit: number = 50): CorrelationResult[] {
  return correlationHistory.slice(-limit);
}

export function getCorrelationStats(): {
  totalAnalyses: number;
  totalPairsFound: number;
  averageCorrelation: number;
  strongestPair: CorrelationPair | null;
} {
  const totalAnalyses = correlationHistory.length;
  const allPairs = correlationHistory.flatMap(r => r.pairs);
  const totalPairsFound = allPairs.length;
  const averageCorrelation = totalPairsFound > 0
    ? Math.round((allPairs.reduce((sum, p) => sum + Math.abs(p.correlation), 0) / totalPairsFound) * 1000) / 1000
    : 0;

  const strongestPair = allPairs.length > 0
    ? allPairs.reduce((strongest, p) => Math.abs(p.correlation) > Math.abs(strongest.correlation) ? p : strongest)
    : null;

  return {
    totalAnalyses,
    totalPairsFound,
    averageCorrelation,
    strongestPair,
  };
}

export function generateCorrelationReport(result: CorrelationResult): string {
  const lines = [
    '# 상관 분석 리포트',
    '',
    `## 기본 정보`,
    `- 분석 ID: ${result.id}`,
    `- 생성 시간: ${result.generatedAt.toLocaleString('ko-KR')}`,
    '',
    `## 요약`,
    `- 전체 쌍: ${result.summary.totalPairs}개`,
    `- 강한 상관: ${result.summary.strongCorrelations}개`,
    `- 중간 상관: ${result.summary.moderateCorrelations}개`,
    `- 약한 상관: ${result.summary.weakCorrelations}개`,
    `- 평균 상관계수: ${result.summary.averageCorrelation}`,
    '',
  ];

  if (result.pairs.length > 0) {
    lines.push('## 상관 관계 쌍');
    for (const pair of result.pairs) {
      lines.push(`### ${pair.metricA} ↔ ${pair.metricB}`);
      lines.push(`- 상관계수: ${pair.correlation}`);
      lines.push(`- 방향: ${pair.direction === 'positive' ? '양의' : pair.direction === 'negative' ? '음의' : '없음'}`);
      lines.push(`- 강도: ${pair.strength === 'strong' ? '강함' : pair.strength === 'moderate' ? '보통' : pair.strength === 'weak' ? '약함' : '없음'}`);
      lines.push(`- 지연: ${pair.lagDays}일`);
      lines.push(`- p-value: ${pair.pValue}`);
      lines.push('');
    }
  }

  if (result.insights.length > 0) {
    lines.push('## 인사이트');
    for (const insight of result.insights) {
      lines.push(`### [${insight.severity}] ${insight.type === 'finding' ? '발견' : insight.type === 'warning' ? '경고' : '권고'}`);
      lines.push(`- ${insight.description}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
