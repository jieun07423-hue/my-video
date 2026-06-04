import { dbLogger } from '@/lib/logger';

export interface QualityCheckConfig {
  enabled: boolean;
  blockingMode: boolean;
  timeout: number;
  retryCount: number;
  notifyOnFailure: boolean;
}

export interface QualityCheckResult {
  id: string;
  businessId: string;
  checkType: 'sync' | 'async' | 'batch';
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  checks: QualityCheckItem[];
  overallScore: number;
  startedAt: Date;
  completedAt: Date;
  duration: number;
}

export interface QualityCheckItem {
  checkId: string;
  name: string;
  category: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  duration: number;
  details?: Record<string, any>;
}

export interface QualityCheckRule {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  priority: number;
  check: (business: Record<string, any>) => QualityCheckItem;
}

const defaultConfig: QualityCheckConfig = {
  enabled: true,
  blockingMode: false,
  timeout: 5000,
  retryCount: 3,
  notifyOnFailure: true,
};

const checkHistory: QualityCheckResult[] = [];
const MAX_HISTORY_SIZE = 50000;

const qualityCheckRules: QualityCheckRule[] = [
  {
    id: 'check-required-fields',
    name: '필수 필드 검증',
    category: '필수 필드',
    enabled: true,
    priority: 1,
    check: (business) => {
      const requiredFields = ['name', 'bizesId'];
      const missingFields = requiredFields.filter(field => !business[field]);

      return {
        checkId: 'required-fields',
        name: '필수 필드 검증',
        category: '필수 필드',
        status: missingFields.length === 0 ? 'passed' : 'failed',
        message: missingFields.length === 0
          ? '모든 필수 필드가 입력되어 있습니다'
          : `누락된 필수 필드: ${missingFields.join(', ')}`,
        severity: 'critical',
        duration: 0,
        details: { missingFields },
      };
    },
  },
  {
    id: 'check-phone-format',
    name: '전화번호 형식 검증',
    category: '형식 검증',
    enabled: true,
    priority: 2,
    check: (business) => {
      const phoneRegex = /^0[2-9]{1,2}-[0-9]{3,4}-[0-9]{4}$/;
      const isValid = !business.phone || phoneRegex.test(business.phone);

      return {
        checkId: 'phone-format',
        name: '전화번호 형식 검증',
        category: '형식 검증',
        status: isValid ? 'passed' : 'failed',
        message: isValid ? '전화번호 형식이 올바릅니다' : '전화번호 형식이 올바르지 않습니다',
        severity: 'high',
        duration: 0,
        details: { phone: business.phone, isValid },
      };
    },
  },
  {
    id: 'check-coordinates',
    name: '좌표 범위 검증',
    category: '범위 검증',
    enabled: true,
    priority: 3,
    check: (business) => {
      const lat = business.latitude;
      const lng = business.longitude;
      const latValid = !lat || (lat >= 33 && lat <= 38);
      const lngValid = !lng || (lng >= 124 && lng <= 132);
      const isValid = latValid && lngValid;

      return {
        checkId: 'coordinates-range',
        name: '좌표 범위 검증',
        category: '범위 검증',
        status: isValid ? 'passed' : 'failed',
        message: isValid ? '좌표가 대한민국 범위 내에 있습니다' : '좌표가 대한민국 범위를 벗어났습니다',
        severity: 'medium',
        duration: 0,
        details: { latitude: lat, longitude: lng, latValid, lngValid },
      };
    },
  },
  {
    id: 'check-business-id',
    name: '사업자등록번호 검증',
    category: '형식 검증',
    enabled: true,
    priority: 4,
    check: (business) => {
      const bizesIdRegex = /^[0-9]{10}$/;
      const isValid = !business.bizesId || bizesIdRegex.test(business.bizesId);

      return {
        checkId: 'business-id-format',
        name: '사업자등록번호 검증',
        category: '형식 검증',
        status: isValid ? 'passed' : 'failed',
        message: isValid ? '사업자등록번호 형식이 올바릅니다' : '사업자등록번호는 10자리 숫자여야 합니다',
        severity: 'critical',
        duration: 0,
        details: { bizesId: business.bizesId, isValid },
      };
    },
  },
  {
    id: 'check-address',
    name: '주소 검증',
    category: '필수 필드',
    enabled: true,
    priority: 5,
    check: (business) => {
      const hasAddress = business.roadNameAddress || business.lotNumberAddress;

      return {
        checkId: 'address-present',
        name: '주소 검증',
        category: '필수 필드',
        status: hasAddress ? 'passed' : 'warning',
        message: hasAddress ? '주소가 입력되어 있습니다' : '주소가 입력되어 있지 않습니다',
        severity: 'medium',
        duration: 0,
        details: { roadNameAddress: business.roadNameAddress, lotNumberAddress: business.lotNumberAddress },
      };
    },
  },
  {
    id: 'check-industry-code',
    name: '업종 코드 검증',
    category: '형식 검증',
    enabled: true,
    priority: 6,
    check: (business) => {
      const hasCode = business.businessCode || business.indsLclsNm;

      return {
        checkId: 'industry-code',
        name: '업종 코드 검증',
        category: '형식 검증',
        status: hasCode ? 'passed' : 'warning',
        message: hasCode ? '업종 코드가 입력되어 있습니다' : '업종 코드가 입력되어 있지 않습니다',
        severity: 'low',
        duration: 0,
        details: { businessCode: business.businessCode, indsLclsNm: business.indsLclsNm },
      };
    },
  },
];

export function setQualityCheckConfig(config: Partial<QualityCheckConfig>): void {
  Object.assign(defaultConfig, config);
  dbLogger.debug({ config: defaultConfig }, '품질 검증 설정 업데이트');
}

export function getQualityCheckConfig(): QualityCheckConfig {
  return { ...defaultConfig };
}

export function addQualityCheckRule(rule: QualityCheckRule): void {
  qualityCheckRules.push(rule);
  dbLogger.debug({ ruleId: rule.id, name: rule.name }, '품질 검증 규칙 추가');
}

export function removeQualityCheckRule(ruleId: string): boolean {
  const index = qualityCheckRules.findIndex(r => r.id === ruleId);
  if (index < 0) return false;

  qualityCheckRules.splice(index, 1);
  return true;
}

export function getQualityCheckRules(): QualityCheckRule[] {
  return [...qualityCheckRules];
}

export function runQualityCheck(
  business: Record<string, any>,
  checkType: 'sync' | 'async' | 'batch' = 'sync'
): QualityCheckResult {
  const startTime = Date.now();
  const checks: QualityCheckItem[] = [];

  const enabledRules = qualityCheckRules
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of enabledRules) {
    const checkStart = Date.now();
    try {
      const result = rule.check(business);
      result.duration = Date.now() - checkStart;
      checks.push(result);
    } catch (error) {
      checks.push({
        checkId: rule.id,
        name: rule.name,
        category: rule.category,
        status: 'failed',
        message: `검증 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'high',
        duration: Date.now() - checkStart,
      });
    }
  }

  const passedChecks = checks.filter(c => c.status === 'passed').length;
  const totalChecks = checks.length;
  const overallScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  let overallStatus: QualityCheckResult['status'] = 'passed';
  if (checks.some(c => c.status === 'failed' && c.severity === 'critical')) {
    overallStatus = 'failed';
  } else if (checks.some(c => c.status === 'failed')) {
    overallStatus = 'failed';
  } else if (checks.some(c => c.status === 'warning')) {
    overallStatus = 'warning';
  }

  const result: QualityCheckResult = {
    id: `qc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    businessId: business.bizesId || business.id || 'unknown',
    checkType,
    status: overallStatus,
    checks,
    overallScore,
    startedAt: new Date(startTime),
    completedAt: new Date(),
    duration: Date.now() - startTime,
  };

  checkHistory.push(result);
  if (checkHistory.length > MAX_HISTORY_SIZE) {
    checkHistory.splice(0, checkHistory.length - MAX_HISTORY_SIZE);
  }

  dbLogger.debug({
    businessId: result.businessId,
    status: result.status,
    score: result.overallScore,
    duration: result.duration,
  }, '품질 검증 완료');

  return result;
}

export function runQualityCheckBatch(
  businesses: Record<string, any>[],
  checkType: 'sync' | 'async' | 'batch' = 'batch'
): QualityCheckResult[] {
  return businesses.map(business => runQualityCheck(business, checkType));
}

export function getCheckHistory(
  businessId?: string,
  limit: number = 100
): QualityCheckResult[] {
  let history = [...checkHistory];
  if (businessId) {
    history = history.filter(h => h.businessId === businessId);
  }
  return history.slice(-limit);
}

export function getCheckStats(): {
  totalChecks: number;
  averageScore: number;
  passRate: number;
  averageDuration: number;
  statusDistribution: Record<string, number>;
} {
  const totalChecks = checkHistory.length;
  const averageScore = totalChecks > 0
    ? checkHistory.reduce((sum, c) => sum + c.overallScore, 0) / totalChecks
    : 0;
  const passRate = totalChecks > 0
    ? checkHistory.filter(c => c.status === 'passed').length / totalChecks
    : 0;
  const averageDuration = totalChecks > 0
    ? checkHistory.reduce((sum, c) => sum + c.duration, 0) / totalChecks
    : 0;

  const statusDistribution: Record<string, number> = {};
  for (const check of checkHistory) {
    statusDistribution[check.status] = (statusDistribution[check.status] || 0) + 1;
  }

  return {
    totalChecks,
    averageScore: Math.round(averageScore * 100) / 100,
    passRate: Math.round(passRate * 100) / 100,
    averageDuration: Math.round(averageDuration),
    statusDistribution,
  };
}

export function generateCheckReport(result: QualityCheckResult): string {
  const lines = [
    '# 실시간 품질 검증 리포트',
    '',
    `## 기본 정보`,
    `- 사업체 ID: ${result.businessId}`,
    `- 검증 유형: ${result.checkType}`,
    `- 검증 시간: ${result.startedAt.toLocaleString('ko-KR')}`,
    `- 소요 시간: ${result.duration}ms`,
    '',
    `## 검증 결과`,
    `- 상태: ${result.status}`,
    `- 점수: ${result.overallScore}점`,
    `- 전체 검사: ${result.checks.length}개`,
    `- 통과: ${result.checks.filter(c => c.status === 'passed').length}개`,
    `- 실패: ${result.checks.filter(c => c.status === 'failed').length}개`,
    `- 경고: ${result.checks.filter(c => c.status === 'warning').length}개`,
    '',
  ];

  const failedChecks = result.checks.filter(c => c.status === 'failed');
  if (failedChecks.length > 0) {
    lines.push('## 실패한 검사');
    for (const check of failedChecks) {
      lines.push(`- [${check.severity}] ${check.name}: ${check.message}`);
    }
  }

  const warningChecks = result.checks.filter(c => c.status === 'warning');
  if (warningChecks.length > 0) {
    lines.push('', '## 경고');
    for (const check of warningChecks) {
      lines.push(`- [${check.severity}] ${check.name}: ${check.message}`);
    }
  }

  return lines.join('\n');
}
