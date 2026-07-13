import { NextResponse } from 'next/server';
import {
  sendNotification,
  sendQualityCheckAlert,
  sendAnomalyAlert,
  sendThresholdAlert,
  sendDailySummary,
  getNotificationConfig,
  setNotificationConfig,
  getNotificationHistory,
  getNotificationStats,
  generateNotificationReport,
} from '@/lib/services/quality/quality-enhanced-notification.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'config';

    if (action === 'config') {
      const config = getNotificationConfig();
      return NextResponse.json({ success: true, data: config });
    }

    if (action === 'history') {
      const type = searchParams.get('type') || undefined;
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const history = getNotificationHistory(type, limit);
      return NextResponse.json({ success: true, data: history });
    }

    if (action === 'stats') {
      const stats = getNotificationStats();
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'report') {
      const report = generateNotificationReport();
      return NextResponse.json({ success: true, data: { report } });
    }

    return NextResponse.json({ success: true, data: getNotificationConfig() });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '알림 API 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, type, severity, title, message, data, businessId, score, status, anomalyCount, topAnomalies, metric, currentValue, threshold, isBelow, summary } = body;

    if (action === 'config' && config) {
      setNotificationConfig(config);
      return NextResponse.json({ success: true, data: getNotificationConfig() });
    }

    if (action === 'send' && type && severity && title && message) {
      const result = await sendNotification(type, severity, title, message, data);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'qualityCheck' && businessId && score !== undefined && status) {
      const result = await sendQualityCheckAlert(businessId, score, status);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'anomaly' && anomalyCount !== undefined && topAnomalies) {
      const result = await sendAnomalyAlert(anomalyCount, topAnomalies);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'threshold' && metric && currentValue !== undefined && threshold !== undefined) {
      const result = await sendThresholdAlert(metric, currentValue, threshold, isBelow);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'dailySummary' && summary) {
      const result = await sendDailySummary(summary);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: '잘못된 요청입니다' },
      { status: 400 }
    );
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '알림 설정 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
