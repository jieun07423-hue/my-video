import { NextResponse } from 'next/server';
import { businessRepository } from '@/lib/repositories/business.repository';
import {
  validateField,
  validateBusiness,
  validateBusinessBatch,
  getValidationStats,
  generateValidationReport,
  createRule,
  createRuleSet,
  getRules,
  getRuleSets,
  initializeDefaultRuleSets,
  setRulesEngineConfig,
  getRulesEngineConfig,
} from '@/lib/services/quality-rules-engine.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'validate';
    const businessId = searchParams.get('businessId');
    const fieldName = searchParams.get('fieldName');
    const value = searchParams.get('value');

    if (action === 'stats') {
      const stats = getValidationStats();
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'rules') {
      const rules = getRules();
      return NextResponse.json({ success: true, data: rules });
    }

    if (action === 'ruleSets') {
      const ruleSets = getRuleSets();
      return NextResponse.json({ success: true, data: ruleSets });
    }

    if (action === 'config') {
      const config = getRulesEngineConfig();
      return NextResponse.json({ success: true, data: config });
    }

    if (action === 'field' && fieldName && value) {
      const ruleSetId = searchParams.get('ruleSetId');
      const result = validateField(fieldName, value, ruleSetId || undefined);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'report' && businessId) {
      const business = await businessRepository.findByBizesId(businessId);
      if (!business) {
        return NextResponse.json(
          { success: false, error: '사업자를 찾을 수 없습니다' },
          { status: 404 }
        );
      }
      const report = generateValidationReport(business);
      return NextResponse.json({ success: true, data: { report } });
    }

    if (action === 'report' && !businessId) {
      const report = generateValidationReport();
      return NextResponse.json({ success: true, data: { report } });
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId가 필요합니다' },
        { status: 400 }
      );
    }

    const business = await businessRepository.findByBizesId(businessId);
    if (!business) {
      return NextResponse.json(
        { success: false, error: '사업자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const ruleSetId = searchParams.get('ruleSetId');
    const result = validateBusiness(business, ruleSetId || undefined);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '규칙 엔진 API 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, rule, ruleSet, businessIds, fieldName, value, config } = body;

    if (action === 'createRule' && rule) {
      const newRule = createRule(rule);
      return NextResponse.json({ success: true, data: newRule });
    }

    if (action === 'createRuleSet' && ruleSet) {
      const newRuleSet = createRuleSet(ruleSet);
      return NextResponse.json({ success: true, data: newRuleSet });
    }

    if (action === 'initialize') {
      initializeDefaultRuleSets();
      return NextResponse.json({ success: true, message: '기본 규칙 세트가 초기화되었습니다' });
    }

    if (action === 'config' && config) {
      setRulesEngineConfig(config);
      return NextResponse.json({ success: true, data: getRulesEngineConfig() });
    }

    if (action === 'validateField' && fieldName && value !== undefined) {
      const ruleSetId = body.ruleSetId;
      const result = validateField(fieldName, value, ruleSetId);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'batch' && businessIds && Array.isArray(businessIds)) {
      const businesses = await Promise.all(
        businessIds.map((id: string) => businessRepository.findByBizesId(id))
      );
      const validBusinesses = businesses.filter((b): b is NonNullable<typeof b> => b !== null);
      const ruleSetId = body.ruleSetId;
      const results = validateBusinessBatch(validBusinesses, ruleSetId);
      return NextResponse.json({ success: true, data: results });
    }

    return NextResponse.json(
      { success: false, error: '잘못된 요청입니다' },
      { status: 400 }
    );
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '규칙 엔진 설정 오류');
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}