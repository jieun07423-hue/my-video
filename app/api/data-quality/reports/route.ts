import { NextResponse } from 'next/server';
import {
  generateQualityReport,
  getReportHistory,
  getReportById,
  formatReportAsHtml,
  formatReportAsMarkdown,
  setReportConfig,
  getReportConfig,
} from '@/lib/services/quality-automated-reporting.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'generate';
    const reportId = searchParams.get('reportId');

    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const history = getReportHistory(limit);
      return NextResponse.json({ success: true, data: history });
    }

    if (action === 'config') {
      const config = getReportConfig();
      return NextResponse.json({ success: true, data: config });
    }

    if (action === 'detail' && reportId) {
      const report = getReportById(reportId);
      if (!report) {
        return NextResponse.json(
          { success: false, error: '리포트를 찾을 수 없습니다' },
          { status: 404 }
        );
      }
      const format = searchParams.get('format') || 'json';
      if (format === 'html') {
        const html = formatReportAsHtml(report);
        return new NextResponse(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      if (format === 'markdown') {
        const md = formatReportAsMarkdown(report);
        return new NextResponse(md, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
      return NextResponse.json({ success: true, data: report });
    }

    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const periodStart = startDate ? new Date(startDate) : undefined;
    const periodEnd = endDate ? new Date(endDate) : undefined;

    const report = generateQualityReport(periodStart, periodEnd, 'user');

    const format = searchParams.get('format') || 'json';
    if (format === 'html') {
      const html = formatReportAsHtml(report);
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    if (format === 'markdown') {
      const md = formatReportAsMarkdown(report);
      return new NextResponse(md, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '자동화 리포트 API 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, startDate, endDate } = body;

    if (action === 'config' && config) {
      setReportConfig(config);
      return NextResponse.json({ success: true, data: getReportConfig() });
    }

    if (action === 'generate') {
      const periodStart = startDate ? new Date(startDate) : undefined;
      const periodEnd = endDate ? new Date(endDate) : undefined;
      const report = generateQualityReport(periodStart, periodEnd, 'user');
      return NextResponse.json({ success: true, data: report });
    }

    return NextResponse.json(
      { success: false, error: '잘못된 요청입니다' },
      { status: 400 }
    );
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '리포트 설정 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
