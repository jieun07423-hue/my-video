import { dbLogger } from '@/lib/logger';
import { QualityMetrics } from './data-quality-monitor.service';
import { TrendAnalysis } from './quality-trend.service';

export interface ExecutiveReport {
  id: string;
  title: string;
  period: { start: Date; end: Date };
  generatedAt: Date;
  summary: ReportSummary;
  sections: ReportSection[];
  recommendations: ExecutiveRecommendation[];
  score: number;
}

export interface ReportSummary {
  totalBusinesses: number;
  overallQualityScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  keyMetrics: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
  };
  trend: 'improving' | 'declining' | 'stable';
  criticalIssues: number;
  improvementOpportunities: number;
}

export interface ReportSection {
  title: string;
  content: string;
  metrics: { label: string; value: string | number; trend?: string }[];
  charts?: ReportChart[];
}

export interface ReportChart {
  type: 'line' | 'bar' | 'pie' | 'gauge';
  title: string;
  data: any[];
}

export interface ExecutiveRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  expectedImpact: string;
  estimatedEffort: string;
  roi: string;
}

export interface DataQualityDashboard {
  overview: {
    totalBusinesses: number;
    qualityScore: number;
    grade: string;
    lastUpdated: Date;
  };
  metrics: {
    completeness: GaugeMetric;
    accuracy: GaugeMetric;
    consistency: GaugeMetric;
    timeliness: GaugeMetric;
  };
  trends: TrendSummary;
  alerts: AlertSummary;
  topIssues: TopIssue[];
}

export interface GaugeMetric {
  value: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

export interface TrendSummary {
  period: string;
  overallTrend: 'improving' | 'declining' | 'stable';
  changes: { metric: string; change: number; direction: 'up' | 'down' }[];
}

export interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unresolved: number;
}

export interface TopIssue {
  field: string;
  issue: string;
  affectedBusinesses: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface BenchmarkComparison {
  ourScore: number;
  industryAverage: number;
  topPerformers: number;
  percentile: number;
  gap: number;
  recommendations: string[];
}

export function generateExecutiveReport(
  metrics: QualityMetrics,
  trends: TrendAnalysis[],
  periodDays: number = 30
): ExecutiveReport {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const summary = generateSummary(metrics, trends);
  const sections = generateSections(metrics, trends);
  const recommendations = generateRecommendations(metrics, trends);

  const score = calculateOverallScore(metrics);

  return {
    id: `report-${Date.now()}`,
    title: '데이터 품질 Executive 리포트',
    period: { start: periodStart, end: now },
    generatedAt: now,
    summary,
    sections,
    recommendations,
    score,
  };
}

function generateSummary(
  metrics: QualityMetrics,
  trends: TrendAnalysis[]
): ReportSummary {
  const completenessTrend = trends.find(t => t.metric === 'averageCompletenessScore');
  const duplicateTrend = trends.find(t => t.metric === 'duplicateRate');
  const staleTrend = trends.find(t => t.metric === 'staleDataRate');

  let overallTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (completenessTrend?.trend === 'up' && duplicateTrend?.trend === 'down') {
    overallTrend = 'improving';
  } else if (completenessTrend?.trend === 'down' || duplicateTrend?.trend === 'up') {
    overallTrend = 'declining';
  }

  const completeness = metrics.averageCompletenessScore;
  const accuracy = Math.max(0, 100 - metrics.duplicateRate * 2);
  const consistency = metrics.crossValidationScore;
  const timeliness = Math.max(0, 100 - metrics.staleDataRate);

  const overallScore = Math.round((completeness + accuracy + consistency + timeliness) / 4);

  return {
    totalBusinesses: metrics.totalBusinesses,
    overallQualityScore: overallScore,
    grade: scoreToGrade(overallScore),
    keyMetrics: {
      completeness,
      accuracy: Math.round(accuracy),
      consistency,
      timeliness,
    },
    trend: overallTrend,
    criticalIssues: metrics.criticalIssuesCount,
    improvementOpportunities: calculateImprovementOpportunities(metrics),
  };
}

function generateSections(
  metrics: QualityMetrics,
  trends: TrendAnalysis[]
): ReportSection[] {
  const sections: ReportSection[] = [];

  sections.push({
    title: '데이터 완성도 분석',
    content: `전체 데이터 완성도는 ${metrics.averageCompletenessScore}%입니다.`,
    metrics: [
      { label: '평균 완성도', value: `${metrics.averageCompletenessScore}%` },
      { label: '등급 분포', value: Object.entries(metrics.gradeDistribution).map(([g, c]) => `${g}: ${c}`).join(', ') },
    ],
    charts: [{
      type: 'gauge',
      title: '완성도 게이지',
      data: [{ value: metrics.averageCompletenessScore, max: 100 }],
    }],
  });

  sections.push({
    title: '데이터 정확도 분석',
    content: `중복률은 ${metrics.duplicateRate}%입니다.`,
    metrics: [
      { label: '중복률', value: `${metrics.duplicateRate}%` },
      { label: '교차검증 점수', value: `${metrics.crossValidationScore}%` },
    ],
  });

  sections.push({
    title: '데이터 신선도 분석',
    content: `오래된 데이터 비율은 ${metrics.staleDataRate}%입니다.`,
    metrics: [
      { label: '오래된 데이터', value: `${metrics.staleDataRate}%` },
      { label: '심각한 이슈', value: `${metrics.criticalIssuesCount}건` },
    ],
  });

  if (trends.length > 0) {
    sections.push({
      title: '트렌드 분석',
      content: '최근 데이터 품질 트렌드입니다.',
      metrics: trends.map(t => ({
        label: t.metric,
        value: t.changeRate,
        trend: t.trend,
      })),
    });
  }

  return sections;
}

function generateRecommendations(
  metrics: QualityMetrics,
  trends: TrendAnalysis[]
): ExecutiveRecommendation[] {
  const recommendations: ExecutiveRecommendation[] = [];

  if (metrics.averageCompletenessScore < 70) {
    recommendations.push({
      priority: 'high',
      category: '데이터 완성도',
      title: '데이터 완성도 개선',
      description: '누락된 필드를 보완하여 데이터 완성도를 높여주세요.',
      expectedImpact: '완성도 10-20% 향상',
      estimatedEffort: '중간 (1-2주)',
      roi: '높음',
    });
  }

  if (metrics.duplicateRate > 10) {
    recommendations.push({
      priority: 'high',
      category: '데이터 정확도',
      title: '중복 데이터 정리',
      description: '중복된 데이터를 탐지하고 병합하여 데이터 정확도를 개선하세요.',
      expectedImpact: '중복률 50% 이상 감소',
      estimatedEffort: '낮음 (3-5일)',
      roi: '매우 높음',
    });
  }

  if (metrics.staleDataRate > 20) {
    recommendations.push({
      priority: 'medium',
      category: '데이터 신선도',
      title: '데이터 업데이트',
      description: '오래된 데이터를 업데이트하여 신선도를 개선하세요.',
      expectedImpact: '신선도 점수 15-25% 향상',
      estimatedEffort: '높음 (2-3주)',
      roi: '중간',
    });
  }

  if (metrics.criticalIssuesCount > 5) {
    recommendations.push({
      priority: 'critical',
      category: '품질 관리',
      title: '심각한 이슈 즉시 해결',
      description: `${metrics.criticalIssuesCount}건의 심각한 이슈를 즉시 해결해야 합니다.`,
      expectedImpact: '품질 점수 20-30% 향상',
      estimatedEffort: '중간 (1-2주)',
      roi: '매우 높음',
    });
  }

  const decliningTrends = trends.filter(t => t.trend === 'down');
  if (decliningTrends.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: '모니터링',
      title: '트렌드 하락 원인 분석',
      description: '하락 추세인 메트릭의 원인을 분석하고 개선 조치를 취하세요.',
      expectedImpact: '추세 안정화',
      estimatedEffort: '중간 (1주)',
      roi: '중간',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      category: '유지 관리',
      title: '현재 수준 유지',
      description: '데이터 품질이 양호한 상태입니다. 현재 수준을 유지하세요.',
      expectedImpact: '지속적 품질 유지',
      estimatedEffort: '낮음 (지속적 모니터링)',
      roi: '중간',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function calculateOverallScore(metrics: QualityMetrics): number {
  const completeness = metrics.averageCompletenessScore;
  const accuracy = Math.max(0, 100 - metrics.duplicateRate * 2);
  const consistency = metrics.crossValidationScore;
  const timeliness = Math.max(0, 100 - metrics.staleDataRate);

  return Math.round((completeness + accuracy + consistency + timeliness) / 4);
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function calculateImprovementOpportunities(metrics: QualityMetrics): number {
  let opportunities = 0;

  if (metrics.averageCompletenessScore < 80) opportunities++;
  if (metrics.duplicateRate > 5) opportunities++;
  if (metrics.staleDataRate > 15) opportunities++;
  if (metrics.criticalIssuesCount > 0) opportunities++;
  if (metrics.crossValidationScore < 80) opportunities++;

  return opportunities;
}

export function generateDashboard(
  metrics: QualityMetrics,
  trends: TrendAnalysis[]
): DataQualityDashboard {
  const completeness = metrics.averageCompletenessScore;
  const accuracy = Math.max(0, 100 - metrics.duplicateRate * 2);
  const consistency = metrics.crossValidationScore;
  const timeliness = Math.max(0, 100 - metrics.staleDataRate);

  const completenessTrend = trends.find(t => t.metric === 'averageCompletenessScore');
  const duplicateTrend = trends.find(t => t.metric === 'duplicateRate');
  const staleTrend = trends.find(t => t.metric === 'staleDataRate');

  return {
    overview: {
      totalBusinesses: metrics.totalBusinesses,
      qualityScore: calculateOverallScore(metrics),
      grade: scoreToGrade(calculateOverallScore(metrics)),
      lastUpdated: new Date(),
    },
    metrics: {
      completeness: {
        value: completeness,
        target: 80,
        status: completeness >= 80 ? 'good' : completeness >= 60 ? 'warning' : 'critical',
        trend: completenessTrend?.trend === 'up' ? 'up' : completenessTrend?.trend === 'down' ? 'down' : 'stable',
      },
      accuracy: {
        value: Math.round(accuracy),
        target: 90,
        status: accuracy >= 90 ? 'good' : accuracy >= 70 ? 'warning' : 'critical',
        trend: duplicateTrend?.trend === 'down' ? 'up' : duplicateTrend?.trend === 'up' ? 'down' : 'stable',
      },
      consistency: {
        value: consistency,
        target: 85,
        status: consistency >= 85 ? 'good' : consistency >= 70 ? 'warning' : 'critical',
        trend: 'stable',
      },
      timeliness: {
        value: Math.round(timeliness),
        target: 80,
        status: timeliness >= 80 ? 'good' : timeliness >= 60 ? 'warning' : 'critical',
        trend: staleTrend?.trend === 'down' ? 'up' : staleTrend?.trend === 'up' ? 'down' : 'stable',
      },
    },
    trends: {
      period: '최근 30일',
      overallTrend: calculateOverallTrend(trends),
      changes: trends.map(t => ({
        metric: t.metric,
        change: t.changeRate,
        direction: t.trend === 'up' ? 'up' : t.trend === 'down' ? 'down' : 'up',
      })),
    },
    alerts: {
      total: metrics.criticalIssuesCount,
      critical: metrics.criticalIssuesCount,
      high: 0,
      medium: 0,
      low: 0,
      unresolved: metrics.criticalIssuesCount,
    },
    topIssues: generateTopIssues(metrics),
  };
}

function calculateOverallTrend(trends: TrendAnalysis[]): 'improving' | 'declining' | 'stable' {
  if (trends.length === 0) return 'stable';

  const improvingCount = trends.filter(t => t.trend === 'up').length;
  const decliningCount = trends.filter(t => t.trend === 'down').length;

  if (improvingCount > decliningCount) return 'improving';
  if (decliningCount > improvingCount) return 'declining';
  return 'stable';
}

function generateTopIssues(metrics: QualityMetrics): TopIssue[] {
  const issues: TopIssue[] = [];

  if (metrics.duplicateRate > 5) {
    issues.push({
      field: '전체',
      issue: '중복 데이터',
      affectedBusinesses: Math.round(metrics.totalBusinesses * metrics.duplicateRate / 100),
      severity: metrics.duplicateRate > 10 ? 'high' : 'medium',
      recommendation: '중복 탐지 및 병합 수행',
    });
  }

  if (metrics.staleDataRate > 15) {
    issues.push({
      field: '전체',
      issue: '오래된 데이터',
      affectedBusinesses: Math.round(metrics.totalBusinesses * metrics.staleDataRate / 100),
      severity: metrics.staleDataRate > 25 ? 'high' : 'medium',
      recommendation: '데이터 업데이트 수행',
    });
  }

  if (metrics.criticalIssuesCount > 0) {
    issues.push({
      field: '여러 필드',
      issue: '심각한 데이터 이슈',
      affectedBusinesses: metrics.criticalIssuesCount,
      severity: 'critical',
      recommendation: '즉시 이슈 해결',
    });
  }

  return issues.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function compareWithBenchmarks(
  metrics: QualityMetrics,
  industryBenchmarks: Record<string, { averageScore: number }>
): BenchmarkComparison {
  const ourScore = calculateOverallScore(metrics);
  const industryAverage = Object.values(industryBenchmarks).reduce(
    (sum, b) => sum + b.averageScore, 0
  ) / Object.keys(industryBenchmarks).length;

  const topPerformers = 90;
  const percentile = Math.round(((ourScore - 50) / (topPerformers - 50)) * 100);
  const gap = topPerformers - ourScore;

  const recommendations: string[] = [];
  if (ourScore < industryAverage) {
    recommendations.push('산업 평균 점수를 달성하기 위해 데이터 품질 개선이 필요합니다.');
  }
  if (ourScore < topPerformers) {
    recommendations.push(`최고 성과자와의 격차: ${gap}점. 추가 개선이 필요합니다.`);
  }

  return {
    ourScore,
    industryAverage: Math.round(industryAverage),
    topPerformers,
    percentile: Math.min(100, Math.max(0, percentile)),
    gap,
    recommendations,
  };
}

export function exportReport(
  report: ExecutiveReport,
  format: 'json' | 'markdown' = 'json'
): string {
  if (format === 'json') {
    return JSON.stringify(report, null, 2);
  }

  const lines = [
    `# ${report.title}`,
    '',
    `**생성일:** ${report.generatedAt.toLocaleString('ko-KR')}`,
    `**기간:** ${report.period.start.toLocaleDateString('ko-KR')} ~ ${report.period.end.toLocaleDateString('ko-KR')}`,
    '',
    '## 요약',
    `- 전체 사업체: ${report.summary.totalBusinesses}건`,
    `- 품질 점수: ${report.summary.overallQualityScore}점 (${report.summary.grade}등급)`,
    `- 트렌드: ${report.summary.trend}`,
    `- 심각한 이슈: ${report.summary.criticalIssues}건`,
    '',
    '## 핵심 지표',
    `- 완성도: ${report.summary.keyMetrics.completeness}%`,
    `- 정확도: ${report.summary.keyMetrics.accuracy}%`,
    `- 일관성: ${report.summary.keyMetrics.consistency}%`,
    `- 신선도: ${report.summary.keyMetrics.timeliness}%`,
    '',
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    lines.push(section.content);
    lines.push('');
    for (const metric of section.metrics) {
      lines.push(`- ${metric.label}: ${metric.value}`);
    }
    lines.push('');
  }

  lines.push('## 권장사항');
  for (const rec of report.recommendations) {
    lines.push(`### ${rec.title}`);
    lines.push(`- **우선순위:** ${rec.priority}`);
    lines.push(`- **카테고리:** ${rec.category}`);
    lines.push(`- **설명:** ${rec.description}`);
    lines.push(`- **기대 효과:** ${rec.expectedImpact}`);
    lines.push(`- **예상 작업량:** ${rec.estimatedEffort}`);
    lines.push(`- **ROI:** ${rec.roi}`);
    lines.push('');
  }

  return lines.join('\n');
}
