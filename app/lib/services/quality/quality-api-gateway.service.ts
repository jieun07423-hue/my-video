import { dbLogger } from '@/lib/logger';
import { evaluateCompleteness, CompletenessScore } from './data-completeness.service';
import { detectDuplicates, DuplicateDetectionResult } from '../duplicate-detection.service';
import { performQualityCheck, MonitoringResult } from './data-quality-monitor.service';

export interface QualityApiKey {
  id: string;
  name: string;
  key: string;
  permissions: QualityPermission[];
  rateLimit: number;
  createdAt: Date;
  expiresAt?: Date;
  active: boolean;
}

export interface QualityPermission {
  resource: 'completeness' | 'duplicates' | 'monitoring' | 'batch';
  actions: ('read' | 'write')[];
}

export interface QualityApiRequest {
  apiKey: string;
  resource: string;
  action: string;
  parameters: Record<string, any>;
}

export interface QualityApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    requestId: string;
    timestamp: Date;
    processingTimeMs: number;
    apiKeyId: string;
  };
}

export interface QualityScoreRequest {
  bizesId?: string;
  businesses?: Record<string, any>[];
  includeDetails?: boolean;
  includeHistory?: boolean;
}

export interface QualityScoreResponse {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  components: {
    completeness: number;
    freshness: number;
    crossValidation: number;
    duplicateRisk: number;
  };
  details?: CompletenessScore;
  recommendations: string[];
}

const apiKeys: QualityApiKey[] = [];
const requestLogs: { requestId: string; timestamp: Date; apiKeyId: string; resource: string; success: boolean }[] = [];
const MAX_REQUEST_LOGS = 10000;

export function createApiKey(
  name: string,
  permissions: QualityPermission[],
  rateLimit: number = 100,
  expiresAt?: Date
): QualityApiKey {
  const key = `qk_${generateRandomKey(32)}`;

  const apiKey: QualityApiKey = {
    id: `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    key,
    permissions,
    rateLimit,
    createdAt: new Date(),
    expiresAt,
    active: true,
  };

  apiKeys.push(apiKey);
  return apiKey;
}

function generateRandomKey(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function validateApiKey(key: string): QualityApiKey | null {
  const apiKey = apiKeys.find(k => k.key === key && k.active);
  if (!apiKey) return null;

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    apiKey.active = false;
    return null;
  }

  return apiKey;
}

export function checkPermission(
  apiKey: QualityApiKey,
  resource: string,
  action: string
): boolean {
  return apiKey.permissions.some(
    p => p.resource === resource && p.actions.includes(action as 'read' | 'write')
  );
}

export function checkRateLimit(apiKey: QualityApiKey): boolean {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000);

  const recentRequests = requestLogs.filter(
    log => log.apiKeyId === apiKey.id && log.timestamp >= oneMinuteAgo
  );

  return recentRequests.length < apiKey.rateLimit;
}

export function logRequest(
  requestId: string,
  apiKeyId: string,
  resource: string,
  success: boolean
): void {
  requestLogs.push({
    requestId,
    timestamp: new Date(),
    apiKeyId,
    resource,
    success,
  });

  if (requestLogs.length > MAX_REQUEST_LOGS) {
    requestLogs.splice(0, requestLogs.length - MAX_REQUEST_LOGS);
  }
}

export async function processQualityRequest(
  request: QualityApiRequest
): Promise<QualityApiResponse> {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const apiKey = validateApiKey(request.apiKey);
  if (!apiKey) {
    logRequest(requestId, 'unknown', request.resource, false);
    return {
      success: false,
      error: '유효하지 않은 API 키입니다',
      metadata: {
        requestId,
        timestamp: new Date(),
        processingTimeMs: Date.now() - startTime,
        apiKeyId: 'unknown',
      },
    };
  }

  if (!checkPermission(apiKey, request.resource, 'read')) {
    logRequest(requestId, apiKey.id, request.resource, false);
    return {
      success: false,
      error: '이 리소스에 대한 권한이 없습니다',
      metadata: {
        requestId,
        timestamp: new Date(),
        processingTimeMs: Date.now() - startTime,
        apiKeyId: apiKey.id,
      },
    };
  }

  if (!checkRateLimit(apiKey)) {
    logRequest(requestId, apiKey.id, request.resource, false);
    return {
      success: false,
      error: 'API 호출 한도를 초과했습니다',
      metadata: {
        requestId,
        timestamp: new Date(),
        processingTimeMs: Date.now() - startTime,
        apiKeyId: apiKey.id,
      },
    };
  }

  try {
    let data: any;

    switch (request.resource) {
      case 'completeness':
        data = await handleCompletenessRequest(request.parameters);
        break;
      case 'duplicates':
        data = await handleDuplicatesRequest(request.parameters);
        break;
      case 'monitoring':
        data = await handleMonitoringRequest(request.parameters);
        break;
      default:
        throw new Error(`지원하지 않는 리소스입니다: ${request.resource}`);
    }

    logRequest(requestId, apiKey.id, request.resource, true);

    return {
      success: true,
      data,
      metadata: {
        requestId,
        timestamp: new Date(),
        processingTimeMs: Date.now() - startTime,
        apiKeyId: apiKey.id,
      },
    };
  } catch (error) {
    logRequest(requestId, apiKey.id, request.resource, false);

    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      metadata: {
        requestId,
        timestamp: new Date(),
        processingTimeMs: Date.now() - startTime,
        apiKeyId: apiKey.id,
      },
    };
  }
}

async function handleCompletenessRequest(
  params: Record<string, any>
): Promise<QualityScoreResponse> {
  const { bizesId, businesses, includeDetails = false } = params;

  if (bizesId) {
    const business = { bizesId, ...params.business };
    const score = evaluateCompleteness(business);

    return {
      overallScore: score.totalScore,
      grade: score.grade,
      components: {
        completeness: score.totalScore,
        freshness: score.freshness.score,
        crossValidation: score.crossValidation.score,
        duplicateRisk: 0,
      },
      details: includeDetails ? score : undefined,
      recommendations: generateRecommendations(score),
    };
  }

  if (businesses && Array.isArray(businesses)) {
    const scores = businesses.map(b => evaluateCompleteness(b));
    const avgScore = scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length;

    return {
      overallScore: Math.round(avgScore),
      grade: scoreToGrade(avgScore),
      components: {
        completeness: Math.round(avgScore),
        freshness: Math.round(scores.reduce((sum, s) => sum + s.freshness.score, 0) / scores.length),
        crossValidation: Math.round(scores.reduce((sum, s) => sum + s.crossValidation.score, 0) / scores.length),
        duplicateRisk: 0,
      },
      recommendations: ['배치 완성도 평가가 완료되었습니다'],
    };
  }

  throw new Error('bizesId 또는 businesses 파라미터가 필요합니다');
}

async function handleDuplicatesRequest(
  params: Record<string, any>
): Promise<{ duplicates: any[]; statistics: any }> {
  const { businesses, options = {} } = params;

  if (!businesses || !Array.isArray(businesses)) {
    throw new Error('businesses 배열이 필요합니다');
  }

  const result = detectDuplicates(businesses, options);

  return {
    duplicates: result.candidates.slice(0, options.maxResults || 100),
    statistics: {
      totalCompared: result.totalCompared,
      duplicatesFound: result.duplicatesFound,
      exactMatches: result.exactMatches,
      highSimilarity: result.highSimilarity,
      mediumSimilarity: result.mediumSimilarity,
    },
  };
}

async function handleMonitoringRequest(
  params: Record<string, any>
): Promise<MonitoringResult> {
  const { businesses, thresholds } = params;

  if (!businesses || !Array.isArray(businesses)) {
    throw new Error('businesses 배열이 필요합니다');
  }

  return performQualityCheck(businesses, thresholds);
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function generateRecommendations(score: CompletenessScore): string[] {
  const recommendations: string[] = [];

  if (score.totalScore < 70) {
    recommendations.push('데이터 완성도가 낮습니다. 누락된 필드를 보완하세요.');
  }

  if (score.freshness.isStale) {
    recommendations.push('데이터가 오래되었습니다. 업데이트를 수행하세요.');
  }

  if (!score.crossValidation.isValid) {
    recommendations.push('교차검증에서 이슈가 발견되었습니다. 데이터를 확인하세요.');
  }

  if (recommendations.length === 0) {
    recommendations.push('데이터 품질이 양호한 상태입니다.');
  }

  return recommendations;
}

export function getApiKey(keyId: string): QualityApiKey | undefined {
  return apiKeys.find(k => k.id === keyId);
}

export function listApiKeys(): QualityApiKey[] {
  return [...apiKeys];
}

export function revokeApiKey(keyId: string): boolean {
  const apiKey = apiKeys.find(k => k.id === keyId);
  if (apiKey) {
    apiKey.active = false;
    return true;
  }
  return false;
}

export function getRequestStats(
  apiKeyId?: string,
  hours: number = 24
): {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
} {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const relevantLogs = requestLogs.filter(
    log => log.timestamp >= cutoff && (!apiKeyId || log.apiKeyId === apiKeyId)
  );

  return {
    totalRequests: relevantLogs.length,
    successfulRequests: relevantLogs.filter(l => l.success).length,
    failedRequests: relevantLogs.filter(l => !l.success).length,
    averageResponseTime: 0,
  };
}

export function generateApiKeyDocumentation(): string {
  return `
# 데이터 품질 API 문서

## 인증
모든 API 요청에는 API 키가 필요합니다.
\`\`\`
Authorization: Bearer <your-api-key>
\`\`\`

## 엔드포인트

### 1. 완성도 점수 조회
POST /api/data-quality/gateway/completeness
\`\`\`json
{
  "bizesId": "1234567890",
  "includeDetails": true
}
\`\`\`

### 2. 중복 탐지
POST /api/data-quality/gateway/duplicates
\`\`\`json
{
  "businesses": [...],
  "options": {
    "nameThreshold": 0.8,
    "maxResults": 100
  }
}
\`\`\`

### 3. 모니터링
POST /api/data-quality/gateway/monitoring
\`\`\`json
{
  "businesses": [...],
  "thresholds": [...]
}
\`\`\`

## 응답 형식
\`\`\`json
{
  "success": true,
  "data": {...},
  "metadata": {
    "requestId": "req-...",
    "timestamp": "2024-01-01T00:00:00Z",
    "processingTimeMs": 100,
    "apiKeyId": "key-..."
  }
}
\`\`\`
  `.trim();
}
