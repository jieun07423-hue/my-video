import { dbLogger } from '@/lib/logger';

export interface QualityPolicy {
  id: string;
  name: string;
  description: string;
  rules: QualityRule[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityRule {
  id: string;
  name: string;
  field: string;
  condition: 'required' | 'format' | 'range' | 'custom';
  parameters: Record<string, any>;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
}

export interface ComplianceCheck {
  id: string;
  policyId: string;
  businessId: string;
  status: 'passed' | 'failed' | 'warning';
  violations: ComplianceViolation[];
  checkedAt: Date;
}

export interface ComplianceViolation {
  ruleId: string;
  ruleName: string;
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  currentValue: any;
  expectedValue?: any;
}

export interface ComplianceReport {
  id: string;
  period: { start: Date; end: Date };
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  complianceRate: number;
  violationsByPolicy: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  topViolations: ComplianceViolation[];
  generatedAt: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  userId?: string;
  target: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

const policies: QualityPolicy[] = [];
const complianceChecks: ComplianceCheck[] = [];
const auditLogs: AuditLog[] = [];

const MAX_AUDIT_LOGS = 50000;

export function createPolicy(
  name: string,
  description: string,
  rules: Omit<QualityRule, 'id' | 'enabled'>[],
  severity: QualityPolicy['severity'] = 'medium'
): QualityPolicy {
  const policy: QualityPolicy = {
    id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    rules: rules.map((rule, index) => ({
      ...rule,
      id: `rule-${Date.now()}-${index}`,
      enabled: true,
    })),
    severity,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  policies.push(policy);
  logAudit('policy_created', 'policy', { policyId: policy.id, name });

  return policy;
}

export function updatePolicy(
  policyId: string,
  updates: Partial<Pick<QualityPolicy, 'name' | 'description' | 'rules' | 'severity' | 'enabled'>>
): boolean {
  const policy = policies.find(p => p.id === policyId);
  if (!policy) return false;

  Object.assign(policy, updates, { updatedAt: new Date() });
  logAudit('policy_updated', 'policy', { policyId, updates });

  return true;
}

export function deletePolicy(policyId: string): boolean {
  const index = policies.findIndex(p => p.id === policyId);
  if (index < 0) return false;

  policies.splice(index, 1);
  logAudit('policy_deleted', 'policy', { policyId });

  return true;
}

export function getPolicies(): QualityPolicy[] {
  return [...policies];
}

export function getPolicy(policyId: string): QualityPolicy | undefined {
  return policies.find(p => p.id === policyId);
}

export function checkCompliance(
  business: Record<string, any>,
  policyId: string
): ComplianceCheck {
  const policy = policies.find(p => p.id === policyId);
  if (!policy) {
    throw new Error(`정책을 찾을 수 없습니다: ${policyId}`);
  }

  const violations: ComplianceViolation[] = [];

  for (const rule of policy.rules) {
    if (!rule.enabled) continue;

    const violation = checkRule(business, rule);
    if (violation) {
      violations.push(violation);
    }
  }

  const status = violations.some(v => v.severity === 'critical' || v.severity === 'high')
    ? 'failed'
    : violations.length > 0
    ? 'warning'
    : 'passed';

  const check: ComplianceCheck = {
    id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    policyId,
    businessId: business.bizesId || business.id || 'unknown',
    status,
    violations,
    checkedAt: new Date(),
  };

  complianceChecks.push(check);
  logAudit('compliance_checked', 'business', {
    businessId: check.businessId,
    policyId,
    status,
    violationsCount: violations.length,
  });

  return check;
}

function checkRule(
  business: Record<string, any>,
  rule: QualityRule
): ComplianceViolation | null {
  const value = business[rule.field];

  switch (rule.condition) {
    case 'required':
      if (value === null || value === undefined || value === '') {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          field: rule.field,
          message: rule.message,
          severity: rule.severity,
          currentValue: value,
        };
      }
      break;

    case 'format':
      if (typeof value === 'string' && rule.parameters.pattern) {
        const regex = new RegExp(rule.parameters.pattern);
        if (!regex.test(value)) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            field: rule.field,
            message: rule.message,
            severity: rule.severity,
            currentValue: value,
            expectedValue: `패턴: ${rule.parameters.pattern}`,
          };
        }
      }
      break;

    case 'range':
      if (typeof value === 'number') {
        const min = rule.parameters.min;
        const max = rule.parameters.max;
        if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            field: rule.field,
            message: rule.message,
            severity: rule.severity,
            currentValue: value,
            expectedValue: `범위: ${min ?? '-∞'} ~ ${max ?? '+∞'}`,
          };
        }
      }
      break;

    case 'custom':
      if (rule.parameters.validator && typeof rule.parameters.validator === 'function') {
        if (!rule.parameters.validator(value, business)) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            field: rule.field,
            message: rule.message,
            severity: rule.severity,
            currentValue: value,
          };
        }
      }
      break;
  }

  return null;
}

export function generateComplianceReport(
  startDate: Date,
  endDate: Date
): ComplianceReport {
  const relevantChecks = complianceChecks.filter(
    check => check.checkedAt >= startDate && check.checkedAt <= endDate
  );

  const passedChecks = relevantChecks.filter(c => c.status === 'passed').length;
  const failedChecks = relevantChecks.filter(c => c.status === 'failed').length;
  const warningChecks = relevantChecks.filter(c => c.status === 'warning').length;

  const violationsByPolicy: Record<string, number> = {};
  const violationsBySeverity: Record<string, number> = {};
  const allViolations: ComplianceViolation[] = [];

  for (const check of relevantChecks) {
    for (const violation of check.violations) {
      violationsByPolicy[check.policyId] = (violationsByPolicy[check.policyId] || 0) + 1;
      violationsBySeverity[violation.severity] = (violationsBySeverity[violation.severity] || 0) + 1;
      allViolations.push(violation);
    }
  }

  const topViolations = allViolations
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 10);

  const complianceRate = relevantChecks.length > 0
    ? Math.round((passedChecks / relevantChecks.length) * 100)
    : 0;

  const report: ComplianceReport = {
    id: `report-${Date.now()}`,
    period: { start: startDate, end: endDate },
    totalChecks: relevantChecks.length,
    passedChecks,
    failedChecks,
    warningChecks,
    complianceRate,
    violationsByPolicy,
    violationsBySeverity,
    topViolations,
    generatedAt: new Date(),
  };

  logAudit('compliance_report_generated', 'system', { reportId: report.id });

  return report;
}

export function logAudit(
  action: string,
  target: string,
  details: Record<string, any>,
  userId?: string,
  ipAddress?: string
): void {
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action,
    userId,
    target,
    details,
    timestamp: new Date(),
    ipAddress,
  };

  auditLogs.push(log);

  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.splice(0, auditLogs.length - MAX_AUDIT_LOGS);
  }
}

export function getAuditLogs(
  query: {
    action?: string;
    target?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): AuditLog[] {
  let results = [...auditLogs];

  if (query.action) {
    results = results.filter(log => log.action === query.action);
  }

  if (query.target) {
    results = results.filter(log => log.target === query.target);
  }

  if (query.userId) {
    results = results.filter(log => log.userId === query.userId);
  }

  if (query.startDate) {
    results = results.filter(log => log.timestamp >= query.startDate!);
  }

  if (query.endDate) {
    results = results.filter(log => log.timestamp <= query.endDate!);
  }

  results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return results.slice(0, query.limit || 100);
}

export function getDefaultPolicies(): Omit<QualityPolicy, 'id' | 'createdAt' | 'updatedAt'>[] {
  return [
    {
      name: '필수 필드 정책',
      description: '모든 사업체에 필수적인 필드가 포함되어야 합니다',
      severity: 'critical',
      enabled: true,
      rules: [
        {
          id: '',
          name: '사업체명 필수',
          field: 'name',
          condition: 'required',
          parameters: {},
          message: '사업체명은 필수 항목입니다',
          severity: 'critical',
          enabled: true,
        },
        {
          id: '',
          name: '사업자등록번호 필수',
          field: 'bizesId',
          condition: 'required',
          parameters: {},
          message: '사업자등록번호는 필수 항목입니다',
          severity: 'critical',
          enabled: true,
        },
      ],
    },
    {
      name: '데이터 형식 정책',
      description: '데이터 형식이 올바르게 입력되어야 합니다',
      severity: 'high',
      enabled: true,
      rules: [
        {
          id: '',
          name: '전화번호 형식',
          field: 'phone',
          condition: 'format',
          parameters: { pattern: '^\\d{2,4}-\\d{3,4}-\\d{4}$' },
          message: '전화번호 형식이 올바르지 않습니다',
          severity: 'high',
          enabled: true,
        },
        {
          id: '',
          name: '위도 범위',
          field: 'latitude',
          condition: 'range',
          parameters: { min: 33, max: 39 },
          message: '위도가 대한민국 범위를 벗어났습니다',
          severity: 'critical',
          enabled: true,
        },
        {
          id: '',
          name: '경도 범위',
          field: 'longitude',
          condition: 'range',
          parameters: { min: 124, max: 132 },
          message: '경도가 대한민국 범위를 벗어났습니다',
          severity: 'critical',
          enabled: true,
        },
      ],
    },
    {
      name: '영업상태 정책',
      description: '유효한 영업상태값이어야 합니다',
      severity: 'medium',
      enabled: true,
      rules: [
        {
          id: '',
          name: '영업상태 값',
          field: 'status',
          condition: 'custom',
          parameters: {
            validator: (value: any) => {
              const validStatuses = ['active', 'inactive', 'dissolved', 'pending', 'pending_renewal'];
              return validStatuses.includes(value);
            },
          },
          message: '유효하지 않은 영업상태입니다',
          severity: 'medium',
          enabled: true,
        },
      ],
    },
  ];
}

export function initializeDefaultPolicies(): QualityPolicy[] {
  const defaultPolicies = getDefaultPolicies();
  const createdPolicies: QualityPolicy[] = [];

  for (const policyData of defaultPolicies) {
    const policy = createPolicy(
      policyData.name,
      policyData.description,
      policyData.rules,
      policyData.severity
    );
    createdPolicies.push(policy);
  }

  return createdPolicies;
}

export function generateGovernanceReport(): string {
  const lines = [
    '# 데이터 품질 거버넌스 리포트',
    '',
    `## 정책 현황`,
    `- 등록된 정책: ${policies.length}개`,
    `- 활성화된 정책: ${policies.filter(p => p.enabled).length}개`,
    '',
    `## 컴플라이언스 현황`,
    `- 총 검사 횟수: ${complianceChecks.length}건`,
    `- 통과: ${complianceChecks.filter(c => c.status === 'passed').length}건`,
    `- 실패: ${complianceChecks.filter(c => c.status === 'failed').length}건`,
    `- 경고: ${complianceChecks.filter(c => c.status === 'warning').length}건`,
    '',
    `## 감사 로그`,
    `- 총 로그: ${auditLogs.length}건`,
    '',
  ];

  const recentLogs = auditLogs.slice(-10);
  if (recentLogs.length > 0) {
    lines.push('### 최근 감사 로그');
    for (const log of recentLogs) {
      lines.push(`- ${log.timestamp.toLocaleString('ko-KR')}: ${log.action} (${log.target})`);
    }
  }

  return lines.join('\n');
}
