import { NextResponse } from 'next/server';
import {
  getCostConfig,
  setCostConfig,
  getCategories,
  addCategory,
  recordCost,
  recordCorrectionCost,
  recordValidationCost,
  recordReportCost,
  recordFailureCost,
  getCostEntries,
  generateCostReport,
  getCostStats,
  generateCostReportText,
} from '@/lib/services/quality/quality-cost-analysis.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    const categoryId = searchParams.get('categoryId');
    const businessId = searchParams.get('businessId');

    if (action === 'config') {
      const config = getCostConfig();
      return NextResponse.json({ success: true, data: config });
    }

    if (action === 'categories') {
      const cats = getCategories();
      return NextResponse.json({ success: true, data: cats });
    }

    if (action === 'entries') {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const entries = getCostEntries(categoryId || undefined, businessId || undefined, limit);
      return NextResponse.json({ success: true, data: entries });
    }

    if (action === 'report') {
      const startStr = searchParams.get('start');
      const endStr = searchParams.get('end');
      const periodStart = startStr ? new Date(startStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const periodEnd = endStr ? new Date(endStr) : new Date();
      const report = generateCostReport(periodStart, periodEnd);
      return NextResponse.json({ success: true, data: report });
    }

    if (action === 'report-text') {
      const startStr = searchParams.get('start');
      const endStr = searchParams.get('end');
      const periodStart = startStr ? new Date(startStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const periodEnd = endStr ? new Date(endStr) : new Date();
      const report = generateCostReport(periodStart, periodEnd);
      const text = generateCostReportText(report);
      return new NextResponse(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    if (action === 'stats') {
      const stats = getCostStats();
      return NextResponse.json({ success: true, data: stats });
    }

    return NextResponse.json({ success: true, data: getCostStats() });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '비용 API 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, name, description, type, categoryId, description: costDesc, quantity, unitCost, businessId, correctionCount, validationCount, reportCount, failureHours, failureDesc, periodStart, periodEnd } = body;

    if (action === 'config' && config) {
      setCostConfig(config);
      return NextResponse.json({ success: true, data: getCostConfig() });
    }

    if (action === 'addCategory' && name && type) {
      const category = addCategory(name, description || '', type);
      return NextResponse.json({ success: true, data: category });
    }

    if (action === 'record' && categoryId && costDesc && quantity !== undefined && unitCost !== undefined) {
      const entry = recordCost(categoryId, costDesc, quantity, unitCost, businessId);
      return NextResponse.json({ success: true, data: entry });
    }

    if (action === 'recordCorrection' && businessId && correctionCount !== undefined) {
      const entry = recordCorrectionCost(businessId, correctionCount);
      return NextResponse.json({ success: true, data: entry });
    }

    if (action === 'recordValidation' && businessId && validationCount !== undefined) {
      const entry = recordValidationCost(businessId, validationCount);
      return NextResponse.json({ success: true, data: entry });
    }

    if (action === 'recordReport' && reportCount !== undefined) {
      const entry = recordReportCost(reportCount);
      return NextResponse.json({ success: true, data: entry });
    }

    if (action === 'recordFailure' && businessId && failureDesc && failureHours !== undefined) {
      const entry = recordFailureCost(businessId, failureDesc, failureHours);
      return NextResponse.json({ success: true, data: entry });
    }

    if (action === 'report' && periodStart && periodEnd) {
      const report = generateCostReport(new Date(periodStart), new Date(periodEnd));
      return NextResponse.json({ success: true, data: report });
    }

    return NextResponse.json({ success: false, error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '비용 설정 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
