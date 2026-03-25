import axios from 'axios';
import { apiLogger } from '@/lib/logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};

/**
 * 지수 백오프와 함께 재시도 로직
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // 4xx 오류 (429 제외)는 재시도하지 않음
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          throw error;
        }

        // 속도 제인 경우 Retry-After 헤더 확인
        if (statusCode === 429) {
          const retryAfter = error.response?.headers['retry-after'];
          if (retryAfter) {
            const rateLimitDelay = parseInt(retryAfter) * 1000;
            apiLogger.info(
              { retryAfter: rateLimitDelay },
              '속도 제한, 대기 중...'
            );
            await sleep(rateLimitDelay);
            continue;
          }
        }
      }

      // 마지막 시도가 아니면 지연 후 재시도
      if (attempt < opts.maxAttempts) {
        apiLogger.warn(
          { attempt, maxAttempts: opts.maxAttempts, delay, error: lastError.message },
          '재시도 대기 중...'
        );
        await sleep(delay);
        delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
      }
    }
  }

  apiLogger.error(
    { maxAttempts: opts.maxAttempts, error: lastError?.message },
    '최대 재시도 횟수 초과'
  );
  throw lastError!;
}

/**
 * 비동기 지연
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * API 호출 래퍼 (자동 재시도 포함)
 */
export async function fetchWithRetry<T>(
  url: string,
  options?: RetryOptions & { axiosConfig?: any }
): Promise<T> {
  return retryWithBackoff(async () => {
    const response = await axios.get<T>(url, options?.axiosConfig);
    return response.data;
  }, options);
}

export default {
  retryWithBackoff,
  sleep,
  fetchWithRetry,
};
