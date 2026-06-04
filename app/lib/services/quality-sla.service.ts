import { dbLogger } from '@/lib/logger';

export interface SLAConfig {
  enabled: boolean;
  defaultEvaluationPeriod: 'daily' | 'weekly' | 'monthly';
  alertBeforeBreaching: boolean;
  autoEscalate: boolean;
}

export interface SLADefinition {
  id: string;
  name: string;
  description: string;
  metric: string;
  threshold: number;
  operator: 'gte' | 'lte' | 'eq' | 'neq';
  evaluationPeriod: 'daily' | 'weekly' | 'monthly';
  targets: SLATarget[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SLATarget {
  id: string;
  name: string;
  type: 'overall' | 'department' | 'business';
  targetId?: string;
}

export interface SLAMeasurement {
  id: string;
  slaId: string;
  targetId: string;
  targetName: string;
  measuredValue: number;
  threshold: number;
  status: 'met' | 'breached' | 'warning';
  measuredAt: Date;
  period: { start: Date; end: Date };
}

export interface SLAReport {
  id: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    totalSLAs: number;
    metCount: number;
    breachedCount: number;
    warningCount: number;
    complianceRate: number;
  };
  details: SLADetailReport[];
}

export interface SLADetailReport {
  sla: SLADefinition;
  measurements: SLAMeasurement[];
  averageValue: number;
  complianceRate: number;
  trend: 'improving' | 'declining' | 'stable';
}

const defaultConfig: SLAConfig = {
  enabled: true,
  defaultEvaluationPeriod: 'weekly',
  alertBeforeBreaching: true,
  autoEscalate: false,
};

const slaDefinitions: SLADefinition[] = [];
const measurements: SLAMeasurement[] = [];
const MAX_HISTORY_SIZE = 10000;

export function setSLAConfig(config: Partial<SLAConfig>): void {
  Object.assign(defaultConfig, config);
  dbLogger.debug({ config: defaultConfig }, 'SLA 설정 업데이트');
}

export function getSLAConfig(): SLAConfig {
  return { ...defaultConfig };
}

export function createSLA(
  name: string,
  description: string,
  metric: string,
  threshold: number,
  operator: SLADefinition['operator'],
  evaluationPeriod: SLADefinition['evaluationPeriod'],
  targets: SLATarget[]
): SLADefinition {
  const sla: SLADefinition = {
    id: `sla-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    metric,
    threshold,
    operator,
    evaluationPeriod,
    targets,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  slaDefinitions.push(sla);
  dbLogger.debug({ slaId: sla.id, name, metric, threshold }, 'SLA 생성 완료');
  return sla;
}

export function getSLADefinitions(): SLADefinition[] {
  return [...slaDefinitions];
}

export function getSLAById(slaId: string): SLADefinition | undefined {
  return slaDefinitions.find(s => s.id === slaId);
}

export function updateSLA(slaId: string, updates: Partial<SLADefinition>): boolean {
  const index = slaDefinitions.findIndex(s => s.id === slaId);
  if (index < 0) return false;

  slaDefinitions[index] = {
    ...slaDefinitions[index],
    ...updates,
    updatedAt: new Date(),
  };
  return true;
}

export function deleteSLA(slaId: string): boolean {
  const index = slaDefinitions.findIndex(s => s.id === slaId);
  if (index < 0) return false;

  slaDefinitions.splice(index, 1);
  return true;
}

function evaluateCondition(measured: number, threshold: number, operator: SLADefinition['operator']): boolean {
  switch (operator) {
    case 'gte': return measured >= threshold;
    case 'lte': return measured <= threshold;
    case 'eq': return measured === threshold;
    case 'neq': return measured !== threshold;
    default: return false;
  }
}

export function recordMeasurement(
  slaId: string,
  targetId: string,
  targetName: string,
  measuredValue: number,
  periodStart: Date,
  periodEnd: Date
): SLAMeasurement {
  const sla = getSLAById(slaId);
  if (!sla) {
    throw new Error(`SLA '${slaId}'를 찾을 수 없습니다`);
  }

  const met = evaluateCondition(measuredValue, sla.threshold, sla.operator);
  let status: SLAMeasurement['status'] = 'met';

  if (!met) {
    const diff = Math.abs(measuredValue - sla.threshold);
    status = diff < sla.threshold * 0.1 ? 'warning' : 'breached';
  }

  const measurement: SLAMeasurement = {
    id: `meas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    slaId,
    targetId,
    targetName,
    measuredValue,
    threshold: sla.threshold,
    status,
    measuredAt: new Date(),
    period: { start: periodStart, end: periodEnd },
  };

  measurements.push(measurement);
  if (measurements.length > MAX_HISTORY_SIZE) {
    measurements.splice(0, measurements.length - MAX_HISTORY_SIZE);
  }

  dbLogger.debug({
    slaId,
    targetId,
    measuredValue,
    status,
  }, 'SLA 측정 기록 완료');

  return measurement;
}

export function getMeasurements(
  slaId?: string,
  targetId?: string,
  limit: number = 100
): SLAMeasurement[] {
  let history = [...measurements];
  if (slaId) history = history.filter(m => m.slaId === slaId);
  if (targetId) history = history.filter(m => m.targetId === targetId);
  return history.slice(-limit);
}

export function generateSLAReport(
  periodStart: Date,
  periodEnd: Date
): SLAReport {
  const periodMeasurements = measurements.filter(
    m => m.measuredAt >= periodStart && m.measuredAt <= periodEnd
  );

  const details: SLADetailReport[] = [];

  for (const sla of slaDefinitions) {
    if (!sla.enabled) continue;

    const slaMeasurements = periodMeasurements.filter(m => m.slaId === sla.id);
    if (slaMeasurements.length === 0) continue;

    const metCount = slaMeasurements.filter(m => m.status === 'met').length;
    const complianceRate = Math.round((metCount / slaMeasurements.length) * 100) / 100;
    const averageValue = Math.round(
      slaMeasurements.reduce((sum, m) => sum + m.measuredValue, 0) / slaMeasurements.length * 100
    ) / 100;

    const recentHalf = slaMeasurements.slice(Math.floor(slaMeasurements.length / 2));
    const firstHalf = slaMeasurements.slice(0, Math.floor(slaMeasurements.length / 2));
    const recentCompliance = recentHalf.length > 0 ? recentHalf.filter(m => m.status === 'met').length / recentHalf.length : 0;
    const firstCompliance = firstHalf.length > 0 ? firstHalf.filter(m => m.status === 'met').length / firstHalf.length : 0;

    let trend: SLADetailReport['trend'] = 'stable';
    if (recentCompliance - firstCompliance > 0.1) trend = 'improving';
    else if (firstCompliance - recentCompliance > 0.1) trend = 'declining';

    details.push({
      sla,
      measurements: slaMeasurements,
      averageValue,
      complianceRate,
      trend,
    });
  }

  const metCount = periodMeasurements.filter(m => m.status === 'met').length;
  const breachedCount = periodMeasurements.filter(m => m.status === 'breached').length;
  const warningCount = periodMeasurements.filter(m => m.status === 'warning').length;
  const complianceRate = periodMeasurements.length > 0
    ? Math.round((metCount / periodMeasurements.length) * 100) / 100
    : 1;

  return {
    id: `sla-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    generatedAt: new Date(),
    period: { start: periodStart, end: periodEnd },
    summary: {
      totalSLAs: slaDefinitions.filter(s => s.enabled).length,
      metCount,
      breachedCount,
      warningCount,
      complianceRate,
    },
    details,
  };
}

export function getSLAStats(): {
  totalDefinitions: number;
  activeMeasurements: number;
  overallCompliance: number;
  breachedSLAs: string[];
} {
  const totalDefinitions = slaDefinitions.filter(s => s.enabled).length;
  const activeMeasurements = measurements.length;

  const recentMeasurements = measurements.slice(-100);
  const metCount = recentMeasurements.filter(m => m.status === 'met').length;
  const overallCompliance = recentMeasurements.length > 0
    ? Math.round((metCount / recentMeasurements.length) * 100) / 100
    : 1;

  const breachedSLAs = slaDefinitions
    .filter(s => {
      const recent = measurements.filter(m => m.slaId === s.id).slice(-10);
      return recent.some(m => m.status === 'breached');
    })
    .map(s => s.name);

  return {
    totalDefinitions,
    activeMeasurements,
    overallCompliance,
    breachedSLAs,
  };
}

export function generateSLAReportText(report: SLAReport): string {
  const lines = [
    '# SLA 리포트',
    '',
    `## 기본 정보`,
    `- 리포트 ID: ${report.id}`,
    `- 기간: ${report.period.start.toLocaleDateString('ko-KR')} ~ ${report.period.end.toLocaleDateString('ko-KR')}`,
    `- 생성 시간: ${report.generatedAt.toLocaleString('ko-KR')}`,
    '',
    `## 요약`,
    `- 전체 SLA: ${report.summary.totalSLAs}개`,
    `- 충족: ${report.summary.metCount}개`,
    `- 위반: ${report.summary.breachedCount}개`,
    `- 경고: ${report.summary.warningCount}개`,
    `- 준수율: ${(report.summary.complianceRate * 100).toFixed(1)}%`,
    '',
  ];

  if (report.details.length > 0) {
    lines.push('## 상세 내역');
    for (const detail of report.details) {
      lines.push(`### ${detail.sla.name}`);
      lines.push(`- 지표: ${detail.sla.metric}`);
      lines.push(`- 기준: ${detail.sla.operator} ${detail.sla.threshold}`);
      lines.push(`- 평균값: ${detail.averageValue}`);
      lines.push(`- 준수율: ${(detail.complianceRate * 100).toFixed(1)}%`);
      lines.push(`- 트렌드: ${detail.trend}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
