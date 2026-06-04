import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  generateQualityReport,
  getReportHistory,
  getReportById,
  formatReportAsHtml,
  formatReportAsMarkdown,
  setReportConfig,
  getReportConfig,
} from '../quality-automated-reporting.service';

describe('QualityAutomatedReportingService', () => {
  describe('generateQualityReport', () => {
    it('should generate a quality report', () => {
      const report = generateQualityReport();

      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('sections');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('generatedBy');

      expect(report.period).toHaveProperty('start');
      expect(report.period).toHaveProperty('end');
      expect(report.summary).toHaveProperty('overallScore');
      expect(report.summary).toHaveProperty('grade');
      expect(report.summary).toHaveProperty('totalBusinesses');
      expect(report.summary).toHaveProperty('averageScore');

      expect(Array.isArray(report.sections)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.generatedBy).toBe('user');
    });

    it('should accept custom period', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      const report = generateQualityReport(start, end);

      expect(report.period.start).toEqual(start);
      expect(report.period.end).toEqual(end);
    });

    it('should set generatedBy correctly', () => {
      const report = generateQualityReport(undefined, undefined, 'system');
      expect(report.generatedBy).toBe('system');
    });
  });

  describe('getReportHistory', () => {
    it('should return report history', () => {
      generateQualityReport();

      const history = getReportHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', () => {
      generateQualityReport();
      generateQualityReport();

      const history = getReportHistory(1);
      expect(history.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getReportById', () => {
    it('should find report by id', () => {
      const report = generateQualityReport();
      const found = getReportById(report.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(report.id);
    });

    it('should return undefined for non-existent id', () => {
      const found = getReportById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('formatReportAsHtml', () => {
    it('should format report as HTML', () => {
      const report = generateQualityReport();
      const html = formatReportAsHtml(report);

      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain(report.summary.overallScore.toString());
      expect(html).toContain(report.summary.grade);
    });
  });

  describe('formatReportAsMarkdown', () => {
    it('should format report as Markdown', () => {
      const report = generateQualityReport();
      const md = formatReportAsMarkdown(report);

      expect(typeof md).toBe('string');
      expect(md).toContain('# 데이터 품질 리포트');
      expect(md).toContain(`${report.summary.overallScore}점`);
      expect(md).toContain(report.summary.grade);
    });
  });

  describe('config management', () => {
    it('should update and retrieve config', () => {
      setReportConfig({ schedule: 'daily', format: 'pdf' });
      const config = getReportConfig();

      expect(config.schedule).toBe('daily');
      expect(config.format).toBe('pdf');
    });
  });
});
