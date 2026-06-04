import { NextRequest, NextResponse } from 'next/server';
import {
  createPolicy,
  checkCompliance,
  getPolicies,
  getPolicy,
  initializeDefaultPolicies,
  generateGovernanceReport,
} from '@/lib/services/quality-governance.service';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'report') {
      const format = searchParams.get('format') || 'json';
      const report = generateGovernanceReport();

      if (format === 'text') {
        return new NextResponse(report, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      const policies = getPolicies();
      const totalRules = policies.reduce((sum, p) => sum + p.rules.length, 0);
      const enabledRules = policies.reduce((sum, p) => sum + p.rules.filter(r => r.enabled).length, 0);

      return NextResponse.json({
        businessId: '전체',
        totalRules,
        enabledRules,
        policiesCount: policies.length,
        report,
        generatedAt: new Date(),
      });
    }

    if (action === 'policies') {
      const policies = getPolicies();
      return NextResponse.json({ policies, count: policies.length });
    }

    const policyId = searchParams.get('policyId');
    if (policyId) {
      const policy = getPolicy(policyId);
      if (!policy) {
        return NextResponse.json({ error: '정책을 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json(policy);
    }

    const policies = getPolicies();

    apiLogger.info({ count: policies.length }, '거버넌스 정책 조회 완료');

    return NextResponse.json({ policies, count: policies.length });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '거버넌스 조회 실패');
    return createApiErrorResponse(error, '거버넌스 조회 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, description, rules, business, policyId } = body;

    if (action === 'init') {
      const policies = initializeDefaultPolicies();
      return NextResponse.json({ policies, count: policies.length });
    }

    if (action === 'create') {
      if (!name || !description || !rules) {
        return NextResponse.json({ error: 'name, description, rules가 필요합니다' }, { status: 400 });
      }
      const policy = createPolicy(name, description, rules);
      return NextResponse.json(policy);
    }

    if (action === 'compliance') {
      if (!business || !policyId) {
        return NextResponse.json({ error: 'business와 policyId가 필요합니다' }, { status: 400 });
      }
      const result = checkCompliance(business, policyId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '거버넌스 처리 실패');
    return createApiErrorResponse(error, '거버넌스 처리 실패', 500);
  }
}
