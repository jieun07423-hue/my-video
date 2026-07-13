import { NextResponse } from 'next/server';
import {
  sendSlackNotification,
  sendEmailNotification,
  sendWebhookNotification,
  addExternalSystem,
  removeExternalSystem,
  getIntegrationConfig,
  setIntegrationConfig,
  getIntegrationHistory,
  getIntegrationStats,
  generateIntegrationReport,
} from '@/lib/services/quality/quality-external-integration.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'config';

    if (action === 'config') {
      const config = getIntegrationConfig();
      return NextResponse.json({ success: true, data: config });
    }

    if (action === 'history') {
      const type = searchParams.get('type') || undefined;
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const history = getIntegrationHistory(type, limit);
      return NextResponse.json({ success: true, data: history });
    }

    if (action === 'stats') {
      const stats = getIntegrationStats();
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'report') {
      const report = generateIntegrationReport();
      return NextResponse.json({ success: true, data: { report } });
    }

    return NextResponse.json({ success: true, data: getIntegrationConfig() });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '외부 연동 API 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, message, severity, subject, recipients, event, payload, name, type, systemConfig } = body;

    if (action === 'config' && config) {
      setIntegrationConfig(config);
      return NextResponse.json({ success: true, data: getIntegrationConfig() });
    }

    if (action === 'slack') {
      const result = await sendSlackNotification(message, severity || 'info');
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'email') {
      const result = await sendEmailNotification(subject, message, recipients);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'webhook') {
      const result = await sendWebhookNotification(event, payload);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'addSystem' && name && type && systemConfig) {
      addExternalSystem(name, type, systemConfig);
      return NextResponse.json({ success: true, data: getIntegrationConfig().externalSystems });
    }

    if (action === 'removeSystem' && name) {
      const removed = removeExternalSystem(name);
      return NextResponse.json({ success: true, data: { removed } });
    }

    return NextResponse.json(
      { success: false, error: '잘못된 요청입니다' },
      { status: 400 }
    );
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '외부 연동 설정 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
