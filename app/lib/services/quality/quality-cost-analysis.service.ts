import { dbLogger } from '@/lib/logger';

export interface CostConfig {
  enabled: boolean;
  currency: string;
  costPerCorrection: number;
  costPerValidation: number;
  costPerReport: number;
  hourlyLaborCost: number;
}

export interface CostCategory {
  id: string;
  name: string;
  description: string;
  type: 'prevention' | 'detection' | 'correction' | 'failure';
  enabled: boolean;
}

export interface CostEntry {
  id: string;
  categoryId: string;
  businessId?: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CostReport {
  id: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    totalCost: number;
    costByCategory: Record<string, number>;
    costByType: Record<string, number>;
    costPerBusiness: number;
    roi: number;
  };
  trends: CostTrend[];
  recommendations: string[];
}

export interface CostTrend {
  period: string;
  cost: number;
  change: number;
  changeRate: number;
}

const defaultConfig: CostConfig = {
  enabled: true,
  currency: 'KRW',
  costPerCorrection: 500,
  costPerValidation: 100,
  costPerReport: 200,
  hourlyLaborCost: 30000,
};

const categories: CostCategory[] = [
  {
    id: 'cat-prevention',
    name: '예방 비용',
    description: '데이터 품질 문제 예방을 위한 비용',
    type: 'prevention',
    enabled: true,
  },
  {
    id: 'cat-detection',
    name: '탐지 비용',
    description: '데이터 품질 문제 탐지를 위한 비용',
    type: 'detection',
    enabled: true,
  },
  {
    id: 'cat-correction',
    name: '수정 비용',
    description: '데이터 품질 문제 수정을 위한 비용',
    type: 'correction',
    enabled: true,
  },
  {
    id: 'cat-failure',
    name: '실패 비용',
    description: '데이터 품질 문제로 인한 실패 비용',
    type: 'failure',
    enabled: true,
  },
];

const costEntries: CostEntry[] = [];
const MAX_HISTORY_SIZE = 50000;

export function setCostConfig(config: Partial<CostConfig>): void {
  Object.assign(defaultConfig, config);
  dbLogger.debug({ config: defaultConfig }, '비용 설정 업데이트');
}

export function getCostConfig(): CostConfig {
  return { ...defaultConfig };
}

export function getCategories(): CostCategory[] {
  return [...categories];
}

export function addCategory(name: string, description: string, type: CostCategory['type']): CostCategory {
  const category: CostCategory = {
    id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    type,
    enabled: true,
  };

  categories.push(category);
  return category;
}

export function recordCost(
  categoryId: string,
  description: string,
  quantity: number,
  unitCost: number,
  businessId?: string,
  metadata?: Record<string, any>
): CostEntry {
  const entry: CostEntry = {
    id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    categoryId,
    businessId,
    description,
    quantity,
    unitCost,
    totalCost: quantity * unitCost,
    timestamp: new Date(),
    metadata,
  };

  costEntries.push(entry);
  if (costEntries.length > MAX_HISTORY_SIZE) {
    costEntries.splice(0, costEntries.length - MAX_HISTORY_SIZE);
  }

  dbLogger.debug({
    entryId: entry.id,
    categoryId,
    totalCost: entry.totalCost,
  }, '비용 기록 완료');

  return entry;
}

export function recordCorrectionCost(businessId: string, correctionCount: number): CostEntry {
  return recordCost(
    'cat-correction',
    `데이터 보정 ${correctionCount}건`,
    correctionCount,
    defaultConfig.costPerCorrection,
    businessId
  );
}

export function recordValidationCost(businessId: string, validationCount: number): CostEntry {
  return recordCost(
    'cat-detection',
    `데이터 검증 ${validationCount}건`,
    validationCount,
    defaultConfig.costPerValidation,
    businessId
  );
}

export function recordReportCost(reportCount: number): CostEntry {
  return recordCost(
    'cat-detection',
    `리포트 생성 ${reportCount}건`,
    reportCount,
    defaultConfig.costPerReport
  );
}

export function recordFailureCost(businessId: string, description: string, estimatedHours: number): CostEntry {
  return recordCost(
    'cat-failure',
    description,
    estimatedHours,
    defaultConfig.hourlyLaborCost,
    businessId
  );
}

export function getCostEntries(
  categoryId?: string,
  businessId?: string,
  limit: number = 100
): CostEntry[] {
  let entries = [...costEntries];
  if (categoryId) entries = entries.filter(e => e.categoryId === categoryId);
  if (businessId) entries = entries.filter(e => e.businessId === businessId);
  return entries.slice(-limit);
}

export function generateCostReport(
  periodStart: Date,
  periodEnd: Date
): CostReport {
  const periodEntries = costEntries.filter(
    e => e.timestamp >= periodStart && e.timestamp <= periodEnd
  );

  const totalCost = periodEntries.reduce((sum, e) => sum + e.totalCost, 0);

  const costByCategory: Record<string, number> = {};
  const costByType: Record<string, number> = {};

  for (const entry of periodEntries) {
    costByCategory[entry.categoryId] = (costByCategory[entry.categoryId] || 0) + entry.totalCost;
    const category = categories.find(c => c.id === entry.categoryId);
    if (category) {
      costByType[category.type] = (costByType[category.type] || 0) + entry.totalCost;
    }
  }

  const uniqueBusinesses = new Set(periodEntries.filter(e => e.businessId).map(e => e.businessId));
  const costPerBusiness = uniqueBusinesses.size > 0 ? totalCost / uniqueBusinesses.size : 0;

  const preventionCost = costByType['prevention'] || 0;
  const detectionCost = costByType['detection'] || 0;
  const correctionCost = costByType['correction'] || 0;
  const failureCost = costByType['failure'] || 0;
  const totalInvestment = preventionCost + detectionCost + correctionCost;
  const roi = totalInvestment > 0 ? (failureCost / totalInvestment) * 100 : 0;

  const trends: CostTrend[] = [];
  const dayCount = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(periodStart);
    date.setDate(date.getDate() + i);
    const dayStr = date.toISOString().split('T')[0];
    const dayEntries = periodEntries.filter(e => e.timestamp.toISOString().split('T')[0] === dayStr);
    const dayCost = dayEntries.reduce((sum, e) => sum + e.totalCost, 0);
    const prevCost = trends.length > 0 ? trends[trends.length - 1].cost : dayCost;
    trends.push({
      period: dayStr,
      cost: dayCost,
      change: dayCost - prevCost,
      changeRate: prevCost > 0 ? ((dayCost - prevCost) / prevCost) * 100 : 0,
    });
  }

  const recommendations: string[] = [];
  if (failureCost > totalInvestment * 0.5) {
    recommendations.push('실패 비용이 투자 비용의 50%를 초과합니다. 예방 투자를 확대하세요.');
  }
  if (correctionCost > detectionCost * 2) {
    recommendations.push('수정 비용이 탐지 비용의 2배를 초과합니다. 사전 탐지 역량을 강화하세요.');
  }
  if (preventionCost < totalCost * 0.1) {
    recommendations.push('예방 비용이 전체 비용의 10% 미만입니다. 예방 투자를 늘리세요.');
  }

  return {
    id: `cost-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    generatedAt: new Date(),
    period: { start: periodStart, end: periodEnd },
    summary: {
      totalCost,
      costByCategory,
      costByType,
      costPerBusiness: Math.round(costPerBusiness),
      roi: Math.round(roi * 100) / 100,
    },
    trends,
    recommendations,
  };
}

export function getCostStats(): {
  totalEntries: number;
  totalCost: number;
  averageCostPerEntry: number;
  topExpensiveCategories: { name: string; cost: number }[];
} {
  const totalEntries = costEntries.length;
  const totalCost = costEntries.reduce((sum, e) => sum + e.totalCost, 0);
  const averageCostPerEntry = totalEntries > 0 ? Math.round(totalCost / totalEntries) : 0;

  const categoryCosts: Record<string, number> = {};
  for (const entry of costEntries) {
    categoryCosts[entry.categoryId] = (categoryCosts[entry.categoryId] || 0) + entry.totalCost;
  }

  const topExpensiveCategories = Object.entries(categoryCosts)
    .map(([catId, cost]) => ({
      name: categories.find(c => c.id === catId)?.name || catId,
      cost,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return {
    totalEntries,
    totalCost,
    averageCostPerEntry,
    topExpensiveCategories,
  };
}

export function generateCostReportText(report: CostReport): string {
  const lines = [
    '# 데이터 품질 비용 리포트',
    '',
    `## 기본 정보`,
    `- 리포트 ID: ${report.id}`,
    `- 기간: ${report.period.start.toLocaleDateString('ko-KR')} ~ ${report.period.end.toLocaleDateString('ko-KR')}`,
    `- 생성 시간: ${report.generatedAt.toLocaleString('ko-KR')}`,
    '',
    `## 요약`,
    `- 전체 비용: ${report.summary.totalCost.toLocaleString()}${defaultConfig.currency}`,
    `- 사업체당 평균: ${report.summary.costPerBusiness.toLocaleString()}${defaultConfig.currency}`,
    `- ROI: ${report.summary.roi}%`,
    '',
  ];

  if (Object.keys(report.summary.costByType).length > 0) {
    lines.push('## 유형별 비용');
    for (const [type, cost] of Object.entries(report.summary.costByType)) {
      lines.push(`- ${type}: ${cost.toLocaleString()}${defaultConfig.currency}`);
    }
    lines.push('');
  }

  if (report.recommendations.length > 0) {
    lines.push('## 개선 권고사항');
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`);
    }
  }

  return lines.join('\n');
}
