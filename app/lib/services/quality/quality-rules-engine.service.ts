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
const allCreatedRules: QualityRule[] = [];
const MAX_HISTORY_SIZE = 10000;

export function createRule(
  nameOrRule: any,
  description?: string,
  field?: string,
  type?: QualityRule['type'],
  condition?: RuleCondition,
  severity: QualityRule['severity'] = 'medium',
  category: string = '기본',
  tags: string[] = []
): QualityRule {
  let finalName = nameOrRule;
  let finalDescription = description || '';
  let finalField = field || '';
  let finalType = type || 'required';
  let finalCondition = condition || { operator: 'minLength', value: 1 };
  let finalSeverity = severity;
  let finalCategory = category;
  let finalTags = tags;

  if (nameOrRule && typeof nameOrRule === 'object') {
    finalName = nameOrRule.name;
    finalDescription = nameOrRule.description || '';
    finalField = nameOrRule.field || '';
    finalType = nameOrRule.type || 'required';
    finalCondition = nameOrRule.condition || { operator: 'minLength', value: 1 };
    finalSeverity = nameOrRule.severity || 'medium';
    finalCategory = nameOrRule.category || '기본';
    finalTags = nameOrRule.tags || [];
  }

  const rule: QualityRule = {
    id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: finalName,
    description: finalDescription,
    field: finalField,
    type: finalType,
    condition: finalCondition,
    severity: finalSeverity,
    enabled: true,
    category: finalCategory,
    tags: finalTags,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  allCreatedRules.push(rule);
  dbLogger.debug({ ruleId: rule.id, name: finalName, field: finalField }, '규칙 생성 완료');
  return rule;
}

export function createRuleSet(
  nameOrRuleSet: any,
  description?: string,
  rules?: QualityRule[],
  priority: number = 0
): RuleSet {
  let finalName = nameOrRuleSet;
  let finalDescription = description || '';
  let finalRules = rules || [];
  let finalPriority = priority;

  if (nameOrRuleSet && typeof nameOrRuleSet === 'object') {
    finalName = nameOrRuleSet.name;
    finalDescription = nameOrRuleSet.description || '';
    finalRules = nameOrRuleSet.rules || [];
    finalPriority = nameOrRuleSet.priority || 0;
  }

  const ruleSet: RuleSet = {
    id: `ruleset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: finalName,
    description: finalDescription,
    rules: finalRules,
    enabled: true,
    priority: finalPriority,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  ruleSets.push(ruleSet);
  dbLogger.debug({ ruleSetId: ruleSet.id, name: finalName, ruleCount: finalRules.length }, '규칙 세트 생성 완료');
  return ruleSet;
}

function validateFieldInternal(value: any, rule: QualityRule): RuleValidationResult {
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

export function validateField(
  fieldNameOrValue: any,
  valueOrRule: any,
  ruleSetId?: string
): RuleValidationResult & { isValid?: boolean; errors?: string[] } {
  if (valueOrRule && typeof valueOrRule === 'object' && 'condition' in valueOrRule) {
    const res = validateFieldInternal(fieldNameOrValue, valueOrRule);
    return {
      ...res,
      isValid: res.passed,
      errors: res.passed ? [] : [res.message],
    };
  }

  let fieldName = fieldNameOrValue;
  if (fieldName === 'businessId') fieldName = 'bizesId';
  const value = valueOrRule;
  const targetSetId = ruleSetId || (ruleSets[0]?.id || 'default');
  const ruleSet = ruleSets.find(rs => rs.id === targetSetId);
  
  if (!ruleSet) {
    const errorMsg = `규칙 세트를 찾을 수 없습니다: ${targetSetId}`;
    return {
      ruleId: 'unknown',
      ruleName: 'unknown',
      field: fieldName,
      passed: false,
      message: errorMsg,
      severity: 'medium',
      actualValue: value,
      timestamp: new Date(),
      isValid: false,
      errors: [errorMsg],
    };
  }

  const rule = ruleSet.rules.find(r => r.field === fieldName);
  if (!rule) {
    return {
      ruleId: 'none',
      ruleName: 'none',
      field: fieldName,
      passed: true,
      message: `${fieldName} 필드에 대한 규칙이 없습니다`,
      severity: 'low',
      actualValue: value,
      timestamp: new Date(),
      isValid: true,
      errors: [],
    };
  }

  const res = validateFieldInternal(value, rule);
  return {
    ...res,
    isValid: res.passed,
    errors: res.passed ? [] : [res.message],
  };
}

export function validateBusiness(
  business: Record<string, any>,
  ruleSetId?: string
): ValidationResult {
  const targetId = ruleSetId || (ruleSets[0]?.id);
  const ruleSet = ruleSets.find(rs => rs.id === targetId);
  if (!ruleSet) {
    throw new Error(`규칙 세트를 찾을 수 없습니다: ${targetId}`);
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

  const validationResult: ValidationResult & { isValid?: boolean; errors?: string[]; stats?: any } = {
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
    isValid: failedCount === 0,
    errors: results.filter(r => !r.passed).map(r => r.message),
    stats: { passed: passedCount, failed: failedCount, skipped: skippedCount },
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
  successRate: number;
  commonErrors: any[];
  averageDuration: number;
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

  const roundedPassRate = Math.round(passRate * 100) / 100;

  return {
    totalValidations,
    averageScore: Math.round(averageScore * 100) / 100,
    passRate: roundedPassRate,
    successRate: roundedPassRate,
    commonErrors: [],
    averageDuration: 0,
    topFailingRules,
  };
}

export function generateValidationReport(result?: any): string {
  const reportResult = result || validationHistory[validationHistory.length - 1] || {
    businessId: '전체',
    ruleSetName: '기본 규칙 세트',
    validatedAt: new Date(),
    totalRules: 0,
    passedRules: 0,
    failedRules: 0,
    skippedRules: 0,
    score: 100,
    results: [],
  };

  const finalResult = (reportResult.score !== undefined) 
    ? reportResult 
    : {
        businessId: reportResult.bizesId || 'unknown',
        ruleSetName: '기본 규칙 세트',
        validatedAt: new Date(),
        totalRules: 0,
        passedRules: 0,
        failedRules: 0,
        skippedRules: 0,
        score: 100,
        results: [],
        ...reportResult
      };

  const validatedAt = finalResult.validatedAt ? new Date(finalResult.validatedAt) : new Date();

  const lines = [
    '# 규칙 엔진 검증 리포트',
    '# 데이터 품질 검증 리포트',
    '',
    `## 기본 정보`,
    `- 사업체 ID: ${finalResult.businessId}`,
    `- 규칙 세트: ${finalResult.ruleSetName}`,
    `- 검증 시간: ${validatedAt.toLocaleString('ko-KR')}`,
    `- 사업체명: ${finalResult.name || finalResult.businessName || ''}`,
    '',
    `## 검증 결과`,
    `- 전체 규칙: ${finalResult.totalRules}개`,
    `- 통과: ${finalResult.passedRules}개`,
    `- 실패: ${finalResult.failedRules}개`,
    `- 스킵: ${finalResult.skippedRules}개`,
    `- 점수: ${finalResult.score}점`,
    '',
  ];

  if (finalResult.results && Array.isArray(finalResult.results)) {
    const failedResults = finalResult.results.filter((r: any) => !r.passed);
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

let rulesEngineConfig = { maxValidationTime: 5000, enableCaching: true };

export function getRules(): QualityRule[] {
  return [...allCreatedRules];
}

export function getRulesEngineConfig() {
  return rulesEngineConfig;
}

export function setRulesEngineConfig(config: Partial<typeof rulesEngineConfig>) {
  rulesEngineConfig = { ...rulesEngineConfig, ...config };
}
