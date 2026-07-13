import { dbLogger } from '@/lib/logger';
import { calculateQualityScore, getScoreHistory, getScoreStats } from './quality-scoring.service';
import { getCheckHistory, getCheckStats } from '../realtime-quality-check.service';
import { getValidationStats } from './quality-rules-engine.service';

export interface ReportConfig {
  autoGenerate: boolean;
  schedule: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  includeCharts: boolean;
  format: 'pdf' | 'html' | 'json';
}

export interface QualityReport {
  id: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    overallScore: number;
    grade: string;
    totalBusinesses: number;
    checkedBusinesses: number;
    passedChecks: number;
    failedChecks: number;
    averageScore: number;
  };
  sections: ReportSection[];
  recommendations: string[];
  generatedBy: 'system' | 'user';
}

export interface ReportSection {
  title: string;
  content: string;
  data?: any;
}

const defaultReportConfig: ReportConfig = {
  autoGenerate: true,
  schedule: 'weekly',
  recipients: [],
  includeCharts: true,
  format: 'html',
};

const reportHistory: QualityReport[] = [];
const MAX_HISTORY_SIZE = 1000;

export function setReportConfig(config: Partial<ReportConfig>): void {
  Object.assign(defaultReportConfig, config);
  dbLogger.debug({ config: defaultReportConfig }, '리포트 설정 업데이트');
}

export function getReportConfig(): ReportConfig {
  return { ...defaultReportConfig };
}

export function generateQualityReport(
  periodStart?: Date,
  periodEnd?: Date,
  generatedBy: 'system' | 'user' = 'user'
): QualityReport {
  const now = new Date();
  const start = periodStart || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const end = periodEnd || now;

  const checkStats = getCheckStats();
  const scoreStats = getScoreStats();
  const validationStats = getValidationStats();

  const recentScores = getScoreHistory(undefined, 1000);
  const periodScores = recentScores.filter(
    s => s.calculatedAt >= start && s.calculatedAt <= end
  );

  const overallScore = periodScores.length > 0
    ? Math.round(periodScores.reduce((sum, s) => sum + s.overallScore, 0) / periodScores.length)
    : scoreStats.averageScore;

  const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 40 ? 'D' : 'F';

  const sections: ReportSection[] = [];

  sections.push({
    title: '요약',
    content: `
      기간: ${start.toLocaleDateString('ko-KR')} ~ ${end.toLocaleDateString('ko-KR')}
      전체 사업체: ${validationStats.totalRecords ?? validationStats.totalValidations ?? 0}개
      검증 완료: ${checkStats.totalChecks}회
      평균 점수: ${scoreStats.averageScore}점
    `,
    data: {
      period: { start, end },
      overallScore,
      grade,
    },
  });

  const failedRules = validationStats.failedRules ?? validationStats.topFailingRules ?? [];
  if (failedRules.length > 0) {
    sections.push({
      title: '실패한 검증 규칙',
      content: failedRules.map((r: any) => `${r.ruleName}: ${r.count ?? r.failureCount ?? 0}회 실패`).join('\n'),
      data: failedRules,
    });
  }

  const gradeDistribution = scoreStats.gradeDistribution;
  sections.push({
    title: '등급 분포',
    content: Object.entries(gradeDistribution)
      .map(([g, count]) => `${g}등급: ${count}개`)
      .join('\n'),
    data: gradeDistribution,
  });

  const recommendations: string[] = [];
  if (overallScore < 60) {
    recommendations.push('전반적인 데이터 품질 개선이 필요합니다.');
  }
  if (checkStats.passRate < 0.8) {
    recommendations.push('검증 통과율을 높이기 위해 데이터 정규화가 필요합니다.');
  }
  if (failedRules.length > 0) {
    recommendations.push('반복적으로 실패하는 규칙의 기준을 재검토하세요.');
  }
  if (periodScores.length === 0) {
    recommendations.push('해당 기간에 데이터가 없습니다. 동기화 상태를 확인하세요.');
  }

  const report: QualityReport = {
    id: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    generatedAt: now,
    period: { start, end },
    summary: {
      overallScore,
      grade,
      totalBusinesses: validationStats.totalRecords,
      checkedBusinesses: checkStats.totalChecks,
      passedChecks: Math.round(checkStats.totalChecks * checkStats.passRate),
      failedChecks: Math.round(checkStats.totalChecks * (1 - checkStats.passRate)),
      averageScore: scoreStats.averageScore,
    },
    sections,
    recommendations,
    generatedBy,
  };

  reportHistory.push(report);
  if (reportHistory.length > MAX_HISTORY_SIZE) {
    reportHistory.splice(0, reportHistory.length - MAX_HISTORY_SIZE);
  }

  dbLogger.debug({ reportId: report.id, grade, score: overallScore }, '품질 리포트 생성 완료');

  return report;
}

export function getReportHistory(limit: number = 50): QualityReport[] {
  return reportHistory.slice(-limit);
}

export function getReportById(reportId: string): QualityReport | undefined {
  return reportHistory.find(r => r.id === reportId);
}

export function formatReportAsHtml(report: QualityReport): string {
  const sectionsHtml = report.sections
    .map(section => `
      <div class="section">
        <h2>${section.title}</h2>
        <pre>${section.content}</pre>
      </div>
    `)
    .join('');

  const recommendationsHtml = report.recommendations
    .map(rec => `<li>${rec}</li>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>데이터 품질 리포트 - ${report.period.start.toLocaleDateString('ko-KR')}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        pre { background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
        .grade { font-size: 24px; font-weight: bold; color: ${report.summary.grade === 'A' ? '#4CAF50' : report.summary.grade === 'B' ? '#8BC34A' : report.summary.grade === 'C' ? '#FFC107' : report.summary.grade === 'D' ? '#FF9800' : '#F44336'}; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>데이터 품질 리포트</h1>
        <p>기간: ${report.period.start.toLocaleDateString('ko-KR')} ~ ${report.period.end.toLocaleDateString('ko-KR')}</p>
        <p>생성 시간: ${report.generatedAt.toLocaleString('ko-KR')}</p>
        <p>종합 점수: <span class="grade">${report.summary.overallScore}점 (${report.summary.grade}등급)</span></p>
      </div>
      ${sectionsHtml}
      <div class="section">
        <h2>개선 권고사항</h2>
        <ul>${recommendationsHtml}</ul>
      </div>
    </body>
    </html>
  `;
}

export function formatReportAsMarkdown(report: QualityReport): string {
  const sectionsMd = report.sections
    .map(section => `
## ${section.title}

${section.content}
    `)
    .join('');

  const recommendationsMd = report.recommendations
    .map(rec => `- ${rec}`)
    .join('\n');

  return `
# 데이터 품질 리포트

**기간:** ${report.period.start.toLocaleDateString('ko-KR')} ~ ${report.period.end.toLocaleDateString('ko-KR')}
**생성 시간:** ${report.generatedAt.toLocaleString('ko-KR')}
**종합 점수:** ${report.summary.overallScore}점 (${report.summary.grade}등급)

${sectionsMd}

## 개선 권고사항

${recommendationsMd}
  `;
}
