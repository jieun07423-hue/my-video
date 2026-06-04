import { NextResponse } from 'next/server';
import {
  createSLA,
  getSLADefinitions,
  getSLAById,
  updateSLA,
  deleteSLA,
  recordMeasurement,
  getMeasurements,
  generateSLAReport,
  getSLAStats,
  setSLAConfig,
  getSLAConfig,
  generateSLAReportText,
} from '@/lib/services/quality-sla.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'definitions';
    const slaId = searchParams.get('slaId');

    if (action === 'definitions') {
      const definitions = getSLADefinitions();
      return NextResponse.json({ success: true, data: definitions });
    }

    if (action === 'detail' && slaId) {
      const sla = getSLAById(slaId);
      if (!sla) {
        return NextResponse.json({ success: false, error: 'SLA를 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: sla });
    }

    if (action === 'measurements') {
      const targetId = searchParams.get('targetId');
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const measurements = getMeasurements(slaId || undefined, targetId || undefined, limit);
      return NextResponse.json({ success: true, data: measurements });
    }

    if (action === 'report') {
      const startStr = searchParams.get('start');
      const endStr = searchParams.get('end');
      const periodStart = startStr ? new Date(startStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const periodEnd = endStr ? new Date(endStr) : new Date();
      const report = generateSLAReport(periodStart, periodEnd);
      return NextResponse.json({ success: true, data: report });
    }

    if (action === 'report-text') {
      const startStr = searchParams.get('start');
      const endStr = searchParams.get('end');
      const periodStart = startStr ? new Date(startStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const periodEnd = endStr ? new Date(endStr) : new Date();
      const report = generateSLAReport(periodStart, periodEnd);
      const text = generateSLAReportText(report);
      return new NextResponse(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    if (action === 'stats') {
      const stats = getSLAStats();
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'config') {
      const config = getSLAConfig();
      return NextResponse.json({ success: true, data: config });
    }

    return NextResponse.json({ success: true, data: getSLADefinitions() });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'SLA API 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, name, description, metric, threshold, operator, evaluationPeriod, targets, slaId, targetId, targetName, measuredValue, periodStart, periodEnd } = body;

    if (action === 'config' && config) {
      setSLAConfig(config);
      return NextResponse.json({ success: true, data: getSLAConfig() });
    }

    if (action === 'create' && name && metric && threshold !== undefined && operator && evaluationPeriod && targets) {
      const sla = createSLA(name, description || '', metric, threshold, operator, evaluationPeriod, targets);
      return NextResponse.json({ success: true, data: sla });
    }

    if (action === 'record' && slaId && targetId && targetName && measuredValue !== undefined && periodStart && periodEnd) {
      const measurement = recordMeasurement(slaId, targetId, targetName, measuredValue, new Date(periodStart), new Date(periodEnd));
      return NextResponse.json({ success: true, data: measurement });
    }

    return NextResponse.json({ success: false, error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'SLA 설정 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { slaId, updates } = body;

    if (!slaId || !updates) {
      return NextResponse.json({ success: false, error: 'slaId와 updates가 필요합니다' }, { status: 400 });
    }

    const success = updateSLA(slaId, updates);
    if (!success) {
      return NextResponse.json({ success: false, error: 'SLA를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: getSLAById(slaId) });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'SLA 업데이트 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slaId = searchParams.get('slaId');

    if (!slaId) {
      return NextResponse.json({ success: false, error: 'slaId가 필요합니다' }, { status: 400 });
    }

    const success = deleteSLA(slaId);
    if (!success) {
      return NextResponse.json({ success: false, error: 'SLA를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'SLA 삭제 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
