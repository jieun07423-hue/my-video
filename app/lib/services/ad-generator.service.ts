import pino from 'pino';
import { robustOpenClawClient } from '../openclaw/types';
import { adCacheService } from './ad-cache.service';
import { rateLimitService } from './rate-limit.service';
import { AD_COPY_PROMPTS } from '../openclaw/client';
import { dbLogger } from '../logger';

const logger = pino({ name: 'ad-generator-service' });

export interface AdGenerateParams {
  industry: string;
  location: string;
  target?: string;
  goal?: string;
  strengths?: string;
  keywords: string[];
  tone?: string;
  userId?: string;
}

export interface AdGenerateResult {
  campaignId?: string;
  initialCopies: string[];
  top5Copies: string[];
  finalCopies: string[];
  totalDuration: number;
  cached?: boolean;
}

export class AdGeneratorService {
  async generate(params: AdGenerateParams): Promise<AdGenerateResult> {
    const startTime = Date.now();
    const result: AdGenerateResult = {
      initialCopies: [],
      top5Copies: [],
      finalCopies: [],
      totalDuration: 0,
      cached: false,
    };

    const { userId, industry, location, target } = params;

    if (userId) {
      const rateLimitCheck = rateLimitService.check(userId);
      if (!rateLimitCheck.allowed) {
        const resetDate = new Date(rateLimitCheck.resetAt);
        throw new Error(
          `과도한 요청입니다. ${resetDate.toLocaleTimeString()}에 다시 시도해주세요. (남은 기회: 0)`
        );
      }
      logger.info({ userId, remaining: rateLimitCheck.remaining }, 'Rate limit 확인');
    }

    const cacheKey = { industry, location, target };
    const cached = adCacheService.get<AdGenerateResult>(cacheKey);
    if (cached) {
      logger.info({ cacheKey }, '캐시된 결과 반환');
      return { ...cached, cached: true, totalDuration: Date.now() - startTime };
    }

    try {
      logger.info(params, '광고 카피 생성 시작');

      const initialPrompt = AD_COPY_PROMPTS.initial({
        ...params,
        keywords: params.keywords || [],
      });

      const initialOutput = await robustOpenClawClient.inferWithRetry(initialPrompt);
      result.initialCopies = this.parseCopies(initialOutput);
      
      logger.info({ count: result.initialCopies.length }, '1단계: 20개 생성 완료');

      if (result.initialCopies.length === 0) {
        throw new Error('광고 카피 생성 실패: 결과 없음');
      }

      const top5Prompt = AD_COPY_PROMPTS.filterToTop5(result.initialCopies);
      const top5Output = await robustOpenClawClient.inferWithRetry(top5Prompt);
      const top5Indices = this.parseIndices(top5Output);
      
      result.top5Copies = top5Indices
        .filter(i => i >= 0 && i < result.initialCopies.length)
        .map(i => result.initialCopies[i]);

      logger.info({ count: result.top5Copies.length }, '2단계: 5개 필터링 완료');

      if (result.top5Copies.length === 0) {
        result.top5Copies = result.initialCopies.slice(0, 5);
      }

      const finalPrompt = AD_COPY_PROMPTS.selectFinal(result.top5Copies);
      const finalOutput = await robustOpenClawClient.inferWithRetry(finalPrompt);
      const finalIndices = this.parseIndices(finalOutput);

      result.finalCopies = finalIndices
        .filter(i => i >= 0 && i < result.top5Copies.length)
        .map(i => result.top5Copies[i]);

      logger.info({ count: result.finalCopies.length }, '3단계: 3개 최종 선택 완료');

      if (result.finalCopies.length === 0) {
        result.finalCopies = result.top5Copies.slice(0, 3);
      }

      result.totalDuration = Date.now() - startTime;
      logger.info({ duration: result.totalDuration }, '광고 카피 생성 완료');

      adCacheService.set(cacheKey, result);

      return result;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        params,
      }, '광고 생성 오류');
      throw error;
    }
  }

  private parseCopies(text: string): string[] {
    const copies: string[] = [];

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 20).map(String);
        }
      } catch {
        logger.debug('JSON 파싱 실패, 일반 파싱으로 회귀');
      }
    }

    const lines = text.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const match = line.match(/^\d+[.)]\s*(.+)$/);
      if (match && match[1]) {
        copies.push(match[1].trim());
      } else if (line.trim() && !line.match(/^[#\-*]/)) {
        copies.push(line.trim());
      }
    }

    return copies.slice(0, 20);
  }

  private parseIndices(text: string): number[] {
    const numbers: number[] = [];

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map(n => Number(n) - 1).filter(n => !isNaN(n));
        }
      } catch {
        logger.debug('JSON 인덱스 파싱 실패');
      }
    }

    const regex = /\d+/g;
    const matches = text.match(regex);

    if (matches) {
      for (const match of matches) {
        const num = parseInt(match, 10);
        if (num > 0 && num <= 20) {
          numbers.push(num - 1);
        }
      }
    }

    return [...new Set(numbers)];
  }

  getRateLimitStatus(userId: string) {
    return rateLimitService.getStatus(userId);
  }

  invalidateCache(industry?: string, location?: string) {
    if (industry || location) {
      adCacheService.invalidate(`${industry}:${location}`);
    } else {
      adCacheService.invalidate();
    }
  }
}

export const adGeneratorService = new AdGeneratorService();