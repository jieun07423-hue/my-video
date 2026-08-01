import { NextRequest, NextResponse } from 'next/server';
import { automationService } from '@/lib/services/automation.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'rules';
    const ruleId = searchParams.get('ruleId');

    let data: any;

    switch (action) {
      case 'rules':
        data = await automationService.getAllRules();
        break;

      case 'enabled-rules':
        data = await automationService.getEnabledRules();
        break;

      case 'rule':
        if (!ruleId) {
          return NextResponse.json({ error: 'ruleId가 필요합니다' }, { status: 400 });
        }
        data = await automationService.getRule(ruleId);
        if (!data) {
          return NextResponse.json({ error: '규칙을 찾을 수 없습니다' }, { status: 404 });
        }
        break;

      case 'patterns':
        const limit = parseInt(searchParams.get('limit') || '50');
        data = await automationService.getPatterns(limit);
        break;

      case 'analyze':
        data = await automationService.analyzeAndGenerateRules();
        break;

      case 'config':
        data = automationService.getConfig();
        break;

      case 'status':
        data = {
          lastAnalysisTime: automationService.getLastAnalysisTime(),
          isAnalyzing: automationService.isAnalysisRunning(),
        };
        break;

      default:
        return NextResponse.json({ error: '지원하지 않는 액션입니다' }, { status: 400 });
    }

    apiLogger.info({ action, ruleId }, '자동화 조회');
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '자동화 조회 실패');
    return NextResponse.json({ error: '자동화 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let data: any;
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'create-rule': {
        const { name, description, type, condition, action: ruleAction, enabled, priority, metadata } = params;
        if (!name || !description || !type || !condition || !ruleAction) {
          return NextResponse.json({ error: '필수 필드가 누락되었습니다' }, { status: 400 });
        }
        const rule = await automationService.createRule({
          name,
          description,
          type,
          condition,
          action: ruleAction,
          enabled: enabled ?? true,
          priority: priority ?? 10,
          createdBy: 'user',
          metadata,
        });
        return NextResponse.json(rule, { status: 201 });
      }

      case 'update-rule': {
        const { ruleId, ...updates } = params;
        if (!ruleId) {
          return NextResponse.json({ error: 'ruleId가 필요합니다' }, { status: 400 });
        }
        const rule = await automationService.updateRule(ruleId, updates);
        if (!rule) {
          return NextResponse.json({ error: '규칙을 찾을 수 없습니다' }, { status: 404 });
        }
        return NextResponse.json(rule);
      }

      case 'delete-rule': {
        const { ruleId } = params;
        if (!ruleId) {
          return NextResponse.json({ error: 'ruleId가 필요합니다' }, { status: 400 });
        }
        const deleted = await automationService.deleteRule(ruleId);
        return NextResponse.json({ deleted });
      }

      case 'evaluate-rules': {
        const { context } = params;
        if (!context) {
          return NextResponse.json({ error: 'context가 필요합니다' }, { status: 400 });
        }
        const results = await automationService.evaluateRules(context);
        return NextResponse.json({ results });
      }

      case 'update-config': {
        const config = params;
        automationService.updateConfig(config);
        return NextResponse.json({ config: automationService.getConfig() });
      }

      case 'analyze': {
        data = await automationService.analyzeAndGenerateRules();
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: '지원하지 않는 액션입니다' }, { status: 400 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '자동화 작업 실패');
    return NextResponse.json({ error: '자동화 작업 실패' }, { status: 500 });
  }
}