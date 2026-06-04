import { NextRequest, NextResponse } from 'next/server';
import {
  performQualityCheck,
  getAlertHistory,
  getMetricsHistory,
  acknowledgeAlert,
  getUnacknowledgedAlerts,
  getDefaultThresholds,
} from '@/lib/services/data-quality-monitor.service';
import { businessRepository } from '@/lib/repositories/business.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'alerts') {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const alerts = getAlertHistory(limit);
      return NextResponse.json({ alerts });
    }

    if (action === 'unacknowledged') {
      const alerts = getUnacknowledgedAlerts();
      return NextResponse.json({ alerts, count: alerts.length });
    }

    if (action === 'metrics-history') {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const metrics = getMetricsHistory(limit);
      return NextResponse.json({ metrics });
    }

    if (action === 'thresholds') {
      const thresholds = getDefaultThresholds();
      return NextResponse.json({ thresholds });
    }

    const result = await businessRepository.search({ limit: 500 });
    const businesses = result.items.map((b: any) => ({
      bizesId: b.bizesId,
      name: b.name,
      roadNameAddress: b.roadNameAddress,
      lotNumberAddress: b.lotNumberAddress,
      phone: b.phone,
      latitude: b.latitude,
      longitude: b.longitude,
      businessCode: b.businessCode,
      businessName: b.businessName,
      indsLclsNm: b.indsLclsNm,
      indsMclsNm: b.indsMclsNm,
      indsSclsNm: b.indsSclsNm,
      status: b.status,
      updatedAt: b.updatedAt,
    }));

    const monitoringResult = await performQualityCheck(businesses);

    apiLogger.info({
      totalBusinesses: monitoringResult.metrics.totalBusinesses,
      overallHealth: monitoringResult.overallHealth,
      alertsCount: monitoringResult.alerts.length,
    }, '데이터 품질 모니터링 완료');

    return NextResponse.json(monitoringResult);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '데이터 품질 모니터링 실패');
    return createApiErrorResponse(error, '모니터링 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId } = body;

    if (action === 'acknowledge' && alertId) {
      const success = acknowledgeAlert(alertId);
      if (success) {
        return NextResponse.json({ success: true, message: '알림이 확인 처리되었습니다' });
      }
      return NextResponse.json({ error: '알림을 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '요청 처리 실패');
    return createApiErrorResponse(error, '요청 처리 실패', 500);
  }
}
