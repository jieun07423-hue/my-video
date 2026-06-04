import { NextRequest, NextResponse } from 'next/server';
import { adRepository } from '@/lib/repositories/ad.repository';
import { adCacheService } from '@/lib/services/ad-cache.service';
import { rateLimitService } from '@/lib/services/rate-limit.service';
import { adGeneratorService } from '@/lib/services/ad-generator.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;

    const [campaignStats, cacheStats, rateLimitStatus] = await Promise.all([
      adRepository.getStats(),
      Promise.resolve(adCacheService.getStats()),
      userId ? Promise.resolve(adGeneratorService.getRateLimitStatus(userId)) : Promise.resolve(null),
    ]);

    const userCampaigns = userId 
      ? await adRepository.findCampaignsByUserId(userId, { limit: 5 })
      : [];

    const response: Record<string, unknown> = {
      campaigns: campaignStats,
      cache: {
        size: cacheStats.size,
        keys: cacheStats.keys.length,
      },
    };

    if (rateLimitStatus) {
      response.rateLimit = {
        count: rateLimitStatus.count,
        limit: rateLimitStatus.limit,
        remaining: rateLimitStatus.limit - rateLimitStatus.count,
        resetAt: new Date(rateLimitStatus.resetAt).toISOString(),
      };
    }

    if (userCampaigns.length > 0) {
      response.recentCampaigns = userCampaigns.map(c => ({
        id: c.id,
        industry: c.industry,
        location: c.location,
        status: c.status,
        createdAt: c.createdAt,
        totalCopies: c.totalCopies,
        selectedCount: c.selectedCount,
      }));
    }

    apiLogger.info({ userId }, '광고 통계 조회 성공');
    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '광고 통계 조회 실패');
    return NextResponse.json(
      { error: '통계 조회 실패' },
      { status: 500 }
    );
  }
}