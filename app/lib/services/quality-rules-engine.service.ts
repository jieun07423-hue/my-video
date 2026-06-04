import { dbLogger } from '@/lib/logger';

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  field: string;
  type: 'required' | 'format' | 'range' | 'custom' | 'composite';
  condition: RuleCondition;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'regex' | 'minLength' | 'maxLength' | 'min' | 'max' | 'in' | 'notIn' | 'custom';
  value?: any;
  values?: any[];
  pattern?: string;
  customFunction?: string;
}

export interface RuleValidationResult {
  ruleId: string;
  ruleName: string;
  field: string;
  passed: boolean;
  message: string;
  severity: QualityRule['severity'];
  actualValue: any;
  expectedValue?: any;
  timestamp: Date;
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  rules: QualityRule[];
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  ruleSetId: string;
  ruleSetName: string;
  businessId: string;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  skippedRules: number;
  score: number;
  results: RuleValidationResult[];
  validatedAt: Date;
}

const ruleSets: RuleSet[] = [];
const validationHistory: ValidationResult[] = [];
const MAX_HISTORY_SIZE = 10000;

export function createRule(
  name: string,
  description: string,
  field: string,
  type: QualityRule['type'],
  condition: RuleCondition,
  severity: QualityRule['severity'] = 'medium',
  category: string = '기본',
  tags: string[] = []
): QualityRule {
  const rule: QualityRule = {
    id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    field,
    type,
    condition,
    severity,
    enabled: true,
    category,
    tags,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  dbLogger.debug({ ruleId: rule.id, name, field }, '규칙 생성 완료');
  return rule;
}

export function createRuleSet(
  name: string,
  description: string,
  rules: QualityRule[],
  priority: number = 0
): RuleSet {
  const ruleSet: RuleSet = {
    id: `ruleset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    rules,
    enabled: true,
    priority,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  ruleSets.push(ruleSet);
  dbLogger.debug({ ruleSetId: ruleSet.id, name, ruleCount: rules.length }, '규칙 세트 생성 완료');
  return ruleSet;
}

export function validateField(value: any, rule: QualityRule): RuleValidationResult {
  const result: RuleValidationResult = {
    ruleId: rule.id,
    ruleName: rule.name,
    field: rule.field,
    passed: false,
    message: '',
    severity: rule.severity,
    actualValue: value,
    timestamp: new Date(),
  };

  try {
    switch (rule.condition.operator) {
      case 'equals':
        result.passed = value === rule.condition.value;
        result.expectedValue = rule.condition.value;
        result.message = result.passed ? `${rule.field} 필드가 올바릅니다` : `${rule.field} 필드는 ${rule.condition.value}이어야 합니다`;
        break;

      case 'notEquals':
        result.passed = value !== rule.condition.value;
        result.expectedValue = `!== ${rule.condition.value}`;
        result.message = result.passed ? `${rule.field} 필드가 올바릅니다` : `${rule.field} 필드는 ${rule.condition.value}이면 안 됩니다`;
        break;

      case 'contains':
        result.passed = typeof value === 'string' && value.includes(rule.condition.value);
        result.expectedValue = `contains ${rule.condition.value}`;
        result.message = result.passed ? `${rule.field} 필드에 값이 포함되어 있습니다` : `${rule.field} 필드에 ${rule.condition.value}이 포함되어 있지 않습니다`;
        break;

      case 'notContains':
        result.passed = typeof value === 'string' && !value.includes(rule.condition.value);
        result.expectedValue = `not contains ${rule.condition.value}`;
        result.message = result.passed ? `${rule.field} 필드에 값이 포함되어 있지 않습니다` : `${rule.field} 필드에 ${rule.condition.value}이 포함되어 있습니다`;
        break;

      case 'regex':
        const regex = new RegExp(rule.condition.pattern || '');
        result.passed = regex.test(String(value));
        result.expectedValue = rule.condition.pattern;
        result.message = result.passed ? `${rule.field} 필드 형식이 올바릅니다` : `${rule.field} 필드 형식이 올바르지 않습니다`;
        break;

      case 'minLength':
        result.passed = typeof value === 'string' && value.length >= (rule.condition.value || 0);
        result.expectedValue = `>= ${rule.condition.value}`;
        result.message = result.passed ? `${rule.field} 필드 길이가 적절합니다` : `${rule.field} 필드는 최소 ${rule.condition.value}자 이상이어야 합니다`;
        break;

      case 'maxLength':
        result.passed = typeof value === 'string' && value.length <= (rule.condition.value || Infinity);
        result.expectedValue = `<= ${rule.condition.value}`;
        result.message = result.passed ? `${rule.field} 필드 길이가 적절합니다` : `${rule.field} 필드는 최대 ${rule.condition.value}자 이하여야 합니다`;
        break;

      case 'min':
        result.passed = typeof value === 'number' && value >= (rule.condition.value || -Infinity);
        result.expectedValue = `>= ${rule.condition.value}`;
        result.message = result.passed ? `${rule.field} 필드 값이 적절합니다` : `${rule.field} 필드는 ${rule.condition.value} 이상이어야 합니다`;
        break;

      case 'max':
        result.passed = typeof value === 'number' && value <= (rule.condition.value || Infinity);
        result.expectedValue = `<= ${rule.condition.value}`;
        result.message = result.passed ? `${rule.field} 필드 값이 적절합니다` : `${rule.field} 필드는 ${rule.condition.value} 이하여야 합니다`;
        break;

      case 'in':
        result.passed = rule.condition.values?.includes(value) || false;
        result.expectedValue = rule.condition.values;
        result.message = result.passed ? `${rule.field} 필드 값이 유효합니다` : `${rule.field} 필드 값이 유효하지 않습니다`;
        break;

      case 'notIn':
        result.passed = !rule.condition.values?.includes(value);
        result.expectedValue = `not in ${rule.condition.values}`;
        result.message = result.passed ? `${rule.field} 필드 값이 유효합니다` : `${rule.field} 필드 값이 허용되지 않습니다`;
        break;

      default:
        result.passed = true;
        result.message = `${rule.field} 필드 검증 스킵`;
    }
  } catch (error) {
    result.passed = false;
    result.message = `검증 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`;
  }

  return result;
}

export function validateBusiness(
  business: Record<string, any>,
  ruleSetId: string
): ValidationResult {
  const ruleSet = ruleSets.find(rs => rs.id === ruleSetId);
  if (!ruleSet) {
    throw new Error(`규칙 세트를 찾을 수 없습니다: ${ruleSetId}`);
  }

  const results: RuleValidationResult[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const rule of ruleSet.rules) {
    if (!rule.enabled) {
      skippedCount++;
      continue;
    }

    const value = business[rule.field];
    const validationResult = validateField(value, rule);
    results.push(validationResult);

    if (validationResult.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }

  const totalEnabledRules = ruleSet.rules.filter(r => r.enabled).length;
  const score = totalEnabledRules > 0 ? Math.round((passedCount / totalEnabledRules) * 100) : 100;

  const validationResult: ValidationResult = {
    ruleSetId: ruleSet.id,
    ruleSetName: ruleSet.name,
    businessId: business.bizesId || business.id || 'unknown',
    totalRules: ruleSet.rules.length,
    passedRules: passedCount,
    failedRules: failedCount,
    skippedRules: skippedCount,
    score,
    results,
    validatedAt: new Date(),
  };

  validationHistory.push(validationResult);
  if (validationHistory.length > MAX_HISTORY_SIZE) {
    validationHistory.splice(0, validationHistory.length - MAX_HISTORY_SIZE);
  }

  dbLogger.debug({
    businessId: validationResult.businessId,
    ruleSetId,
    score,
    passed: passedCount,
    failed: failedCount,
  }, '비즈니스 검증 완료');

  return validationResult;
}

export function validateBusinessBatch(
  businesses: Record<string, any>[],
  ruleSetId: string
): ValidationResult[] {
  return businesses.map(business => validateBusiness(business, ruleSetId));
}

export function getRuleSets(): RuleSet[] {
  return [...ruleSets];
}

export function getRuleSet(ruleSetId: string): RuleSet | undefined {
  return ruleSets.find(rs => rs.id === ruleSetId);
}

export function updateRuleSet(
  ruleSetId: string,
  updates: Partial<Pick<RuleSet, 'name' | 'description' | 'rules' | 'enabled' | 'priority'>>
): boolean {
  const ruleSet = ruleSets.find(rs => rs.id === ruleSetId);
  if (!ruleSet) return false;

  Object.assign(ruleSet, updates, { updatedAt: new Date() });
  return true;
}

export function deleteRuleSet(ruleSetId: string): boolean {
  const index = ruleSets.findIndex(rs => rs.id === ruleSetId);
  if (index < 0) return false;

  ruleSets.splice(index, 1);
  return true;
}

export function getValidationHistory(
  businessId?: string,
  limit: number = 100
): ValidationResult[] {
  let history = [...validationHistory];
  if (businessId) {
    history = history.filter(h => h.businessId === businessId);
  }
  return history.slice(-limit);
}

export function getValidationStats(): {
  totalValidations: number;
  averageScore: number;
  passRate: number;
  topFailingRules: { ruleId: string; ruleName: string; failureCount: number }[];
} {
  const totalValidations = validationHistory.length;
  const averageScore = totalValidations > 0
    ? validationHistory.reduce((sum, v) => sum + v.score, 0) / totalValidations
    : 0;
  const passRate = totalValidations > 0
    ? validationHistory.filter(v => v.score >= 80).length / totalValidations
    : 0;

  const ruleFailureCounts: Record<string, { ruleId: string; ruleName: string; failureCount: number }> = {};
  for (const validation of validationHistory) {
    for (const result of validation.results) {
      if (!result.passed) {
        if (!ruleFailureCounts[result.ruleId]) {
          ruleFailureCounts[result.ruleId] = {
            ruleId: result.ruleId,
            ruleName: result.ruleName,
            failureCount: 0,
          };
        }
        ruleFailureCounts[result.ruleId].failureCount++;
      }
    }
  }

  const topFailingRules = Object.values(ruleFailureCounts)
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, 10);

  return {
    totalValidations,
    averageScore: Math.round(averageScore * 100) / 100,
    passRate: Math.round(passRate * 100) / 100,
    topFailingRules,
  };
}

export function generateValidationReport(result: ValidationResult): string {
  const lines = [
    '# 데이터 품질 검증 리포트',
    '',
    `## 기본 정보`,
    `- 사업체 ID: ${result.businessId}`,
    `- 규칙 세트: ${result.ruleSetName}`,
    `- 검증 시간: ${result.validatedAt.toLocaleString('ko-KR')}`,
    '',
    `## 검증 결과`,
    `- 전체 규칙: ${result.totalRules}개`,
    `- 통과: ${result.passedRules}개`,
    `- 실패: ${result.failedRules}개`,
    `- 스킵: ${result.skippedRules}개`,
    `- 점수: ${result.score}점`,
    '',
  ];

  const failedResults = result.results.filter(r => !r.passed);
  if (failedResults.length > 0) {
    lines.push('## 실패한 규칙');
    for (const fail of failedResults) {
      lines.push(`- [${fail.severity}] ${fail.ruleName}: ${fail.message}`);
      lines.push(`  - 필드: ${fail.field}`);
      lines.push(`  - 실제 값: ${fail.actualValue}`);
      if (fail.expectedValue) {
        lines.push(`  - 기대 값: ${fail.expectedValue}`);
      }
    }
  }

  return lines.join('\n');
}

export function initializeDefaultRuleSets(): RuleSet[] {
  const defaultRules: QualityRule[] = [
    createRule(
      '사업체명 필수',
      '사업체명은 반드시 입력되어야 합니다',
      'name',
      'required',
      { operator: 'minLength', value: 1 },
      'critical',
      '필수 필드',
      ['기본', '필수']
    ),
    createRule(
      '전화번호 형식',
      '전화번호는 02-1234-5678 형식이어야 합니다',
      'phone',
      'format',
      { operator: 'regex', pattern: '^0[2-9]{1,2}-[0-9]{3,4}-[0-9]{4}$' },
      'high',
      '형식 검증',
      ['전화번호', '형식']
    ),
    createRule(
      '위도 범위',
      '위도는 대한민국 범위(33-38) 내여야 합니다',
      'latitude',
      'range',
      { operator: 'min', value: 33 },
      'medium',
      '범위 검증',
      ['좌표', '위도']
    ),
    createRule(
      '경도 범위',
      '경도는 대한민국 범위(124-132) 내여야 합니다',
      'longitude',
      'range',
      { operator: 'min', value: 124 },
      'medium',
      '범위 검증',
      ['좌표', '경도']
    ),
    createRule(
      '사업자등록번호 형식',
      '사업자등록번호는 10자리 숫자여야 합니다',
      'bizesId',
      'format',
      { operator: 'regex', pattern: '^[0-9]{10}$' },
      'critical',
      '형식 검증',
      ['사업자등록번호', '형식']
    ),
  ];

  const ruleSet = createRuleSet(
    '기본 데이터 품질 규칙',
    '모든 사업체에 적용되는 기본 규칙 세트',
    defaultRules,
    0
  );

  return [ruleSet];
}
