import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  generateExecutiveReport,
  generateDashboard,
  compareWithBenchmarks,
  exportReport,
} from '../advanced-analytics.service';
import { collectMetrics } from '../quality/data-quality-monitor.service';
import { analyzeTrend } from '../quality/quality-trend.service';

describe('AdvancedAnalyticsService', () => {
  const mockBusinesses = [
    {
      bizesId: '1234567890',
      name: '테스트 사업자',
      roadNameAddress: '서울시 강남구 테스트로 123',
      lotNumberAddress: '서울시 강남구 역삼동 123-45',
      phone: '02-1234-5678',
      latitude: 37.5665,
      longitude: 126.978,
      businessCode: 'I56112',
      businessName: '테스트 업종',
      indsLclsNm: '정보통신',
      indsMclsNm: '정보처리',
      indsSclsNm: '소프트웨어',
      status: 'active',
      updatedAt: new Date(),
    },
    {
      bizesId: '0987654321',
      name: '다른 사업자',
      roadNameAddress: '서울시 서초구 테스트로 456',
      lotNumberAddress: '서울시 서초구 서초동 456-78',
      phone: '031-123-4567',
      latitude: 37.4837,
      longitude: 127.0074,
      businessCode: 'G47121',
      businessName: '다른 업종',
      indsLclsNm: '도매소매',
      indsMclsNm: '종합소매',
      indsSclsNm: '백화점',
      status: 'active',
      updatedAt: new Date(),
    },
  ];

  describe('generateExecutiveReport', () => {
    it('should generate executive report', async () => {
      const metrics = await collectMetrics(mockBusinesses);
      const trends = [analyzeTrend([])];
      const report = generateExecutiveReport(metrics, trends, 30);

      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('title');
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('sections');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('score');

      expect(typeof report.score).toBe('number');
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
      expect(report.period).toHaveProperty('start');
      expect(report.period).toHaveProperty('end');
      expect(report.summary).toHaveProperty('grade');
      expect(['A', 'B', 'C', 'D', 'F']).toContain(report.summary.grade);
    });

    it('should include sections', async () => {
      const metrics = await collectMetrics(mockBusinesses);
      const trends = [analyzeTrend([])];
      const report = generateExecutiveReport(metrics, trends, 30);

      expect(Array.isArray(report.sections)).toBe(true);
      expect(report.sections.length).toBeGreaterThan(0);
      report.sections.forEach(section => {
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('content');
        expect(section).toHaveProperty('metrics');
      });
    });

    it('should include recommendations', async () => {
      const metrics = await collectMetrics(mockBusinesses);
      const trends = [analyzeTrend([])];
      const report = generateExecutiveReport(metrics, trends, 30);

      expect(Array.isArray(report.recommendations)).toBe(true);
      report.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
      });
    });
  });

  describe('generateDashboard', () => {
    it('should generate dashboard', async () => {
      const metrics = await collectMetrics(mockBusinesses);
      const trends = [analyzeTrend([])];
      const dashboard = generateDashboard(metrics, trends);

      expect(dashboard).toHaveProperty('overview');
      expect(dashboard).toHaveProperty('metrics');
      expect(dashboard).toHaveProperty('trends');
      expect(dashboard).toHaveProperty('alerts');
      expect(dashboard).toHaveProperty('topIssues');

      expect(dashboard.overview).toHaveProperty('qualityScore');
      expect(dashboard.overview).toHaveProperty('totalBusinesses');
      expect(dashboard.overview).toHaveProperty('grade');
      expect(dashboard.overview).toHaveProperty('lastUpdated');
    });

    it('should include metrics', async () => {
      const metrics = await collectMetrics(mockBusinesses);
      const trends = [analyzeTrend([])];
      const dashboard = generateDashboard(metrics, trends);

      expect(dashboard.metrics).toHaveProperty('completeness');
      expect(dashboard.metrics).toHaveProperty('accuracy');
      expect(dashboard.metrics).toHaveProperty('consistency');
      expect(dashboard.metrics).toHaveProperty('timeliness');

      expect(dashboard.metrics.completeness).toHaveProperty('value');
      expect(dashboard.metrics.completeness).toHaveProperty('target');
      expect(dashboard.metrics.completeness).toHaveProperty('status');
      expect(dashboard.metrics.completeness).toHaveProperty('trend');
    });
  });

  describe('compareWithBenchmarks', () => {
    it('should compare with benchmarks', async () => {
      const metrics = await collectMetrics(mockBusinesses);
      const benchmarks = {
        'I56112': { averageScore: 72 },
        'G47121': { averageScore: 82 },
      };

      const comparison = compareWithBenchmarks(metrics, benchmarks);

      expect(comparison).toHaveProperty('ourScore');
      expect(comparison).toHaveProperty('industryAverage');
      expect(comparison).toHaveProperty('percentile');
      expect(comparison).toHaveProperty('topPerformers');
      expect(comparison).toHaveProperty('gap');
      expect(comparison).toHaveProperty('recommendations');

      expect(typeof comparison.ourScore).toBe('number');
      expect(typeof comparison.industryAverage).toBe('number');
      expect(typeof comparison.percentile).toBe('number');
      expect(comparison.percentile).toBeGreaterThanOrEqual(0);
      expect(comparison.percentile).toBeLessThanOrEqual(100);
    });
  });

  describe('exportReport', () => {
    it('should export report as JSON', async () => {
      const metrics = await collectMetrics(mockBusinesses);
      const trends = [analyzeTrend([])];
      const report = generateExecutiveReport(metrics, trends, 30);

      const jsonReport = exportReport(report, 'json');
      expect(typeof jsonReport).toBe('string');
      const parsed = JSON.parse(jsonReport);
      expect(parsed).toHaveProperty('score');
      expect(parsed).toHaveProperty('grade');
    });

    it('should export report as markdown', async () => {
      const metrics = await collectMetrics(mockBusinesses);
      const trends = [analyzeTrend([])];
      const report = generateExecutiveReport(metrics, trends, 30);

      const markdownReport = exportReport(report, 'markdown');
      expect(typeof markdownReport).toBe('string');
      expect(markdownReport).toContain('데이터 품질 Executive 리포트');
      expect(markdownReport).toContain('품질 점수');
      expect(markdownReport).toContain('등급');
    });
  });
});
