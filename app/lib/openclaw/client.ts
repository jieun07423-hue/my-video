/**
 * OpenClaw Gateway Client
 * OpenClaw 프롬프트 체인을 통한 AI 추론 클라이언트
 * Gateway: http://localhost:18789
 * 
 * 주의: OpenClaw Gateway가 REST API (/infer)를 지원하지 않아
 * Ollama를 직접 사용합니다.
 */

import { OllamaClient } from '../ollama';
import { logger } from '../logger';

/**
 * OpenClaw Gateway 설정
 */
export interface OpenClawConfig {
  ollamaUrl: string;
  model: string;
  timeout: number;
}

/**
 * OpenClaw 추론 요청
 */
export interface OpenClawInferRequest {
  input: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * OpenClaw 추론 응답
 */
export interface OpenClawInferResponse {
  output: string;
  model: string;
  duration?: number;
  tokens?: number;
}

/**
 * 기본 OpenClaw 설정 (환경변수에서 획득)
 */
function getOpenClawConfig(): OpenClawConfig {
  return {
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OPENCLAW_MODEL || 'llama3:latest',
    timeout: parseInt(process.env.OPENCLAW_TIMEOUT || '120000', 10),
  };
}

/**
 * OpenClaw Gateway 클라이언트 (Ollama 직접 사용)
 */
export class OpenClawClient {
  private config: OpenClawConfig;
  private ollamaClient: OllamaClient;

  constructor(config?: Partial<OpenClawConfig>) {
    this.config = { ...getOpenClawConfig(), ...config };
    this.ollamaClient = new OllamaClient({
      baseUrl: this.config.ollamaUrl,
      model: this.extractModelName(this.config.model),
    });
  }

  private extractModelName(model: string): string {
    if (model.startsWith('ollama/')) {
      return model.replace('ollama/', '');
    }
    return model;
  }

  /**
   * 추론 요청 (Ollama 직접 사용)
   */
  async infer(input: string, options?: Partial<OpenClawInferRequest>): Promise<string> {
    const startTime = Date.now();

    try {
      const model = this.extractModelName(options?.model || this.config.model);
      this.ollamaClient.setModel(model);

      logger.info({
        model,
        inputLength: input.length,
      }, 'Ollama inference request');

      const systemPrompt = options?.systemPrompt || '당신은 대한민국 최고 광고 카피라이터입니다. 한국어로 답변해주세요.';
      
      const response = await this.ollamaClient.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input }
      ]);

      const output = response.message.content;

      logger.info({
        responseTime: Date.now() - startTime,
        outputLength: output?.length || 0,
      }, 'Ollama inference response received');

      return output;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        baseUrl: this.baseUrl,
        model: this.config.model,
      }, 'OpenClaw inference error');
      throw error;
    }
  }

  /**
   * 체인 추론 (여러 단계의 프롬프트 체인)
   */
  async chainInfer(prompts: string[]): Promise<string[]> {
    const results: string[] = [];

    for (const prompt of prompts) {
      const result = await this.infer(prompt);
      results.push(result);
    }

    return results;
  }

  /**
   * 모델 변경
   */
  setModel(model: string): void {
    this.config.model = model;
  }

  /**
   * 현재 모델 확인
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Ollama 연결 확인
   */
  async isAvailable(): Promise<boolean> {
    return await this.ollamaClient.isAvailable();
  }
}

/**
 * 기본 OpenClaw 클라이언트 인스턴스
 */
export const openclawClient = new OpenClawClient();

/**
 * 광고 카피 생성용 프롬프트 템플릿
 */
export const AD_COPY_PROMPTS = {
  /**
   * 초기 생성 프롬프트 (20개 생성)
   */
  initial: (params: {
    industry: string;
    location: string;
    target?: string;
    goal?: string;
    strengths?: string;
    keywords: string[];
    tone?: string;
  }): string => {
    return `
당신은 대한민국 최고 광고 카피라이터입니다.

다음 정보를 기반으로 고전환 광고 카피를 생성하세요.

[조건]
- 짧고 강렬하게 (50자 이내)
- 반드시 CTA 포함 (지금 예약, 무료 상담, 확인하기 등)
- 지역(${params.location})과 타겟(${params.target || '일반'}) 반영
- 차별점(${params.strengths}) 강조
- 정확히 20개 생성

[입력]
- 업종: ${params.industry}
- 지역: ${params.location}
- 타겟: ${params.target || '일반'}
- 목표: ${params.goal || '문의 유도'}
- 강점: ${params.strengths || '검증된 기술'}
- 키워드: ${params.keywords.join(', ')}
- 톤: ${params.tone || '신뢰/전문'}

[출력 형식]
번호. 카피
(예: 1. 강남에서 가장 빠른 임플란트, 지금 무료 상담 받으세요!)
`;
  },

  /**
   * 필터링 프롬프트 (20개 → 5개)
   */
  filterToTop5: (copies: string[]): string => {
    return `
다음 20개의 광고 카피 중 가장 설득력 높은 5개만 다시 선택해주세요.

[조건]
- CTA 포함 여부
- 짧고 강렬한 표현
- 지역/타겟 적합성
- 차별점 표현력

[카피 목록]
${copies.map((copy, i) => `${i + 1}. ${copy}`).join('\n')}

[출력 형식]
선택한 5개만 번호로 출력 (예: 3, 7, 12, 15, 18)
`;
  },

  /**
   * 최종 선택 프롬프트 (5개 → 3개)
   */
  selectFinal: (copies: string[]): string => {
    return `
다음 5개의 광고 카피 중 최종적으로 사용할 3개를 추천해주세요.

[조건]
- 가장 전환률이 높을 것
- 기억에 남는 표현
- 명확한 CTA

[카피 목록]
${copies.map((copy, i) => `${i + 1}. ${copy}`).join('\n')}

[출력 형식]
최종 3개만 번호로 출력 (예: 2, 4, 5)
`;
  },
};