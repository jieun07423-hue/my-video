import { NextResponse } from 'next/server';
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  executeWorkflow,
  getExecutionHistory,
  getRemediationStats,
  setRemediationConfig,
  getRemediationConfig,
  generateRemediationReport,
} from '@/lib/services/quality/quality-auto-remediation.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'workflows';
    const workflowId = searchParams.get('workflowId');

    if (action === 'workflows') {
      const workflows = getWorkflows();
      return NextResponse.json({ success: true, data: workflows });
    }

    if (action === 'workflow' && workflowId) {
      const workflow = getWorkflowById(workflowId);
      if (!workflow) {
        return NextResponse.json({ success: false, error: '워크플로우를 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: workflow });
    }

    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const history = getExecutionHistory(workflowId || undefined, limit);
      return NextResponse.json({ success: true, data: history });
    }

    if (action === 'stats') {
      const stats = getRemediationStats();
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'config') {
      const config = getRemediationConfig();
      return NextResponse.json({ success: true, data: config });
    }

    return NextResponse.json({ success: true, data: getWorkflows() });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '치료 API 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, name, description, trigger, steps, priority, workflowId, businessId, eventData } = body;

    if (action === 'config' && config) {
      setRemediationConfig(config);
      return NextResponse.json({ success: true, data: getRemediationConfig() });
    }

    if (action === 'create' && name && trigger && steps) {
      const workflow = createWorkflow(name, description || '', trigger, steps, priority || 0);
      return NextResponse.json({ success: true, data: workflow });
    }

    if (action === 'execute' && workflowId && businessId && eventData) {
      const result = await executeWorkflow(workflowId, businessId, eventData);
      const report = generateRemediationReport(result);
      return NextResponse.json({ success: true, data: { result, report } });
    }

    return NextResponse.json({ success: false, error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '치료 설정 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { workflowId, updates } = body;

    if (!workflowId || !updates) {
      return NextResponse.json({ success: false, error: 'workflowId와 updates가 필요합니다' }, { status: 400 });
    }

    const success = updateWorkflow(workflowId, updates);
    if (!success) {
      return NextResponse.json({ success: false, error: '워크플로우를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: getWorkflowById(workflowId) });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '치료 업데이트 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    if (!workflowId) {
      return NextResponse.json({ success: false, error: 'workflowId가 필요합니다' }, { status: 400 });
    }

    const success = deleteWorkflow(workflowId);
    if (!success) {
      return NextResponse.json({ success: false, error: '워크플로우를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '치료 삭제 오류');
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
