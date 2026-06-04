import { openclawClient } from './client';
import { logger } from '../logger';

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export interface ModelFallbackConfig {
  primary: string;
  fallback: string[];
}

const DEFAULT_MODEL_CONFIG: ModelFallbackConfig = {
  primary: 'llama3:latest',
  fallback: ['qwen:7b', 'mistral:latest'],
};

export class RobustOpenClawClient {
  private retryOptions: RetryOptions;
  private modelConfig: ModelFallbackConfig;
  private currentModelIndex: number = 0;

  constructor(options?: { retry?: Partial<RetryOptions>; model?: Partial<ModelFallbackConfig> }) {
    this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options?.retry };
    this.modelConfig = { ...DEFAULT_MODEL_CONFIG, ...options?.model };
  }

  getCurrentModel(): string {
    return this.modelConfig.fallback[this.currentModelIndex];
  }

  private getNextFallbackModel(): string | null {
    if (this.currentModelIndex < this.modelConfig.fallback.length - 1) {
      this.currentModelIndex++;
      return this.modelConfig.fallback[this.currentModelIndex];
    }
    return null;
  }

  resetModel(): void {
    this.currentModelIndex = 0;
  }

  async inferWithRetry(
    input: string,
    options?: {
      model?: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    let lastError: Error | null = null;
    let delay = this.retryOptions.initialDelay;

    this.resetModel();

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      const model = options?.model || this.getCurrentModel();

      try {
        logger.info({
          attempt: attempt + 1,
          model,
          inputLength: input.length,
        }, 'OpenClaw 추론 시도');

        const result = await openclawClient.infer(input, {
          model,
          systemPrompt: options?.systemPrompt,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        });

        logger.info({ model, attempt: attempt + 1 }, '추론 성공');
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        logger.warn({
          attempt: attempt + 1,
          model,
          error: lastError.message,
        }, '추론 실패, 리트라이 대기');

        if (attempt < this.retryOptions.maxRetries) {
          const fallbackModel = this.getNextFallbackModel();
          if (fallbackModel) {
            logger.info({ fallbackTo: fallbackModel }, '폴백 모델로 전환');
          }

          await this.sleep(delay);
          delay = Math.min(delay * this.retryOptions.backoffMultiplier, this.retryOptions.maxDelay);
        }
      }
    }

    logger.error({ attempts: this.retryOptions.maxRetries + 1 }, '모든 리트라이 실패');
    throw lastError || new Error('추론 실패');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const robustOpenClawClient = new RobustOpenClawClient();