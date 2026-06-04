import { NextRequest, NextResponse } from 'next/server';
import {
  queryLineage,
  getLineageSummary,
  getLineageStats,
  getFieldLineage,
  generateLineageReport,
  exportLineage,
} from '@/lib/services/data-lineage.service';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'summary') {
      const businessId = searchParams.get('businessId');
      if (!businessId) {
        return NextResponse.json({ error: 'businessId가 필요합니다' }, { status: 400 });
      }

      const summary = getLineageSummary(businessId);
      return NextResponse.json(summary);
    }

    if (action === 'stats') {
      const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
      const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
      const stats = getLineageStats(startDate, endDate);
      return NextResponse.json(stats);
    }

    if (action === 'field') {
      const businessId = searchParams.get('businessId');
      const field = searchParams.get('field');
      if (!businessId || !field) {
        return NextResponse.json({ error: 'businessId와 field가 필요합니다' }, { status: 400 });
      }

      const fieldLineage = getFieldLineage(businessId, field);
      return NextResponse.json({ lineage: fieldLineage, count: fieldLineage.length });
    }

    if (action === 'report') {
      const businessId = searchParams.get('businessId') || undefined;
      const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
      const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
      const report = generateLineageReport(businessId, startDate, endDate);
      return new NextResponse(report, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (action === 'export') {
      const format = (searchParams.get('format') as 'json' | 'csv') || 'json';
      const businessId = searchParams.get('businessId');
      const field = searchParams.get('field');
      const changeType = searchParams.get('changeType') as any;

      const query: any = {};
      if (businessId) query.businessId = businessId;
      if (field) query.field = field;
      if (changeType) query.changeType = changeType;

      const data = exportLineage(format, query);
      const contentType = format === 'json' ? 'application/json' : 'text/csv';
      return new NextResponse(data, {
        headers: {
          'Content-Type': `${contentType}; charset=utf-8`,
          'Content-Disposition': `attachment; filename=lineage.${format}`,
        },
      });
    }

    const businessId = searchParams.get('businessId');
    const field = searchParams.get('field');
    const changeType = searchParams.get('changeType');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const query: any = {};
    if (businessId) query.businessId = businessId;
    if (field) query.field = field;
    if (changeType) query.changeType = changeType;
    if (source) query.source = source;
    query.limit = limit;
    query.offset = offset;

    const lineage = queryLineage(query);

    apiLogger.info({
      businessId,
      field,
      changeType,
      count: lineage.length,
    }, '데이터 리니지 조회 완료');

    return NextResponse.json({ lineage, count: lineage.length });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '데이터 리니지 조회 실패');
    return createApiErrorResponse(error, '데이터 리니지 조회 실패', 500);
  }
}
