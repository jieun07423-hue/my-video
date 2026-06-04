import { dbLogger } from '@/lib/logger';

export interface DataLineage {
  id: string;
  businessId: string;
  field: string;
  previousValue: any;
  newValue: any;
  changeType: 'create' | 'update' | 'delete' | 'restore';
  source: string;
  userId?: string;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface LineageSummary {
  businessId: string;
  totalChanges: number;
  fieldChanges: Record<string, number>;
  recentChanges: DataLineage[];
  lastModified: Date;
  changeFrequency: number;
}

export interface LineageQuery {
  businessId?: string;
  field?: string;
  changeType?: DataLineage['changeType'];
  source?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface LineageStats {
  totalRecords: number;
  totalChanges: number;
  changesByType: Record<string, number>;
  changesByField: Record<string, number>;
  changesBySource: Record<string, number>;
  averageChangesPerBusiness: number;
  mostActiveBusinesses: { businessId: string; changes: number }[];
}

const lineageStore: DataLineage[] = [];
const MAX_LINEAGE_SIZE = 100000;

export function recordLineage(entry: Omit<DataLineage, 'id' | 'timestamp'>): DataLineage {
  const lineage: DataLineage = {
    id: `lin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...entry,
    timestamp: new Date(),
  };

  lineageStore.push(lineage);

  if (lineageStore.length > MAX_LINEAGE_SIZE) {
    lineageStore.splice(0, lineageStore.length - MAX_LINEAGE_SIZE);
  }

  dbLogger.debug({
    businessId: lineage.businessId,
    field: lineage.field,
    changeType: lineage.changeType,
    source: lineage.source,
  }, '데이터 리니지 기록');

  return lineage;
}

export function queryLineage(query: LineageQuery): DataLineage[] {
  let results = [...lineageStore];

  if (query.businessId) {
    results = results.filter(l => l.businessId === query.businessId);
  }

  if (query.field) {
    results = results.filter(l => l.field === query.field);
  }

  if (query.changeType) {
    results = results.filter(l => l.changeType === query.changeType);
  }

  if (query.source) {
    results = results.filter(l => l.source === query.source);
  }

  if (query.startDate) {
    results = results.filter(l => l.timestamp >= query.startDate!);
  }

  if (query.endDate) {
    results = results.filter(l => l.timestamp <= query.endDate!);
  }

  results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const offset = query.offset || 0;
  const limit = query.limit || 100;
  return results.slice(offset, offset + limit);
}

export function getLineageSummary(businessId: string): LineageSummary {
  const businessLineage = lineageStore.filter(l => l.businessId === businessId);

  const fieldChanges: Record<string, number> = {};
  for (const lineage of businessLineage) {
    fieldChanges[lineage.field] = (fieldChanges[lineage.field] || 0) + 1;
  }

  const recentChanges = businessLineage
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  const lastModified = businessLineage.length > 0
    ? businessLineage[businessLineage.length - 1].timestamp
    : new Date();

  const changeFrequency = calculateChangeFrequency(businessLineage);

  return {
    businessId,
    totalChanges: businessLineage.length,
    fieldChanges,
    recentChanges,
    lastModified,
    changeFrequency,
  };
}

function calculateChangeFrequency(lineage: DataLineage[]): number {
  if (lineage.length < 2) return 0;

  const sorted = lineage.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const timeSpan = sorted[sorted.length - 1].timestamp.getTime() - sorted[0].timestamp.getTime();
  const daysSpan = timeSpan / (1000 * 60 * 60 * 24);

  if (daysSpan === 0) return lineage.length;
  return Math.round((lineage.length / daysSpan) * 100) / 100;
}

export function getFieldLineage(
  businessId: string,
  field: string
): DataLineage[] {
  return lineageStore
    .filter(l => l.businessId === businessId && l.field === field)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function getLineageStats(
  startDate?: Date,
  endDate?: Date
): LineageStats {
  let filteredLineage = [...lineageStore];

  if (startDate) {
    filteredLineage = filteredLineage.filter(l => l.timestamp >= startDate);
  }

  if (endDate) {
    filteredLineage = filteredLineage.filter(l => l.timestamp <= endDate);
  }

  const changesByType: Record<string, number> = {};
  const changesByField: Record<string, number> = {};
  const changesBySource: Record<string, number> = {};
  const businessChanges: Record<string, number> = {};

  for (const lineage of filteredLineage) {
    changesByType[lineage.changeType] = (changesByType[lineage.changeType] || 0) + 1;
    changesByField[lineage.field] = (changesByField[lineage.field] || 0) + 1;
    changesBySource[lineage.source] = (changesBySource[lineage.source] || 0) + 1;
    businessChanges[lineage.businessId] = (businessChanges[lineage.businessId] || 0) + 1;
  }

  const uniqueBusinesses = Object.keys(businessChanges).length;
  const averageChangesPerBusiness = uniqueBusinesses > 0
    ? Math.round((filteredLineage.length / uniqueBusinesses) * 100) / 100
    : 0;

  const mostActiveBusinesses = Object.entries(businessChanges)
    .map(([businessId, changes]) => ({ businessId, changes }))
    .sort((a, b) => b.changes - a.changes)
    .slice(0, 10);

  return {
    totalRecords: filteredLineage.length,
    totalChanges: filteredLineage.length,
    changesByType,
    changesByField,
    changesBySource,
    averageChangesPerBusiness,
    mostActiveBusinesses,
  };
}

export function trackBusinessChanges(
  businessId: string,
  previousData: Record<string, any>,
  newData: Record<string, any>,
  source: string,
  userId?: string
): DataLineage[] {
  const changes: DataLineage[] = [];
  const allFields = new Set([...Object.keys(previousData), ...Object.keys(newData)]);

  for (const field of allFields) {
    const prevValue = previousData[field];
    const newValue = newData[field];

    if (prevValue === newValue) continue;
    if (prevValue === undefined && newValue === undefined) continue;

    let changeType: DataLineage['changeType'];
    if (prevValue === undefined) {
      changeType = 'create';
    } else if (newValue === undefined) {
      changeType = 'delete';
    } else {
      changeType = 'update';
    }

    const lineage = recordLineage({
      businessId,
      field,
      previousValue: prevValue,
      newValue: newValue,
      changeType,
      source,
      userId,
    });

    changes.push(lineage);
  }

  return changes;
}

export function detectSuspiciousChanges(
  businessId: string,
  timeWindowMs: number = 60 * 60 * 1000
): DataLineage[] {
  const now = new Date();
  const windowStart = new Date(now.getTime() - timeWindowMs);

  const recentChanges = lineageStore.filter(
    l => l.businessId === businessId && l.timestamp >= windowStart
  );

  const fieldChangeCounts: Record<string, number> = {};
  for (const change of recentChanges) {
    fieldChangeCounts[change.field] = (fieldChangeCounts[change.field] || 0) + 1;
  }

  const suspiciousChanges = recentChanges.filter(change => {
    const fieldCount = fieldChangeCounts[change.field] || 0;
    return fieldCount > 5;
  });

  return suspiciousChanges;
}

export function generateLineageReport(
  businessId?: string,
  startDate?: Date,
  endDate?: Date
): string {
  const lines = [
    '# 데이터 리니지 리포트',
    '',
  ];

  if (businessId) {
    const summary = getLineageSummary(businessId);
    lines.push(`## 사업체: ${businessId}`);
    lines.push(`- 총 변경 횟수: ${summary.totalChanges}`);
    lines.push(`- 마지막 수정: ${summary.lastModified.toLocaleString('ko-KR')}`);
    lines.push(`- 변경 빈도: ${summary.changeFrequency}회/일`);
    lines.push('');

    lines.push('### 필드별 변경 횟수');
    for (const [field, count] of Object.entries(summary.fieldChanges)) {
      lines.push(`- ${field}: ${count}회`);
    }
  } else {
    const stats = getLineageStats(startDate, endDate);
    lines.push('## 전체 통계');
    lines.push(`- 총 변경 횟수: ${stats.totalChanges}`);
    lines.push(`- 평균 변경 횟수: ${stats.averageChangesPerBusiness}회/사업체`);
    lines.push('');

    lines.push('### 변경 유형별 통계');
    for (const [type, count] of Object.entries(stats.changesByType)) {
      lines.push(`- ${type}: ${count}건`);
    }

    lines.push('');
    lines.push('### 가장 활발한 사업체');
    for (const biz of stats.mostActiveBusinesses.slice(0, 5)) {
      lines.push(`- ${biz.businessId}: ${biz.changes}회`);
    }
  }

  return lines.join('\n');
}

export function clearLineageHistory(olderThanDays?: number): number {
  if (olderThanDays) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialLength = lineageStore.length;
    const toRemove = lineageStore.filter(l => l.timestamp < cutoff);
    lineageStore.splice(0, toRemove.length);
    return toRemove.length;
  }

  const count = lineageStore.length;
  lineageStore.length = 0;
  return count;
}

export function exportLineage(
  format: 'json' | 'csv' = 'json',
  query?: LineageQuery
): string {
  const data = query ? queryLineage(query) : lineageStore;

  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  const headers = ['id', 'businessId', 'field', 'previousValue', 'newValue', 'changeType', 'source', 'userId', 'timestamp', 'reason'];
  const rows = data.map(d =>
    headers.map(h => {
      const value = d[h as keyof DataLineage];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value ?? '');
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
