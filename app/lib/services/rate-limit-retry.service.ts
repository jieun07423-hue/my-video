import { syncLogger, apiLogger } from '@/lib/logger';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
}

export interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000,
  keyPrefix: 'api',
};

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

const tokenBuckets = new Map<string, TokenBucketState>();

function refillTokens(bucket: TokenBucketState, capacity: number, refillRatePerMs: number): number {
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  const newTokens = Math.min(capacity, bucket.tokens + elapsed * refillRatePerMs);
  bucket.tokens = newTokens;
  bucket.lastRefill = now;
  return newTokens;
}

export class RateLimitService {
  private limits = new Map<string, RateLimitConfig>();

  setLimit(key: string, config: RateLimitConfig) {
    this.limits.set(key, config);
  }

  getLimit(key: string): RateLimitConfig {
    return this.limits.get(key) || DEFAULT_RATE_LIMIT;
  }

  async checkLimit(key: string, cost: number = 1): Promise<RateLimitResult> {
    const config = this.getLimit(key);
    const bucketKey = `${config.keyPrefix}:${key}`;
    let bucket = tokenBuckets.get(bucketKey);

    if (!bucket) {
      bucket = { tokens: config.maxRequests, lastRefill: Date.now() };
      tokenBuckets.set(bucketKey, bucket);
    }

    const capacity = config.maxRequests;
    const refillRatePerMs = config.maxRequests / config.windowMs;
    const availableTokens = refillTokens(bucket, capacity, refillRatePerMs);

    if (availableTokens >= cost) {
      bucket.tokens -= cost;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime: bucket.lastRefill + config.windowMs,
      };
    }

    const retryAfter = Math.ceil((cost - availableTokens) / refillRatePerMs);
    return {
      allowed: false,
      remaining: 0,
      resetTime: bucket.lastRefill + config.windowMs,
      retryAfter,
    };
  }

  async consume(key: string, cost: number = 1): Promise<boolean> {
    const result = await this.checkLimit(key, cost);
    return result.allowed;
  }

  reset(key: string) {
    const config = this.getLimit(key);
    const bucketKey = `${config.keyPrefix}:${key}`;
    tokenBuckets.delete(bucketKey);
  }

  getAllLimits(): Record<string, RateLimitConfig> {
    const result: Record<string, RateLimitConfig> = {};
    for (const [key, config] of this.limits.entries()) {
      result[key] = config;
    }
    return result;
  }
}

export class RetryService {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY, ...config };
  }

  async execute<T>(
    fn: () => Promise<T>,
    options: {
      onRetry?: (attempt: number, error: Error, delayMs: number) => void;
      shouldRetry?: (error: Error, attempt: number) => boolean;
    } = {}
  ): Promise<RetryResult<T>> {
    const { onRetry, shouldRetry } = options;
    const startTime = Date.now();
    let lastError: Error;
    let attemptCount = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      attemptCount = attempt + 1;
      try {
        const data = await fn();
        return {
          success: true,
          data,
          attempts: attemptCount,
          totalTimeMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === this.config.maxRetries) {
          break;
        }

        let shouldRetryNext: boolean;
        if (shouldRetry) {
          shouldRetryNext = shouldRetry(lastError, attempt + 1);
        } else {
          shouldRetryNext = this.isRetryableError(lastError);
        }

        if (!shouldRetryNext) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        
        if (onRetry) {
          onRetry(attempt + 1, lastError, delay);
        }

        apiLogger.warn(
          { attempt: attempt + 1, maxRetries: this.config.maxRetries, delay, error: lastError.message },
          '재시도 대기 중'
        );

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError!,
      attempts: attemptCount,
      totalTimeMs: Date.now() - startTime,
    };
  }

  private isRetryableError(error: Error): boolean {
    if ('status' in error && typeof error.status === 'number') {
      return this.config.retryableStatusCodes.includes(error.status);
    }
    if ('code' in error && typeof error.code === 'string') {
      return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.code);
    }
    return false;
  }

  private calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxDelayMs
    );
    const jitter = delay * 0.1 * Math.random();
    return Math.floor(delay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateConfig(config: Partial<RetryConfig>) {
    this.config = { ...this.config, ...config };
  }
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 60000,
    private readonly halfOpenRequests: number = 3
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'half-open';
        syncLogger.info('서킷 브레이커: 반개방 상태로 전환');
      } else {
        throw new Error('서킷 브레이커가 열려 있습니다. 요청이 차단되었습니다.');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      syncLogger.info('서킷 브레이커: 닫힘 상태로 복구');
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      syncLogger.warn({ failures: this.failures }, '서킷 브레이커: 열림 상태로 전환');
    }
  }

  getState(): string {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  reset() {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
}

export const rateLimitService = new RateLimitService();
export const retryService = new RetryService();

rateLimitService.setLimit('public-data-portal', {
  maxRequests: 100,
  windowMs: 60000,
  keyPrefix: 'portal',
});

rateLimitService.setLimit('business-api', {
  maxRequests: 200,
  windowMs: 60000,
  keyPrefix: 'api',
});

rateLimitService.setLimit('auth', {
  maxRequests: 10,
  windowMs: 60000,
  keyPrefix: 'auth',
});

export async function withRateLimit<T>(
  key: string,
  fn: () => Promise<T>,
  cost: number = 1
): Promise<T> {
  const result = await rateLimitService.checkLimit(key, cost);
  
  if (!result.allowed) {
    const error = new Error(`속도 제한 초과: ${result.retryAfter}ms 후 재시도`);
    (error as Error & { status: number }).status = 429;
    (error as Error & { retryAfter: number }).retryAfter = result.retryAfter || 0;
    throw error;
  }

  return fn();
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  } = {}
): Promise<T> {
  const retryService = new RetryService({
    maxRetries: options.maxRetries ?? 3,
    baseDelayMs: options.baseDelayMs ?? 1000,
  });

  const result = await retryService.execute(fn, {
    onRetry: options.onRetry,
  });

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}

export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  breaker: CircuitBreaker = new CircuitBreaker()
): Promise<T> {
  return breaker.execute(fn);
}