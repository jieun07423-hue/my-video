import { dbLogger } from '@/lib/logger';

export interface DuplicateCandidate {
  originalId: string;
  duplicateId: string;
  similarityScore: number;
  matchType: 'exact' | 'high' | 'medium' | 'low';
  matchingFields: string[];
  originalName: string;
  duplicateName: string;
  confidence: number;
  reasons: DuplicateReason[];
}

export interface DuplicateReason {
  field: string;
  similarity: number;
  weight: number;
  contribution: number;
}

export interface DuplicateDetectionResult {
  totalCompared: number;
  duplicatesFound: number;
  exactMatches: number;
  highSimilarity: number;
  mediumSimilarity: number;
  lowSimilarity: number;
  candidates: DuplicateCandidate[];
  detectedAt: Date;
  performance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  totalTimeMs: number;
  comparisonsPerSecond: number;
  memoryUsageMb: number;
}

interface PhoneticMap {
  [key: string]: string[];
}

const KOREAN_PHONETIC_MAP: PhoneticMap = {
  'ㄱ': ['ㄱ', 'ㅋ'],
  'ㄴ': ['ㄴ'],
  'ㄷ': ['ㄷ', 'ㅌ'],
  'ㄹ': ['ㄹ'],
  'ㅁ': ['ㅁ'],
  'ㅂ': ['ㅂ', 'ㅍ'],
  'ㅅ': ['ㅅ', 'ㅆ'],
  'ㅇ': ['ㅇ'],
  'ㅈ': ['ㅈ', 'ㅊ'],
  'ㅎ': ['ㅎ'],
  'ㅏ': ['ㅏ', 'ㅐ'],
  'ㅑ': ['ㅑ', 'ㅒ'],
  'ㅓ': ['ㅓ', 'ㅔ'],
  'ㅕ': ['ㅕ', 'ㅖ'],
  'ㅗ': ['ㅗ', 'ㅛ'],
  'ㅜ': ['ㅜ', 'ㅠ'],
  'ㅡ': ['ㅡ', 'ㅟ'],
  'ㅣ': ['ㅣ'],
};

const NAME_SIMILARITY_WEIGHTS = {
  exact: 1.0,
  phonetic: 0.9,
  partial: 0.8,
  editDistance: 0.7,
};

const ADDRESS_SIMILARITY_WEIGHTS = {
  exact: 1.0,
  normalized: 0.95,
  partial: 0.8,
  token: 0.7,
};

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）\[\]【】]/g, '')
    .replace(/[^\w가-힣]/g, '');
}

function toPhonetic(text: string): string {
  return text
    .split('')
    .map(char => {
      for (const [key, values] of Object.entries(KOREAN_PHONETIC_MAP)) {
        if (values.includes(char)) {
          return key;
        }
      }
      return char;
    })
    .join('');
}

function calculateNameSimilarity(name1: string, name2: string): {
  score: number;
  method: string;
} {
  const norm1 = normalizeText(name1);
  const norm2 = normalizeText(name2);

  if (norm1 === norm2) {
    return { score: NAME_SIMILARITY_WEIGHTS.exact, method: 'exact' };
  }

  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    const longer = norm1.length < norm2.length ? norm2 : norm1;
    return {
      score: (shorter.length / longer.length) * NAME_SIMILARITY_WEIGHTS.partial,
      method: 'partial',
    };
  }

  const phonetic1 = toPhonetic(norm1);
  const phonetic2 = toPhonetic(norm2);
  if (phonetic1 === phonetic2) {
    return { score: NAME_SIMILARITY_WEIGHTS.phonetic, method: 'phonetic' };
  }

  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) {
    return { score: 1.0, method: 'empty' };
  }

  const distance = levenshteinDistance(norm1, norm2);
  const editScore = 1 - distance / maxLen;

  return {
    score: editScore * NAME_SIMILARITY_WEIGHTS.editDistance,
    method: 'editDistance',
  };
}

function calculateAddressSimilarity(addr1: string, addr2: string): {
  score: number;
  method: string;
} {
  const norm1 = normalizeText(addr1);
  const norm2 = normalizeText(addr2);

  if (norm1 === norm2) {
    return { score: ADDRESS_SIMILARITY_WEIGHTS.exact, method: 'exact' };
  }

  const normalized1 = norm1.replace(/[시군구동읍면리가로길]/g, '');
  const normalized2 = norm2.replace(/[시군구동읍면리가로길]/g, '');
  if (normalized1 === normalized2) {
    return { score: ADDRESS_SIMILARITY_WEIGHTS.normalized, method: 'normalized' };
  }

  const addr1Parts = norm1.split(/[,.\s]+/).filter(p => p.length > 0);
  const addr2Parts = norm2.split(/[,.\s]+/).filter(p => p.length > 0);

  let matchCount = 0;
  const totalParts = Math.max(addr1Parts.length, addr2Parts.length);

  for (const part1 of addr1Parts) {
    for (const part2 of addr2Parts) {
      if (part1 === part2 || part1.includes(part2) || part2.includes(part1)) {
        matchCount++;
        break;
      }
    }
  }

  if (totalParts > 0) {
    const tokenScore = matchCount / totalParts;
    return {
      score: tokenScore * ADDRESS_SIMILARITY_WEIGHTS.token,
      method: 'token',
    };
  }

  return { score: 0, method: 'none' };
}

function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

function calculatePhoneSimilarity(phone1: string, phone2: string): {
  score: number;
  isFuzzy: boolean;
} {
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);

  if (normalized1 === normalized2) {
    return { score: 1.0, isFuzzy: false };
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  if (distance <= 1) {
    return { score: 0.9, isFuzzy: true };
  }

  if (distance <= 2) {
    return { score: 0.7, isFuzzy: true };
  }

  return { score: 0, isFuzzy: false };
}

export function detectDuplicates(
  businesses: Record<string, any>[],
  options: {
    nameThreshold?: number;
    addressThreshold?: number;
    overallThreshold?: number;
    maxResults?: number;
    usePhonetic?: boolean;
    useFuzzyPhone?: boolean;
    earlyTermination?: boolean;
  } = {}
): DuplicateDetectionResult {
  const startTime = Date.now();
  const {
    nameThreshold = 0.8,
    addressThreshold = 0.7,
    overallThreshold = 0.75,
    maxResults = 100,
    usePhonetic = true,
    useFuzzyPhone = true,
    earlyTermination = true,
  } = options;

  const candidates: DuplicateCandidate[] = [];
  let comparisons = 0;

  const sortedBusinesses = [...businesses].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB, 'ko');
  });

  for (let i = 0; i < sortedBusinesses.length; i++) {
    const b1 = sortedBusinesses[i];

    for (let j = i + 1; j < sortedBusinesses.length; j++) {
      const b2 = sortedBusinesses[j];

      if (b1.bizesId === b2.bizesId) continue;

      const name1 = normalizeText(b1.name || '');
      const name2 = normalizeText(b2.name || '');
      if (name1 && name2 && name1[0] !== name2[0]) {
        if (earlyTermination) continue;
      }

      comparisons++;

      const matchingFields: string[] = [];
      const reasons: DuplicateReason[] = [];
      let totalSimilarity = 0;
      let totalWeight = 0;

      if (b1.name && b2.name) {
        const nameResult = calculateNameSimilarity(b1.name, b2.name);
        const nameWeight = 0.4;
        totalSimilarity += nameResult.score * nameWeight;
        totalWeight += nameWeight;
        if (nameResult.score >= nameThreshold) {
          matchingFields.push('name');
        }
        reasons.push({
          field: 'name',
          similarity: Math.round(nameResult.score * 100),
          weight: nameWeight,
          contribution: Math.round(nameResult.score * nameWeight * 100),
        });
      }

      const addr1 = b1.roadNameAddress || b1.lotNumberAddress || '';
      const addr2 = b2.roadNameAddress || b2.lotNumberAddress || '';

      if (addr1 && addr2) {
        const addrResult = calculateAddressSimilarity(addr1, addr2);
        const addrWeight = 0.3;
        totalSimilarity += addrResult.score * addrWeight;
        totalWeight += addrWeight;
        if (addrResult.score >= addressThreshold) {
          matchingFields.push('address');
        }
        reasons.push({
          field: 'address',
          similarity: Math.round(addrResult.score * 100),
          weight: addrWeight,
          contribution: Math.round(addrResult.score * addrWeight * 100),
        });
      }

      if (b1.phone && b2.phone) {
        const phoneResult = calculatePhoneSimilarity(b1.phone, b2.phone);
        const phoneWeight = 0.2;
        totalSimilarity += phoneResult.score * phoneWeight;
        totalWeight += phoneWeight;
        if (phoneResult.score >= 0.9) {
          matchingFields.push('phone');
        }
        reasons.push({
          field: 'phone',
          similarity: Math.round(phoneResult.score * 100),
          weight: phoneWeight,
          contribution: Math.round(phoneResult.score * phoneWeight * 100),
        });
      }

      if (b1.businessCode && b2.businessCode) {
        const codeMatch = b1.businessCode === b2.businessCode;
        const codeWeight = 0.1;
        if (codeMatch) {
          totalSimilarity += codeWeight;
          matchingFields.push('businessCode');
        }
        totalWeight += codeWeight;
        reasons.push({
          field: 'businessCode',
          similarity: codeMatch ? 100 : 0,
          weight: codeWeight,
          contribution: codeMatch ? Math.round(codeWeight * 100) : 0,
        });
      }

      const overallSimilarity = totalWeight > 0 ? totalSimilarity / totalWeight : 0;
      const confidence = calculateConfidence(matchingFields.length, overallSimilarity, reasons);

      if (overallSimilarity >= overallThreshold && matchingFields.length >= 2) {
        let matchType: 'exact' | 'high' | 'medium' | 'low';
        if (overallSimilarity >= 0.95) {
          matchType = 'exact';
        } else if (overallSimilarity >= 0.85) {
          matchType = 'high';
        } else if (overallSimilarity >= 0.75) {
          matchType = 'medium';
        } else {
          matchType = 'low';
        }

        candidates.push({
          originalId: b1.bizesId,
          duplicateId: b2.bizesId,
          similarityScore: Math.round(overallSimilarity * 100),
          matchType,
          matchingFields,
          originalName: b1.name,
          duplicateName: b2.name,
          confidence: Math.round(confidence * 100),
          reasons,
        });
      }
    }
  }

  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return b.similarityScore - a.similarityScore;
  });

  const limitedCandidates = candidates.slice(0, maxResults);

  const exactMatches = limitedCandidates.filter(c => c.matchType === 'exact').length;
  const highSimilarity = limitedCandidates.filter(c => c.matchType === 'high').length;
  const mediumSimilarity = limitedCandidates.filter(c => c.matchType === 'medium').length;
  const lowSimilarity = limitedCandidates.filter(c => c.matchType === 'low').length;

  const totalTimeMs = Date.now() - startTime;
  const comparisonsPerSecond = totalTimeMs > 0 ? Math.round((comparisons / totalTimeMs) * 1000) : 0;

  dbLogger.info(
    {
      comparisons,
      candidatesFound: candidates.length,
      exactMatches,
      highSimilarity,
      mediumSimilarity,
      lowSimilarity,
      totalTimeMs,
      comparisonsPerSecond,
    },
    '중복 탐지 완료'
  );

  return {
    totalCompared: comparisons,
    duplicatesFound: candidates.length,
    exactMatches,
    highSimilarity,
    mediumSimilarity,
    lowSimilarity,
    candidates: limitedCandidates,
    detectedAt: new Date(),
    performance: {
      totalTimeMs,
      comparisonsPerSecond,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  };
}

function calculateConfidence(
  matchingFieldCount: number,
  overallSimilarity: number,
  reasons: DuplicateReason[]
): number {
  const fieldCountScore = Math.min(matchingFieldCount / 4, 1) * 0.4;
  const similarityScore = overallSimilarity * 0.4;

  const topReasons = reasons
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2);
  const reasonScore = topReasons.length > 0
    ? topReasons.reduce((sum, r) => sum + r.contribution, 0) / (topReasons.length * 100) * 0.2
    : 0;

  return fieldCountScore + similarityScore + reasonScore;
}

export function mergeBusinessData(
  primary: Record<string, any>,
  secondary: Record<string, any>
): Record<string, any> {
  const merged = { ...primary };

  const priorityFields = ['name', 'roadNameAddress', 'lotNumberAddress', 'phone', 'businessCode'];
  const timestampFields = ['updatedAt', 'createdAt'];

  for (const [key, value] of Object.entries(secondary)) {
    if (value !== null && value !== undefined && value !== '') {
      const existingValue = merged[key];

      if (priorityFields.includes(key)) {
        if (existingValue === null || existingValue === undefined || existingValue === '') {
          merged[key] = value;
        }
      } else if (timestampFields.includes(key)) {
        if (!merged[key] || new Date(value) > new Date(merged[key])) {
          merged[key] = value;
        }
      } else {
        if (existingValue === null || existingValue === undefined || existingValue === '') {
          merged[key] = value;
        }
      }
    }
  }

  merged.updatedAt = new Date();
  merged.mergeCount = (merged.mergeCount || 0) + 1;

  return merged;
}

export function getDuplicateStatistics(result: DuplicateDetectionResult): {
  summary: string;
  topReasons: string[];
  recommendations: string[];
} {
  const summary = `총 ${result.totalCompared}건 비교 후 ${result.duplicatesFound}건의 중복 의심 건을 발견했습니다.`;

  const reasonCounts: Record<string, number> = {};
  for (const candidate of result.candidates) {
    for (const field of candidate.matchingFields) {
      reasonCounts[field] = (reasonCounts[field] || 0) + 1;
    }
  }

  const topReasons = Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([field, count]) => `${field} 필드에서 ${count}건의 중복 발견`);

  const recommendations: string[] = [];
  if (result.exactMatches > 0) {
    recommendations.push(`${result.exactMatches}건의 완전 일치 중복은 즉시 병합을 권장합니다`);
  }
  if (result.highSimilarity > 5) {
    recommendations.push('높은 유사도의 중복이 많습니다. 데이터 입력 프로세스를 검토하세요');
  }
  if (result.performance.comparisonsPerSecond < 1000) {
    recommendations.push('탐지 속도가 느립니다. 데이터셋을 분할하여 처리하는 것을 고려하세요');
  }

  return {
    summary,
    topReasons,
    recommendations,
  };
}

export const duplicateDetectionService = {
  detectDuplicates,
  mergeBusinessData,
  getDuplicateStatistics,
};
