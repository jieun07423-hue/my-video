export interface CompletenessScore {
  bizesId: string;
  totalScore: number;
  fieldScores: FieldScore[];
  missingFields: string[];
  completedFields: string[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  evaluatedAt: Date;
  crossValidation: CrossValidationResult;
  freshness: FreshnessScore;
  industryScore?: IndustryScore;
}

export interface FieldScore {
  field: string;
  label: string;
  weight: number;
  isPresent: boolean;
  score: number;
  validator?: string;
  crossValidated?: boolean;
}

export interface CrossValidationResult {
  isValid: boolean;
  issues: CrossValidationIssue[];
  score: number;
}

export interface CrossValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  fields: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface FreshnessScore {
  score: number;
  lastUpdatedAt?: Date;
  daysSinceUpdate?: number;
  isStale: boolean;
  recommendation: string;
}

export interface IndustryScore {
  industryCode: string;
  industryName: string;
  averageScore: number;
  rank: number;
  percentile: number;
}

export interface CompletenessReport {
  totalBusinesses: number;
  averageScore: number;
  gradeDistribution: { grade: string; count: number; percentage: number }[];
  commonMissingFields: { field: string; count: number; percentage: number }[];
  lowScoreBusinesses: number;
  crossValidationSummary: {
    totalIssues: number;
    criticalIssues: number;
    averageCrossScore: number;
  };
  freshnessSummary: {
    averageFreshnessScore: number;
    staleBusinesses: number;
    recentUpdates: number;
  };
  industryBenchmark: IndustryScore[];
  evaluatedAt: Date;
}

interface FieldDefinition {
  field: string;
  label: string;
  weight: number;
  validator?: (value: any) => boolean;
  crossValidators?: CrossValidator[];
  required?: boolean;
}

interface CrossValidator {
  name: string;
  validate: (business: Record<string, any>) => CrossValidationIssue | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    field: 'name',
    label: '사업체명',
    weight: 15,
    required: true,
    crossValidators: [
      {
        name: 'name-length',
        validate: (b) => {
          if (b.name && b.name.length < 2) {
            return { type: 'warning', message: '사업체명이 너무 짧습니다', fields: ['name'], severity: 'medium' };
          }
          return null;
        },
        severity: 'medium',
      },
    ],
  },
  {
    field: 'roadNameAddress',
    label: '도로명주소',
    weight: 12,
    crossValidators: [
      {
        name: 'address-format',
        validate: (b) => {
          if (b.roadNameAddress && !b.roadNameAddress.includes('로') && !b.roadNameAddress.includes('길')) {
            return { type: 'warning', message: '도로명주소 형식이 아닙니다', fields: ['roadNameAddress'], severity: 'low' };
          }
          return null;
        },
        severity: 'low',
      },
    ],
  },
  {
    field: 'lotNumberAddress',
    label: '지번주소',
    weight: 8,
  },
  {
    field: 'phone',
    label: '전화번호',
    weight: 10,
    validator: (v) => /^\d{2,4}-?\d{3,4}-?\d{4}$/.test(String(v)),
    crossValidators: [
      {
        name: 'phone-area-code',
        validate: (b) => {
          if (b.phone) {
            const phone = b.phone.replace(/-/g, '');
            const areaCode = phone.substring(0, 2);
            const validAreaCodes = ['02', '031', '032', '033', '041', '042', '043', '051', '052', '053', '054', '055', '061', '062', '063', '064'];
            if (!validAreaCodes.some(code => phone.startsWith(code))) {
              return { type: 'error', message: '유효하지 않은 지역번호입니다', fields: ['phone'], severity: 'high' };
            }
          }
          return null;
        },
        severity: 'high',
      },
    ],
  },
  {
    field: 'latitude',
    label: '위도',
    weight: 5,
    crossValidators: [
      {
        name: 'coordinate-range',
        validate: (b) => {
          if (b.latitude && (b.latitude < 33 || b.latitude > 39)) {
            return { type: 'error', message: '위도가 대한민국 범위를 벗어났습니다', fields: ['latitude', 'longitude'], severity: 'critical' };
          }
          return null;
        },
        severity: 'critical',
      },
    ],
  },
  {
    field: 'longitude',
    label: '경도',
    weight: 5,
    crossValidators: [
      {
        name: 'coordinate-range',
        validate: (b) => {
          if (b.longitude && (b.longitude < 124 || b.longitude > 132)) {
            return { type: 'error', message: '경도가 대한민국 범위를 벗어났습니다', fields: ['latitude', 'longitude'], severity: 'critical' };
          }
          return null;
        },
        severity: 'critical',
      },
    ],
  },
  {
    field: 'businessCode',
    label: '업종코드',
    weight: 10,
    crossValidators: [
      {
        name: 'business-code-format',
        validate: (b) => {
          if (b.businessCode && !/^[A-Z]\d{4,5}$/.test(b.businessCode)) {
            return { type: 'warning', message: '업종코드 형식이 올바르지 않습니다', fields: ['businessCode'], severity: 'medium' };
          }
          return null;
        },
        severity: 'medium',
      },
    ],
  },
  {
    field: 'businessName',
    label: '업종명',
    weight: 8,
  },
  {
    field: 'indsLclsNm',
    label: '대분류',
    weight: 7,
  },
  {
    field: 'indsMclsNm',
    label: '중분류',
    weight: 5,
  },
  {
    field: 'indsSclsNm',
    label: '소분류',
    weight: 5,
  },
  {
    field: 'status',
    label: '영업상태',
    weight: 5,
    crossValidators: [
      {
        name: 'status-valid',
        validate: (b) => {
          const validStatuses = ['active', 'inactive', 'dissolved', 'pending', 'pending_renewal'];
          if (b.status && !validStatuses.includes(b.status)) {
            return { type: 'error', message: '유효하지 않은 영업상태입니다', fields: ['status'], severity: 'high' };
          }
          return null;
        },
        severity: 'high',
      },
    ],
  },
];

const INDUSTRY_BENCHMARKS: Record<string, { name: string; averageScore: number }> = {
  'I56112': { name: '한식음식점', averageScore: 72 },
  'I56111': { name: '중식음식점', averageScore: 70 },
  'I56113': { name: '일식음식점', averageScore: 74 },
  'I56121': { name: '제과점', averageScore: 68 },
  'I56122': { name: '패스트푸드점', averageScore: 75 },
  'G47121': { name: '편의점', averageScore: 82 },
  'G47122': { name: '마트', averageScore: 78 },
  'S96111': { name: '미용실', averageScore: 65 },
  'S96112': { name: '이용원', averageScore: 63 },
  'Q82110': { name: '치과', averageScore: 80 },
  'Q82120': { name: '한의원', averageScore: 79 },
  'Q82130': { name: '의원', averageScore: 77 },
};

export function evaluateCompleteness(business: Record<string, any>): CompletenessScore {
  const fieldScores: FieldScore[] = [];
  const missingFields: string[] = [];
  const completedFields: string[] = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const def of FIELD_DEFINITIONS) {
    const value = business[def.field];
    const isPresent = value !== null && value !== undefined && value !== '';

    let isValid = isPresent;
    if (isPresent && def.validator) {
      isValid = def.validator(value);
    }

    const score = isValid ? def.weight : 0;
    earnedWeight += score;
    totalWeight += def.weight;

    fieldScores.push({
      field: def.field,
      label: def.label,
      weight: def.weight,
      isPresent: isValid,
      score,
      validator: def.validator ? 'custom' : undefined,
    });

    if (isValid) {
      completedFields.push(def.field);
    } else {
      missingFields.push(def.field);
    }
  }

  const totalScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  const crossValidation = performCrossValidation(business);
  const freshness = calculateFreshness(business);
  const industryScore = calculateIndustryScore(business, totalScore);

  const adjustedScore = Math.round(
    totalScore * 0.7 + crossValidation.score * 0.2 + freshness.score * 0.1
  );

  return {
    bizesId: business.bizesId || '',
    totalScore: adjustedScore,
    fieldScores,
    missingFields,
    completedFields,
    grade: scoreToGrade(adjustedScore),
    evaluatedAt: new Date(),
    crossValidation,
    freshness,
    industryScore,
  };
}

function performCrossValidation(business: Record<string, any>): CrossValidationResult {
  const issues: CrossValidationIssue[] = [];
  let totalSeverityScore = 0;
  let validatorCount = 0;

  for (const def of FIELD_DEFINITIONS) {
    if (def.crossValidators) {
      for (const validator of def.crossValidators) {
        const issue = validator.validate(business);
        if (issue) {
          issues.push(issue);
          totalSeverityScore += getSeverityScore(issue.severity);
          validatorCount++;
        }
      }
    }
  }

  const score = validatorCount > 0
    ? Math.max(0, 100 - Math.round((totalSeverityScore / validatorCount) * 25))
    : 100;

  return {
    isValid: issues.filter(i => i.type === 'error').length === 0,
    issues,
    score,
  };
}

function getSeverityScore(severity: 'critical' | 'high' | 'medium' | 'low'): number {
  switch (severity) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function calculateFreshness(business: Record<string, any>): FreshnessScore {
  const updatedAt = business.updatedAt ? new Date(business.updatedAt) : null;
  const now = new Date();

  if (!updatedAt) {
    return {
      score: 50,
      isStale: true,
      recommendation: '데이터 업데이트 날짜가 없습니다',
    };
  }

  const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

  let score: number;
  let isStale: boolean;
  let recommendation: string;

  if (daysSinceUpdate <= 7) {
    score = 100;
    isStale = false;
    recommendation = '최근 업데이트된 데이터입니다';
  } else if (daysSinceUpdate <= 30) {
    score = 80;
    isStale = false;
    recommendation = '양호한 신선도입니다';
  } else if (daysSinceUpdate <= 90) {
    score = 60;
    isStale = false;
    recommendation = '업데이트가 필요할 수 있습니다';
  } else if (daysSinceUpdate <= 180) {
    score = 40;
    isStale = true;
    recommendation = '오래된 데이터입니다. 업데이트를 권장합니다';
  } else {
    score = 20;
    isStale = true;
    recommendation = '오래된 데이터입니다. 즉시 업데이트가 필요합니다';
  }

  return {
    score,
    lastUpdatedAt: updatedAt,
    daysSinceUpdate,
    isStale,
    recommendation,
  };
}

function calculateIndustryScore(business: Record<string, any>, totalScore: number): IndustryScore | undefined {
  const industryCode = business.businessCode;
  if (!industryCode || !INDUSTRY_BENCHMARKS[industryCode]) {
    return undefined;
  }

  const benchmark = INDUSTRY_BENCHMARKS[industryCode];
  const diff = totalScore - benchmark.averageScore;
  const rank = diff > 10 ? 1 : diff > 0 ? 2 : diff > -10 ? 3 : 4;
  const percentile = Math.min(100, Math.max(0, 50 + diff));

  return {
    industryCode,
    industryName: benchmark.name,
    averageScore: benchmark.averageScore,
    rank,
    percentile: Math.round(percentile),
  };
}

export function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function evaluateBatchCompleteness(
  businesses: Record<string, any>[]
): { scores: CompletenessScore[]; report: CompletenessReport } {
  const scores = businesses.map(evaluateCompleteness);
  const totalScoreSum = scores.reduce((sum, s) => sum + s.totalScore, 0);
  const averageScore = scores.length > 0 ? Math.round(totalScoreSum / scores.length) : 0;

  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const fieldMissingCounts: Record<string, number> = {};

  for (const def of FIELD_DEFINITIONS) {
    fieldMissingCounts[def.field] = 0;
  }

  for (const score of scores) {
    gradeCounts[score.grade]++;
    for (const field of score.missingFields) {
      fieldMissingCounts[field] = (fieldMissingCounts[field] || 0) + 1;
    }
  }

  const gradeDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({
    grade,
    count,
    percentage: scores.length > 0 ? Math.round((count / scores.length) * 100) : 0,
  }));

  const commonMissingFields = Object.entries(fieldMissingCounts)
    .map(([field, count]) => {
      const def = FIELD_DEFINITIONS.find(d => d.field === field);
      return {
        field,
        count,
        percentage: scores.length > 0 ? Math.round((count / scores.length) * 100) : 0,
        label: def?.label || field,
      };
    })
    .sort((a, b) => b.count - a.count)
    .map(({ label, ...rest }) => ({ ...rest, field: label }));

  const totalCrossIssues = scores.reduce((sum, s) => sum + s.crossValidation.issues.length, 0);
  const criticalIssues = scores.reduce(
    (sum, s) => sum + s.crossValidation.issues.filter(i => i.severity === 'critical').length,
    0
  );
  const averageCrossScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.crossValidation.score, 0) / scores.length)
    : 0;

  const staleBusinesses = scores.filter(s => s.freshness.isStale).length;
  const recentUpdates = scores.filter(s => s.freshness.daysSinceUpdate !== undefined && s.freshness.daysSinceUpdate <= 7).length;
  const averageFreshnessScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.freshness.score, 0) / scores.length)
    : 0;

  const industryScores = scores
    .filter(s => s.industryScore)
    .map(s => s.industryScore!);

  const industryBenchmark = Object.entries(INDUSTRY_BENCHMARKS)
    .map(([code, data]) => {
      const industryScoresFiltered = industryScores.filter(s => s.industryCode === code);
      const avgScore = industryScoresFiltered.length > 0
        ? Math.round(industryScoresFiltered.reduce((sum, s) => sum + s.averageScore, 0) / industryScoresFiltered.length)
        : data.averageScore;

      return {
        industryCode: code,
        industryName: data.name,
        averageScore: avgScore,
        rank: 0,
        percentile: 0,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      percentile: Math.round(((index + 1) / Object.keys(INDUSTRY_BENCHMARKS).length) * 100),
    }));

  return {
    scores,
    report: {
      totalBusinesses: scores.length,
      averageScore,
      gradeDistribution,
      commonMissingFields,
      lowScoreBusinesses: scores.filter(s => s.totalScore < 60).length,
      crossValidationSummary: {
        totalIssues: totalCrossIssues,
        criticalIssues,
        averageCrossScore,
      },
      freshnessSummary: {
        averageFreshnessScore,
        staleBusinesses,
        recentUpdates,
      },
      industryBenchmark,
      evaluatedAt: new Date(),
    },
  };
}

export function getRequiredFieldsForGrade(grade: 'A' | 'B' | 'C' | 'D' | 'F'): string[] {
  const minScoreMap = { A: 90, B: 75, C: 60, D: 40, F: 0 };
  const minScore = minScoreMap[grade];

  let accumulated = 0;
  const required: string[] = [];

  for (const def of FIELD_DEFINITIONS.sort((a, b) => b.weight - a.weight)) {
    accumulated += def.weight;
    if (accumulated >= minScore) {
      required.push(def.field);
    }
  }

  return required;
}

export function getFieldDefinitions(): FieldDefinition[] {
  return [...FIELD_DEFINITIONS];
}

export function getIndustryBenchmarks(): Record<string, { name: string; averageScore: number }> {
  return { ...INDUSTRY_BENCHMARKS };
}
