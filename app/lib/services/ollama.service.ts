import pino from 'pino';

const logger = pino({ name: 'ollama-service' });

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

export class OllamaService {
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    // 기본: 로컬 Ollama 서버
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2';
  }

  /**
   * Ollama 서버 연결 테스트
   */
  async testConnection(): Promise<{
    success: boolean;
    models: OllamaModel[];
    baseUrl: string;
  }> {
    try {
      logger.info({ baseUrl: this.baseUrl }, 'Ollama 서버 연결 테스트...');

      // 서버가 실행 중인지 확인
      const tagsResponse = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!tagsResponse.ok) {
        const errorText = await tagsResponse.text();
        logger.error({ status: tagsResponse.status, error: errorText }, 'Ollama 서버 연결 실패');
        throw new Error(`Ollama 서버 연결 실패: ${tagsResponse.status} ${tagsResponse.statusText}`);
      }

      const tagsData: OllamaTagsResponse = await tagsResponse.json();
      
      logger.info({ 
        modelCount: tagsData.models.length,
        models: tagsData.models.map(m => m.name) 
      }, 'Ollama 서버 연결 성공, 사용 가능한 모델 목록 조회');

      return {
        success: true,
        models: tagsData.models,
        baseUrl: this.baseUrl,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      logger.error({ error: errorMessage }, 'Ollama 서비스 오류');
      throw error;
    }
  }

  /**
   * 텍스트 생성 (비동기)
   */
  async generate(request: OllamaRequest): Promise<OllamaResponse> {
    try {
      logger.info({ model: request.model, promptLength: request.prompt.length }, 'Ollama 텍스트 생성 요청');

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model || this.defaultModel,
          prompt: request.prompt,
          stream: false,
          options: request.options || {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, error: errorText }, 'Ollama 생성 요청 실패');
        throw new Error(`생성 요청 실패: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      
      logger.info({ 
        responseLength: data.response.length,
        evalDuration: data.eval_duration 
      }, 'Ollama 텍스트 생성 성공');

      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      logger.error({ error: errorMessage }, 'Ollama 생성 오류');
      throw error;
    }
  }

  /**
   * 채팅 생성
   */
  async chat(messages: Array<{ role: string; content: string }>, options?: OllamaRequest['options']): Promise<{
    message: { role: string; content: string };
    done: boolean;
  }> {
    try {
      logger.info({ messageCount: messages.length }, 'Ollama 채팅 요청');

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages,
          stream: false,
          options: options || {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, error: errorText }, 'Ollama 채팅 요청 실패');
        throw new Error(`채팅 요청 실패: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.info({ responseLength: data.message?.content?.length }, 'Ollama 채팅 응답 성공');

      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      logger.error({ error: errorMessage }, 'Ollama 채팅 오류');
      throw error;
    }
  }

  /**
   * 기본 모델명 반환
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * 사용 가능한 모델 목록 반환
   */
  async listModels(): Promise<OllamaModel[]> {
    const result = await this.testConnection();
    return result.models;
  }
}

export const ollamaService = new OllamaService();
