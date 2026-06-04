import { dbLogger } from '@/lib/logger';

export interface ScoringConfig {
  weights: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
    validity: number;
  };
  thresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export interface QualityScore {
  id: string;
  businessId: string;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: ScoreDimension[];
  calculatedAt: Date;
  validUntil: Date;
}

export interface ScoreDimension {
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  details: ScoreDetail[];
}

export interface ScoreDetail {
  metric: string;
  value: number;
  maxValues: number;
  percentage: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

const defaultScoringConfig: ScoringConfig = {
  weights: {
    completeness: 0.3,
    accuracy: 0.25,
    consistency: 0.2,
    timeliness: 0.15,
    validity: 0.1,
  },
  thresholds: {
    excellent: 90,
    good: 75,
    fair: 60,
    poor: 40,
  },
};

const scoreHistory: QualityScore[] = [];
const MAX_HISTORY_SIZE = 50000;

export function setScoringConfig(config: Partial<ScoringConfig>): void {
  Object.assign(defaultScoringConfig, config);
  dbLogger.debug({ config: defaultScoringConfig }, '점수 산정 설정 업데이트');
}

export function getScoringConfig(): ScoringConfig {
  return { ...defaultScoringConfig };
}

function calculateCompletenessScore(business: Record<string, any>): ScoreDetail[] {
  const fields = [
    { name: 'name', weight: 1.0 },
    { name: 'bizesId', weight: 1.0 },
    { name: 'phone', weight: 0.8 },
    { name: 'roadNameAddress', weight: 0.7 },
    { name: 'lotNumberAddress', weight: 0.6 },
    { name: 'latitude', weight: 0.5 },
    { name: 'longitude', weight: 0.5 },
    { name: 'businessCode', weight: 0.4 },
    { name: 'indsLclsNm', weight: 0.3 },
  ];

  const details: ScoreDetail[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  for (const field of fields) {
    const value = business[field.name];
    const hasValue = value !== undefined && value !== null && value !== '';
    const score = hasValue ? 100 : 0;

    details.push({
      metric: field.name,
      value: score,
      maxValues: 100,
      percentage: score,
      status: score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor',
    });

    totalScore += score * field.weight;
    totalWeight += field.weight;
  }

  const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

  return details;
}

function calculateAccuracyScore(business: Record<string, any>): ScoreDetail[] {
  const details: ScoreDetail[] = [];
  let totalScore = 0;
  let checks = 0;

  const phoneRegex = /^0[2-9]{1,2}-[0-9]{3,4}-[0-9]{4}$/;
  if (business.phone) {
    const isValid = phoneRegex.test(business.phone);
    const score = isValid ? 100 : 0;
    details.push({
      metric: '전화번호 형식',
      value: score,
      maxValues: 100,
      percentage: score,
      status: score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor',
    });
    totalScore += score;
    checks++;
  }

  if (business.latitude) {
    const isValid = business.latitude >= 33 && business.latitude <= 38;
    const score = isValid ? 100 : 0;
    details.push({
      metric: '위도 범위',
      value: score,
      maxValues: 100,
      percentage: score,
      status: score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor',
    });
    totalScore += score;
    checks++;
  }

  if (business.longitude) {
    const isValid = business.longitude >= 124 && business.longitude <= 132;
    const score = isValid ? 100 : 0;
    details.push({
      metric: '경도 범위',
      value: score,
      maxValues: 100,
      percentage: score,
      status: score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor',
    });
    totalScore += score;
    checks++;
  }

  const bizesIdRegex = /^[0-9]{10}$/;
  if (business.bizesId) {
    const isValid = bizesIdRegex.test(business.bizesId);
    const score = isValid ? 100 : 0;
    details.push({
      metric: '사업자등록번호 형식',
      value: score,
      maxValues: 100,
      percentage: score,
      status: score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor',
    });
    totalScore += score;
    checks++;
  }

  if (checks === 0) {
    details.push({
      metric: '정확도 검사',
      value: 100,
      maxValues: 100,
      percentage: 100,
      status: 'excellent',
    });
    return details;
  }

  return details;
}

function calculateConsistencyScore(business: Record<string, any>): ScoreDetail[] {
  const details: ScoreDetail[] = [];
  let score = 100;

  if (business.name && business.name.length < 2) {
    score -= 20;
    details.push({
      metric: '사업체명 길이',
      value: 80,
      maxValues: 100,
      percentage: 80,
      status: 'fair',
    });
  }

  if (business.phone && !business.phone.includes('-')) {
    score -= 15;
    details.push({
      metric: '전화번호 구분자',
      value: 85,
      maxValues: 100,
      percentage: 85,
      status: 'good',
    });
  }

  if (details.length === 0) {
    details.push({
      metric: '일관성 검사',
      value: score,
      maxValues: 100,
      percentage: score,
      status: score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor',
    });
  }

  return details;
}

function calculateTimelinessScore(business: Record<string, any>): ScoreDetail[] {
  const details: ScoreDetail[] = [];
  let score = 100;

  if (business.updatedAt) {
    const updatedAt = new Date(business.updatedAt);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceUpdate > 365) {
      score = 40;
    } else if (daysSinceUpdate > 180) {
      score = 60;
    } else if (daysSinceUpdate > 90) {
      score = 80;
    }

    details.push({
      metric: '최근 업데이트',
      value: score,
      maxValues: 100,
      percentage: score,
      status: score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor',
    });
  } else {
    details.push({
      metric: '업데이트 정보 없음',
      value: 50,
      maxValues: 100,
      percentage: 50,
      status: 'fair',
    });
    score = 50;
  }

  return details;
}

function calculateValidityScore(business: Record<string, any>): ScoreDetail[] {
  const details: ScoreDetail[] = [];
  let score = 100;

  const invalidStatuses = ['dissolved', 'inactive'];
  if (business.status && invalidStatuses.includes(business.status)) {
    score -= 30;
    details.push({
      metric: '영업 상태',
      value: 70,
      maxValues: 100,
      percentage: 70,
      status: 'fair',
    });
  }

  if (details.length === 0) {
    details.push({
      metric: '유효성 검사',
      value: score,
      maxValues: 100,
      percentage: score,
      status: score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor',
    });
  }

  return details;
}

function calculateGrade(score: number): QualityScore['grade'] {
  const thresholds = defaultScoringConfig.thresholds;
  if (score >= thresholds.excellent) return 'A';
  if (score >= thresholds.good) return 'B';
  if (score >= thresholds.fair) return 'C';
  if (score >= thresholds.poor) return 'D';
  return 'F';
}

export function calculateQualityScore(business: Record<string, any>): QualityScore {
  const weights = defaultScoringConfig.weights;

  const completenessDetails = calculateCompletenessScore(business);
  const accuracyDetails = calculateAccuracyScore(business);
  const consistencyDetails = calculateConsistencyScore(business);
  const timelinessDetails = calculateTimelinessScore(business);
  const validityDetails = calculateValidityScore(business);

  const completenessAvg = completenessDetails.reduce((sum, d) => sum + d.percentage, 0) / completenessDetails.length;
  const accuracyAvg = accuracyDetails.reduce((sum, d) => sum + d.percentage, 0) / accuracyDetails.length;
  const consistencyAvg = consistencyDetails.reduce((sum, d) => sum + d.percentage, 0) / consistencyDetails.length;
  const timelinessAvg = timelinessDetails.reduce((sum, d) => sum + d.percentage, 0) / timelinessDetails.length;
  const validityAvg = validityDetails.reduce((sum, d) => sum + d.percentage, 0) / validityDetails.length;

  const dimensions: ScoreDimension[] = [
    {
      name: '완성도',
      score: Math.round(completenessAvg),
      weight: weights.completeness,
      weightedScore: Math.round(completenessAvg * weights.completeness),
      details: completenessDetails,
    },
    {
      name: '정확도',
      score: Math.round(accuracyAvg),
      weight: weights.accuracy,
      weightedScore: Math.round(accuracyAvg * weights.accuracy),
      details: accuracyDetails,
    },
    {
      name: '일관성',
      score: Math.round(consistencyAvg),
      weight: weights.consistency,
      weightedScore: Math.round(consistencyAvg * weights.consistency),
      details: consistencyDetails,
    },
    {
      name: '신선도',
      score: Math.round(timelinessAvg),
      weight: weights.timeliness,
      weightedScore: Math.round(timelinessAvg * weights.timeliness),
      details: timelinessDetails,
    },
    {
      name: '유효성',
      score: Math.round(validityAvg),
      weight: weights.validity,
      weightedScore: Math.round(validityAvg * weights.validity),
      details: validityDetails,
    },
  ];

  const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.weightedScore, 0));
  const grade = calculateGrade(overallScore);

  const now = new Date();
  const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const qualityScore: QualityScore = {
    id: `qs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    businessId: business.bizesId || business.id || 'unknown',
    overallScore,
    grade,
    dimensions,
    calculatedAt: now,
    validUntil,
  };

  scoreHistory.push(qualityScore);
  if (scoreHistory.length > MAX_HISTORY_SIZE) {
    scoreHistory.splice(0, scoreHistory.length - MAX_HISTORY_SIZE);
  }

  dbLogger.debug({
    businessId: qualityScore.businessId,
    score: overallScore,
    grade,
  }, '품질 점수 계산 완료');

  return qualityScore;
}

export function calculateQualityScoreBatch(
  businesses: Record<string, any>[]
): QualityScore[] {
  return businesses.map(business => calculateQualityScore(business));
}

export function getScoreHistory(
  businessId?: string,
  limit: number = 100
): QualityScore[] {
  let history = [...scoreHistory];
  if (businessId) {
    history = history.filter(h => h.businessId === businessId);
  }
  return history.slice(-limit);
}

export function getScoreStats(): {
  totalScores: number;
  averageScore: number;
  gradeDistribution: Record<string, number>;
  averageByDimension: Record<string, number>;
} {
  const totalScores = scoreHistory.length;
  const averageScore = totalScores > 0
    ? scoreHistory.reduce((sum, s) => sum + s.overallScore, 0) / totalScores
    : 0;

  const gradeDistribution: Record<string, number> = {};
  for (const score of scoreHistory) {
    gradeDistribution[score.grade] = (gradeDistribution[score.grade] || 0) + 1;
  }

  const averageByDimension: Record<string, number> = {};
  const dimensionCounts: Record<string, number> = {};
  for (const score of scoreHistory) {
    for (const dim of score.dimensions) {
      averageByDimension[dim.name] = (averageByDimension[dim.name] || 0) + dim.score;
      dimensionCounts[dim.name] = (dimensionCounts[dim.name] || 0) + 1;
    }
  }
  for (const dim of Object.keys(averageByDimension)) {
    averageByDimension[dim] = Math.round(averageByDimension[dim] / dimensionCounts[dim]);
  }

  return {
    totalScores,
    averageScore: Math.round(averageScore * 100) / 100,
    gradeDistribution,
    averageByDimension,
  };
}

export function generateScoreReport(score: QualityScore): string {
  const lines = [
    '# 데이터 품질 점수 리포트',
    '',
    `## 기본 정보`,
    `- 사업체 ID: ${score.businessId}`,
    `- 계산 시간: ${score.calculatedAt.toLocaleString('ko-KR')}`,
    `- 유효 기간: ~ ${score.validUntil.toLocaleString('ko-KR')}`,
    '',
    `## 종합 점수`,
    `- 점수: ${score.overallScore}점`,
    `- 등급: ${score.grade}`,
    '',
    `## 차원별 점수`,
  ];

  for (const dim of score.dimensions) {
    lines.push(`### ${dim.name}`);
    lines.push(`- 점수: ${dim.score}점`);
    lines.push(`- 가중치: ${(dim.weight * 100).toFixed(0)}%`);
    lines.push(`- 가중 점수: ${dim.weightedScore}점`);
    lines.push('');
  }

  return lines.join('\n');
}
