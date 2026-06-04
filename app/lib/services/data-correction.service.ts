import { dbLogger } from '@/lib/logger';

export interface CorrectionSuggestion {
  id: string;
  businessId: string;
  field: string;
  currentValue: any;
  suggestedValue: any;
  confidence: number;
  reason: string;
  type: 'format' | 'typo' | 'missing' | 'invalid' | 'standardization';
  priority: 'high' | 'medium' | 'low';
  applied: boolean;
}

export interface CorrectionResult {
  totalBusinesses: number;
  totalSuggestions: number;
  appliedCorrections: number;
  suggestions: CorrectionSuggestion[];
  statistics: CorrectionStatistics;
  processedAt: Date;
}

export interface CorrectionStatistics {
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  byField: Record<string, number>;
  averageConfidence: number;
}

export interface CorrectionRule {
  id: string;
  name: string;
  field: string;
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  confidence: number;
  type: CorrectionSuggestion['type'];
  priority: CorrectionSuggestion['priority'];
}

const KOREAN_PHONE_AREAS: Record<string, string> = {
  '02': '서울',
  '031': '경기',
  '032': '인천',
  '033': '강원',
  '041': '충남',
  '042': '대전',
  '043': '충북',
  '051': '부산',
  '052': '울산',
  '053': '대구',
  '054': '경북',
  '055': '경남',
  '061': '전남',
  '062': '광주',
  '063': '전북',
  '064': '제주',
};

const CORRECTION_RULES: CorrectionRule[] = [
  {
    id: 'phone-format',
    name: '전화번호 형식 정규화',
    field: 'phone',
    pattern: /^(\d{2,4})(\d{3,4})(\d{4})$/,
    replacement: '$1-$2-$3',
    confidence: 0.95,
    type: 'format',
    priority: 'medium',
  },
  {
    id: 'phone-no-hyphen',
    name: '전화번호 하이픈 추가',
    field: 'phone',
    pattern: /^(\d{2,4})(\d{3,4})(\d{4})$/,
    replacement: (match: string) => {
      const digits = match.replace(/[^0-9]/g, '');
      if (digits.length === 10) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
      } else if (digits.length === 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
      }
      return match;
    },
    confidence: 0.9,
    type: 'format',
    priority: 'medium',
  },
  {
    id: 'name-trim',
    name: '사업체명 공백 제거',
    field: 'name',
    pattern: /^\s+|\s+$/g,
    replacement: '',
    confidence: 1.0,
    type: 'format',
    priority: 'low',
  },
  {
    id: 'name-double-space',
    name: '사업체명 이중 공백 제거',
    field: 'name',
    pattern: /\s{2,}/g,
    replacement: ' ',
    confidence: 1.0,
    type: 'format',
    priority: 'low',
  },
  {
    id: 'address-standardize',
    name: '주소 표준화',
    field: 'roadNameAddress',
    pattern: /시\s*구\s*동/g,
    replacement: (match: string) => match.replace(/\s+/g, ' '),
    confidence: 0.85,
    type: 'standardization',
    priority: 'medium',
  },
  {
    id: 'business-code-format',
    name: '업종코드 형식 정규화',
    field: 'businessCode',
    pattern: /^[a-z]\d{4,5}$/,
    replacement: (match: string) => match.toUpperCase(),
    confidence: 0.95,
    type: 'format',
    priority: 'medium',
  },
];

const correctionHistory: CorrectionSuggestion[] = [];

export function analyzeFieldForCorrections(
  businesses: Record<string, any>[],
  field: string
): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = [];

  for (const business of businesses) {
    const value = business[field];
    if (value === null || value === undefined) continue;

    const fieldSuggestions = generateSuggestionsForField(business, field, value);
    suggestions.push(...fieldSuggestions);
  }

  return suggestions;
}

function generateSuggestionsForField(
  business: Record<string, any>,
  field: string,
  value: any
): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = [];
  const businessId = business.bizesId || business.id || 'unknown';

  if (field === 'phone' && typeof value === 'string') {
    const phoneSuggestions = analyzePhone(value, businessId);
    suggestions.push(...phoneSuggestions);
  }

  if (field === 'name' && typeof value === 'string') {
    const nameSuggestions = analyzeName(value, businessId);
    suggestions.push(...nameSuggestions);
  }

  if (field === 'roadNameAddress' && typeof value === 'string') {
    const addressSuggestions = analyzeAddress(value, businessId);
    suggestions.push(...addressSuggestions);
  }

  if (field === 'businessCode' && typeof value === 'string') {
    const codeSuggestions = analyzeBusinessCode(value, businessId);
    suggestions.push(...codeSuggestions);
  }

  if (field === 'latitude' || field === 'longitude') {
    const coordSuggestions = analyzeCoordinate(field, value, businessId);
    suggestions.push(...coordSuggestions);
  }

  return suggestions;
}

function analyzePhone(phone: string, businessId: string): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = [];
  const cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.length === 10 || cleaned.length === 11) {
    const formatted = cleaned.length === 10
      ? `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
      : `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;

    if (phone !== formatted) {
      suggestions.push({
        id: `corr-${Date.now()}-${businessId}-phone-format`,
        businessId,
        field: 'phone',
        currentValue: phone,
        suggestedValue: formatted,
        confidence: 0.95,
        reason: '전화번호 형식을 표준 형식으로 정규화합니다',
        type: 'format',
        priority: 'medium',
        applied: false,
      });
    }
  }

  const areaCode = cleaned.slice(0, 2);
  if (KOREAN_PHONE_AREAS[areaCode]) {
    const areaName = KOREAN_PHONE_AREAS[areaCode];
    if (!phone.includes(areaName)) {
      suggestions.push({
        id: `corr-${Date.now()}-${businessId}-phone-area`,
        businessId,
        field: 'phone',
        currentValue: phone,
        suggestedValue: phone,
        confidence: 0.7,
        reason: `지역번호 ${areaCode}는 ${areaName} 지역입니다`,
        type: 'info',
        priority: 'low',
        applied: false,
      });
    }
  }

  return suggestions;
}

function analyzeName(name: string, businessId: string): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = [];

  if (name !== name.trim()) {
    suggestions.push({
      id: `corr-${Date.now()}-${businessId}-name-trim`,
      businessId,
      field: 'name',
      currentValue: name,
      suggestedValue: name.trim(),
      confidence: 1.0,
      reason: '사업체명 앞뒤 공백을 제거합니다',
      type: 'format',
      priority: 'low',
      applied: false,
    });
  }

  if (/\s{2,}/.test(name)) {
    suggestions.push({
      id: `corr-${Date.now()}-${businessId}-name-space`,
      businessId,
      field: 'name',
      currentValue: name,
      suggestedValue: name.replace(/\s{2,}/g, ' '),
      confidence: 1.0,
      reason: '이중 공백을 단일 공백으로 변경합니다',
      type: 'format',
      priority: 'low',
      applied: false,
    });
  }

  if (name.length < 2) {
    suggestions.push({
      id: `corr-${Date.now()}-${businessId}-name-short`,
      businessId,
      field: 'name',
      currentValue: name,
      suggestedValue: name,
      confidence: 0.6,
      reason: '사업체명이 너무 짧습니다. 확인이 필요합니다',
      type: 'invalid',
      priority: 'high',
      applied: false,
    });
  }

  return suggestions;
}

function analyzeAddress(address: string, businessId: string): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = [];

  if (/\s{2,}/.test(address)) {
    suggestions.push({
      id: `corr-${Date.now()}-${businessId}-addr-space`,
      businessId,
      field: 'roadNameAddress',
      currentValue: address,
      suggestedValue: address.replace(/\s{2,}/g, ' '),
      confidence: 0.9,
      reason: '주소 내 이중 공백을 제거합니다',
      type: 'format',
      priority: 'low',
      applied: false,
    });
  }

  if (address.includes('시') && !address.includes('도') && !address.includes('군')) {
    if (!/^.{2,5}시/.test(address)) {
      suggestions.push({
        id: `corr-${Date.now()}-${businessId}-addr-format`,
        businessId,
        field: 'roadNameAddress',
        currentValue: address,
        suggestedValue: address,
        confidence: 0.6,
        reason: '주소 형식이 비표준입니다. 확인이 필요합니다',
        type: 'invalid',
        priority: 'medium',
        applied: false,
      });
    }
  }

  return suggestions;
}

function analyzeBusinessCode(code: string, businessId: string): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = [];

  if (code !== code.toUpperCase()) {
    suggestions.push({
      id: `corr-${Date.now()}-${businessId}-code-upper`,
      businessId,
      field: 'businessCode',
      currentValue: code,
      suggestedValue: code.toUpperCase(),
      confidence: 0.95,
      reason: '업종코드를 대문자로 정규화합니다',
      type: 'format',
      priority: 'medium',
      applied: false,
    });
  }

  if (!/^[A-Z]\d{4,5}$/.test(code)) {
    suggestions.push({
      id: `corr-${Date.now()}-${businessId}-code-format`,
      businessId,
      field: 'businessCode',
      currentValue: code,
      suggestedValue: code,
      confidence: 0.7,
      reason: '업종코드 형식이 올바르지 않습니다',
      type: 'invalid',
      priority: 'high',
      applied: false,
    });
  }

  return suggestions;
}

function analyzeCoordinate(
  field: 'latitude' | 'longitude',
  value: number,
  businessId: string
): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = [];

  if (field === 'latitude' && (value < 33 || value > 39)) {
    suggestions.push({
      id: `corr-${Date.now()}-${businessId}-coord-lat`,
      businessId,
      field,
      currentValue: value,
      suggestedValue: value,
      confidence: 0.9,
      reason: '위도가 대한민국 범위(33-39)를 벗어났습니다',
      type: 'invalid',
      priority: 'critical',
      applied: false,
    });
  }

  if (field === 'longitude' && (value < 124 || value > 132)) {
    suggestions.push({
      id: `corr-${Date.now()}-${businessId}-coord-lng`,
      businessId,
      field,
      currentValue: value,
      suggestedValue: value,
      confidence: 0.9,
      reason: '경도가 대한민국 범위(124-132)를 벗어났습니다',
      type: 'invalid',
      priority: 'critical',
      applied: false,
    });
  }

  return suggestions;
}

export function applyCorrection(
  business: Record<string, any>,
  suggestion: CorrectionSuggestion
): Record<string, any> {
  if (suggestion.applied) return business;

  const updated = { ...business };

  if (suggestion.type !== 'info') {
    updated[suggestion.field] = suggestion.suggestedValue;
  }

  suggestion.applied = true;
  correctionHistory.push(suggestion);

  return updated;
}

export function applyCorrections(
  businesses: Record<string, any>[],
  suggestions: CorrectionSuggestion[],
  options: {
    autoApplyHighConfidence?: boolean;
    minConfidence?: number;
    dryRun?: boolean;
  } = {}
): CorrectionResult {
  const {
    autoApplyHighConfidence = true,
    minConfidence = 0.8,
    dryRun = false,
  } = options;

  let appliedCount = 0;
  const appliedSuggestions: CorrectionSuggestion[] = [];

  const applicableSuggestions = suggestions.filter(
    s => s.confidence >= minConfidence && s.type !== 'info'
  );

  for (const suggestion of applicableSuggestions) {
    const business = businesses.find(
      b => (b.bizesId || b.id) === suggestion.businessId
    );

    if (!business) continue;

    if (autoApplyHighConfidence && suggestion.confidence >= 0.9) {
      if (!dryRun) {
        applyCorrection(business, suggestion);
      }
      appliedCount++;
      appliedSuggestions.push(suggestion);
    }
  }

  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byField: Record<string, number> = {};

  for (const suggestion of suggestions) {
    byType[suggestion.type] = (byType[suggestion.type] || 0) + 1;
    byPriority[suggestion.priority] = (byPriority[suggestion.priority] || 0) + 1;
    byField[suggestion.field] = (byField[suggestion.field] || 0) + 1;
  }

  const avgConfidence = suggestions.length > 0
    ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
    : 0;

  return {
    totalBusinesses: businesses.length,
    totalSuggestions: suggestions.length,
    appliedCorrections: appliedCount,
    suggestions,
    statistics: {
      byType,
      byPriority,
      byField,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
    },
    processedAt: new Date(),
  };
}

export function getCorrectionHistory(
  businessId?: string,
  limit: number = 100
): CorrectionSuggestion[] {
  let history = [...correctionHistory];
  if (businessId) {
    history = history.filter(h => h.businessId === businessId);
  }
  return history.slice(-limit);
}

export function generateCorrectionReport(result: CorrectionResult): string {
  const lines = [
    '# 데이터 보정 리포트',
    '',
    '## 요약',
    `- 전체 사업체: ${result.totalBusinesses}건`,
    `- 보정 제안: ${result.totalSuggestions}건`,
    `- 적용된 보정: ${result.appliedCorrections}건`,
    `- 처리 시간: ${result.processedAt.toLocaleString('ko-KR')}`,
    '',
    '## 유형별 통계',
  ];

  for (const [type, count] of Object.entries(result.statistics.byType)) {
    lines.push(`- ${type}: ${count}건`);
  }

  lines.push('', '## 우선순위별 통계');
  for (const [priority, count] of Object.entries(result.statistics.byPriority)) {
    lines.push(`- ${priority}: ${count}건`);
  }

  lines.push('', '## 필드별 통계');
  for (const [field, count] of Object.entries(result.statistics.byField)) {
    lines.push(`- ${field}: ${count}건`);
  }

  if (result.suggestions.length > 0) {
    lines.push('', '## 주요 보정 제안');
    for (const suggestion of result.suggestions.slice(0, 10)) {
      lines.push(`- ${suggestion.businessId}: ${suggestion.reason} (신뢰도: ${suggestion.confidence})`);
    }
  }

  return lines.join('\n');
}
