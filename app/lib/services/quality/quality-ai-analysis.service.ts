import { dbLogger } from '@/lib/logger';
import { GeminiService } from '@/lib/services/gemini.service';
import { OllamaService } from '@/lib/services/ollama.service';

export interface AIAnalysisConfig {
  provider: 'gemini' | 'ollama' | 'auto';
  model: string;
  maxTokens: number;
  temperature: number;
  enableFallback: boolean;
}

export interface AIAnalysisRequest {
  businessId: string;
  data: Record<string, any>;
  analysisType: 'quality' | 'anomaly' | 'recommendation' | 'summary';
  context?: string;
}

export interface AIAnalysisResult {
  id: string;
  businessId: string;
  analysisType: string;
  provider: 'gemini' | 'ollama' | 'fallback';
  score: number;
  findings: AIFinding[];
  recommendations: string[];
  rawResponse: string;
  confidence: number;
  processedAt: Date;
  duration: number;
}

export interface AIFinding {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  field: string;
  description: string;
  evidence: string;
  suggestion: string;
}

export interface BatchAIAnalysisResult {
  totalAnalyzed: number;
  averageScore: number;
  findingsBySeverity: Record<string, number>;
  topRecommendations: string[];
  results: AIAnalysisResult[];
}

const defaultConfig: AIAnalysisConfig = {
  provider: 'auto',
  model: 'gemini-pro',
  maxTokens: 2048,
  temperature: 0.3,
  enableFallback: true,
};

const analysisHistory: AIAnalysisResult[] = [];
const MAX_HISTORY_SIZE = 5000;

export function setAIAnalysisConfig(config: Partial<AIAnalysisConfig>): void {
  Object.assign(defaultConfig, config);
  dbLogger.debug({ config: defaultConfig }, 'AI 분석 설정 업데이트');
}

export function getAIAnalysisConfig(): AIAnalysisConfig {
  return { ...defaultConfig };
}

function buildAnalysisPrompt(request: AIAnalysisRequest): string {
  const dataStr = JSON.stringify(request.data, null, 2);

  switch (request.analysisType) {
    case 'quality':
      return `다음 사업체 데이터의 품질을 분석해주세요. 각 필드의 정확성, 완성도, 일관성을 평가하고, 발견된 문제와 개선 권고사항을 JSON 형식으로 반환해주세요.\n\n사업체 데이터:\n${dataStr}\n\n${request.context ? `추가 컨텍스트: ${request.context}` : ''}\n\n반환 형식:\n{\n  "score": 0-100,\n  "findings": [{"category": "...", "severity": "...", "field": "...", "description": "...", "evidence": "...", "suggestion": "..."}],\n  "recommendations": ["..."]\n}`;

    case 'anomaly':
      return `다음 사업체 데이터에서 이상치를 탐지해주세요. 각 필드의 값이 합리적인 범위 내에 있는지, 다른 데이터와 일관성이 있는지 분석해주세요.\n\n사업체 데이터:\n${dataStr}\n\n반환 형식:\n{\n  "score": 0-100,\n  "findings": [{"category": "...", "severity": "...", "field": "...", "description": "...", "evidence": "...", "suggestion": "..."}],\n  "recommendations": ["..."]\n}`;

    case 'recommendation':
      return `다음 사업체 데이터를 기반으로 데이터 품질 개선을 위한 구체적인 권고사항을 생성해주세요.\n\n사업체 데이터:\n${dataStr}\n\n반환 형식:\n{\n  "score": 0-100,\n  "findings": [{"category": "...", "severity": "...", "field": "...", "description": "...", "evidence": "...", "suggestion": "..."}],\n  "recommendations": ["..."]\n}`;

    case 'summary':
      return `다음 사업체 데이터의 전체적인 상태를 요약해주세요.\n\n사업체 데이터:\n${dataStr}\n\n반환 형식:\n{\n  "score": 0-100,\n  "findings": [{"category": "...", "severity": "...", "field": "...", "description": "...", "evidence": "...", "suggestion": "..."}],\n  "recommendations": ["..."]\n}`;

    default:
      return `다음 사업체 데이터를 분석해주세요:\n${dataStr}`;
  }
}

function parseAIResponse(response: string): {
  score: number;
  findings: AIFinding[];
  recommendations: string[];
} {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 50,
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      };
    }
  } catch {
    dbLogger.warn('AI 응답 JSON 파싱 실패');
  }

  return {
    score: 50,
    findings: [{
      category: 'general',
      severity: 'medium',
      field: 'unknown',
      description: 'AI 응답을 파싱할 수 없습니다',
      evidence: response.substring(0, 200),
      suggestion: '수동 검토가 필요합니다',
    }],
    recommendations: ['AI 분석 결과를 수동으로 검토해주세요'],
  };
}

export async function analyzeWithAI(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
  const startTime = Date.now();
  const prompt = buildAnalysisPrompt(request);

  let provider: 'gemini' | 'ollama' | 'fallback' = defaultConfig.provider as any;
  let rawResponse = '';
  let usedFallback = false;

  try {
    if (provider === 'auto' || provider === 'gemini') {
      try {
        const gemini = new GeminiService();
        const result = await gemini.testConnection();
        rawResponse = result.answer || JSON.stringify({ score: 50, findings: [], recommendations: [] });
        provider = 'gemini';
      } catch (error) {
        if (!defaultConfig.enableFallback) throw error;
        usedFallback = true;
        dbLogger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Gemini 분석 실패, Ollama로 폴백');
      }
    }

    if (usedFallback || provider === 'ollama') {
      try {
        const ollama = new OllamaService();
        const ollamaResult = await ollama.generate({
          model: defaultConfig.model || ollama.getDefaultModel(),
          prompt,
          options: {
            temperature: defaultConfig.temperature,
            num_predict: defaultConfig.maxTokens,
          },
        });
        rawResponse = ollamaResult.response;
        provider = 'ollama';
      } catch (error) {
        if (!usedFallback) throw error;
        dbLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Ollama 분석도 실패');
        rawResponse = JSON.stringify({
          score: 50,
          findings: [],
          recommendations: ['AI 분석 서비스를 사용할 수 없습니다'],
        });
        provider = 'fallback';
      }
    }

    const parsed = parseAIResponse(rawResponse);

    const result: AIAnalysisResult = {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      businessId: request.businessId,
      analysisType: request.analysisType,
      provider,
      score: parsed.score,
      findings: parsed.findings,
      recommendations: parsed.recommendations,
      rawResponse,
      confidence: provider === 'fallback' ? 0.3 : provider === 'ollama' ? 0.7 : 0.85,
      processedAt: new Date(),
      duration: Date.now() - startTime,
    };

    analysisHistory.push(result);
    if (analysisHistory.length > MAX_HISTORY_SIZE) {
      analysisHistory.splice(0, analysisHistory.length - MAX_HISTORY_SIZE);
    }

    dbLogger.debug({
      businessId: request.businessId,
      provider,
      score: parsed.score,
      duration: result.duration,
    }, 'AI 분석 완료');

    return result;
  } catch (error) {
    dbLogger.error({
      businessId: request.businessId,
      error: error instanceof Error ? error.message : String(error),
    }, 'AI 분석 오류');

    const fallbackResult: AIAnalysisResult = {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      businessId: request.businessId,
      analysisType: request.analysisType,
      provider: 'fallback',
      score: 50,
      findings: [],
      recommendations: ['AI 분석 중 오류가 발생했습니다'],
      rawResponse: '',
      confidence: 0,
      processedAt: new Date(),
      duration: Date.now() - startTime,
    };

    analysisHistory.push(fallbackResult);
    return fallbackResult;
  }
}

export async function analyzeBatchWithAI(
  requests: AIAnalysisRequest[]
): Promise<BatchAIAnalysisResult> {
  const results: AIAnalysisResult[] = [];

  for (const request of requests) {
    const result = await analyzeWithAI(request);
    results.push(result);
  }

  const totalAnalyzed = results.length;
  const averageScore = totalAnalyzed > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalAnalyzed)
    : 0;

  const findingsBySeverity: Record<string, number> = {};
  const allRecommendations: string[] = [];

  for (const result of results) {
    for (const finding of result.findings) {
      findingsBySeverity[finding.severity] = (findingsBySeverity[finding.severity] || 0) + 1;
    }
    allRecommendations.push(...result.recommendations);
  }

  const recCounts: Record<string, number> = {};
  for (const rec of allRecommendations) {
    recCounts[rec] = (recCounts[rec] || 0) + 1;
  }
  const topRecommendations = Object.entries(recCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rec]) => rec);

  return {
    totalAnalyzed,
    averageScore,
    findingsBySeverity,
    topRecommendations,
    results,
  };
}

export function getAnalysisHistory(
  businessId?: string,
  limit: number = 100
): AIAnalysisResult[] {
  let history = [...analysisHistory];
  if (businessId) {
    history = history.filter(h => h.businessId === businessId);
  }
  return history.slice(-limit);
}

export function getAnalysisStats(): {
  totalAnalyses: number;
  averageScore: number;
  providerDistribution: Record<string, number>;
  averageConfidence: number;
  averageDuration: number;
} {
  const totalAnalyses = analysisHistory.length;
  const averageScore = totalAnalyses > 0
    ? Math.round(analysisHistory.reduce((sum, a) => sum + a.score, 0) / totalAnalyses)
    : 0;
  const averageConfidence = totalAnalyses > 0
    ? Math.round((analysisHistory.reduce((sum, a) => sum + a.confidence, 0) / totalAnalyses) * 100) / 100
    : 0;
  const averageDuration = totalAnalyses > 0
    ? Math.round(analysisHistory.reduce((sum, a) => sum + a.duration, 0) / totalAnalyses)
    : 0;

  const providerDistribution: Record<string, number> = {};
  for (const analysis of analysisHistory) {
    providerDistribution[analysis.provider] = (providerDistribution[analysis.provider] || 0) + 1;
  }

  return {
    totalAnalyses,
    averageScore,
    providerDistribution,
    averageConfidence,
    averageDuration,
  };
}

export function generateAIAnalysisReport(result: AIAnalysisResult): string {
  const lines = [
    '# AI 품질 분석 리포트',
    '',
    `## 기본 정보`,
    `- 사업체 ID: ${result.businessId}`,
    `- 분석 유형: ${result.analysisType}`,
    `- 사용 프로바이더: ${result.provider}`,
    `- 분석 시간: ${result.processedAt.toLocaleString('ko-KR')}`,
    `- 소요 시간: ${result.duration}ms`,
    `- 신뢰도: ${(result.confidence * 100).toFixed(0)}%`,
    '',
    `## 분석 결과`,
    `- 점수: ${result.score}점`,
    '',
  ];

  if (result.findings.length > 0) {
    lines.push('## 발견된 문제');
    for (const finding of result.findings) {
      lines.push(`### [${finding.severity}] ${finding.category} - ${finding.field}`);
      lines.push(`- 설명: ${finding.description}`);
      lines.push(`- 근거: ${finding.evidence}`);
      lines.push(`- 제안: ${finding.suggestion}`);
      lines.push('');
    }
  }

  if (result.recommendations.length > 0) {
    lines.push('## 권고사항');
    for (const rec of result.recommendations) {
      lines.push(`- ${rec}`);
    }
  }

  return lines.join('\n');
}
