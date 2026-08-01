import { Prisma } from '@prisma/client';
import { syncLogger, dbLogger } from '@/lib/logger';
import db from '@/lib/db';
import { validationService, ValidationResult } from './validation.service';
import { statisticService } from './statistic.service';
import { eventPublisher } from './event-publisher';

export interface EnrichmentSource {
  name: string;
  priority: number;
  enabled: boolean;
  rateLimit: number;
  config: Record<string, unknown>;
}

export interface EnrichmentInput {
  bizesId: string;
  name?: string;
  roadNameAddress?: string;
  lotNumberAddress?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  businessCode?: string;
  businessName?: string;
  indsLclsCd?: string;
  indsLclsNm?: string;
  indsMclsCd?: string;
  indsMclsNm?: string;
  indsSclsCd?: string;
  indsSclsNm?: string;
  openTime?: string;
  closeTime?: string;
  holidayInfo?: string;
  parkingInfo?: string;
  menuInfo?: string;
  priceRange?: string;
  capacity?: number;
  facilityInfo?: string;
  accessibility?: string;
  deliveryInfo?: string;
  takeoutInfo?: string;
  reservationInfo?: string;
  websiteUrl?: string;
  blogUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  kakaoPlaceUrl?: string;
  naverPlaceUrl?: string;
  reviewCount?: number;
  averageRating?: number;
  reviewKeywords?: string[];
  mainImageUrl?: string;
  imageUrls?: string[];
  thumbnailUrl?: string;
}

export interface EnrichmentResult {
  success: boolean;
  bizesId: string;
  source: string;
  fieldsEnriched: string[];
  fieldsFailed: string[];
  enrichmentScore: number;
  data: Record<string, unknown>;
  errors: string[];
  durationMs: number;
}

export interface BulkEnrichmentOptions {
  bizesIds: string[];
  sources?: string[];
  force?: boolean;
  batchSize?: number;
  concurrency?: number;
}

export interface BulkEnrichmentResult {
  total: number;
  succeeded: number;
  failed: number;
  partial: number;
  results: EnrichmentResult[];
  durationMs: number;
}

const DEFAULT_SOURCES: EnrichmentSource[] = [
  {
    name: 'kakao-local',
    priority: 1,
    enabled: true,
    rateLimit: 300,
    config: { apiKey: process.env.KAKAO_API_KEY },
  },
  {
    name: 'naver-place',
    priority: 2,
    enabled: true,
    rateLimit: 200,
    config: { clientId: process.env.NAVER_CLIENT_ID, clientSecret: process.env.NAVER_CLIENT_SECRET },
  },
  {
    name: 'public-data-portal',
    priority: 3,
    enabled: true,
    rateLimit: 100,
    config: { serviceKey: process.env.DATA_GO_KR_SERVICE_KEY },
  },
  {
    name: 'google-places',
    priority: 4,
    enabled: false,
    rateLimit: 1000,
    config: { apiKey: process.env.GOOGLE_PLACES_API_KEY },
  },
];

export class BusinessEnrichmentService {
  private sources: EnrichmentSource[] = DEFAULT_SOURCES;
  private requestCounts = new Map<string, { count: number; resetAt: number }>();

  async enrichBusiness(bizesId: string, options: {
    sources?: string[];
    force?: boolean;
    validateInput?: boolean;
  } = {}): Promise<EnrichmentResult> {
    const { sources, force = false, validateInput = true } = options;
    const startTime = Date.now();
    const errors: string[] = [];
    const fieldsEnriched: string[] = [];
    const fieldsFailed: string[] = [];

    try {
      const business = await db.business.findUnique({
        where: { bizesId },
      });

      if (!business) {
        return {
          success: false,
          bizesId,
          source: 'none',
          fieldsEnriched: [],
          fieldsFailed: [],
          enrichmentScore: 0,
          data: {},
          errors: ['사업체를 찾을 수 없습니다'],
          durationMs: Date.now() - startTime,
        };
      }

      if (!force && business.enrichmentStatus === 'completed' && business.enrichmentScore && Number(business.enrichmentScore) >= 80) {
        syncLogger.info({ bizesId, score: business.enrichmentScore }, '이미 충분히 보강된 사업체 건너뜀');
        return {
          success: true,
          bizesId,
          source: 'cached',
          fieldsEnriched: [],
          fieldsFailed: [],
          enrichmentScore: Number(business.enrichmentScore),
          data: business.enrichmentData as Record<string, unknown> || {},
          errors: [],
          durationMs: Date.now() - startTime,
        };
      }

      await db.business.update({
        where: { bizesId },
        data: { enrichmentStatus: 'in_progress', lastEnrichedAt: new Date() },
      });

      const activeSources = this.sources
        .filter(s => s.enabled && (!sources || sources.includes(s.name)))
        .sort((a, b) => a.priority - b.priority);

      const allData: Record<string, unknown> = {};

      for (const source of activeSources) {
        if (!this.checkRateLimit(source)) {
          errors.push(`${source.name}: 속도 제한 초과`);
          continue;
        }

        try {
          const sourceData = await this.fetchFromSource(source, business);
          
          if (sourceData && Object.keys(sourceData).length > 0) {
            for (const [key, value] of Object.entries(sourceData)) {
              if (value !== null && value !== undefined && value !== '') {
                allData[key] = value;
                fieldsEnriched.push(key);
              }
            }
            this.incrementRateLimit(source);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`${source.name}: ${errorMsg}`);
          fieldsFailed.push(source.name);
          syncLogger.error({ source: source.name, bizesId, error: errorMsg }, '보강 소스 오류');
        }
      }

      if (validateInput) {
        const validation = validationService.validateBusinessInput({
          ...business,
          ...allData,
        } as any);
        
        if (!validation.success) {
          for (const err of validation.errors) {
            errors.push(`검증 실패 - ${err.field}: ${err.message}`);
          }
        }
      }

      const enrichmentScore = this.calculateEnrichmentScore(business, allData);
      
      const updateData: any = {
        ...allData,
        enrichmentStatus: errors.length === 0 ? 'completed' : fieldsEnriched.length > 0 ? 'partial' : 'failed',
        enrichmentScore,
        lastEnrichedAt: new Date(),
        enrichmentData: allData,
      };

      await db.business.update({
        where: { bizesId },
        data: updateData,
      });

await statisticService.incrementCounter('enrichment:total', 1);
      if (errors.length === 0) {
        await statisticService.incrementCounter('enrichment:success', 1);
      } else if (fieldsEnriched.length > 0) {
        await statisticService.incrementCounter('enrichment:partial', 1);
      } else {
        await statisticService.incrementCounter('enrichment:failed', 1);
      }

      await eventPublisher.publishBusinessUpdated(bizesId, business.name, {
        enrichmentStatus: { from: business.enrichmentStatus, to: updateData.enrichmentStatus },
        enrichmentScore: { from: Number(business.enrichmentScore), to: enrichmentScore },
      });

      const result: EnrichmentResult = fieldsEnriched.length > 0
        ? {
            success: true,
            bizesId,
            source: activeSources.map(s => s.name).join(','),
            fieldsEnriched,
            fieldsFailed,
            enrichmentScore,
            data: allData,
            errors,
            durationMs: Date.now() - startTime,
          }
        : {
            success: false,
            bizesId,
            source: 'none',
            fieldsEnriched: [],
            fieldsFailed,
            enrichmentScore: 0,
            data: {},
            errors: errors.length > 0 ? errors : ['보강된 데이터가 없습니다'],
            durationMs: Date.now() - startTime,
          };

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      syncLogger.error({ bizesId, error: errorMsg }, '비즈니스 보강 실패');
      
      await db.business.update({
        where: { bizesId },
        data: { enrichmentStatus: 'failed' },
      }).catch(() => {});

      return {
        success: false,
        bizesId,
        source: 'error',
        fieldsEnriched: [],
        fieldsFailed: [],
        enrichmentScore: 0,
        data: {},
        errors: [errorMsg],
        durationMs: Date.now() - startTime,
      };
    }
  }

  async enrichBulk(options: BulkEnrichmentOptions): Promise<BulkEnrichmentResult> {
    const { bizesIds, sources, force = false, batchSize = 50, concurrency = 3 } = options;
    const startTime = Date.now();
    const results: EnrichmentResult[] = [];
    let succeeded = 0;
    let failed = 0;
    let partial = 0;

    for (let i = 0; i < bizesIds.length; i += batchSize) {
      const batch = bizesIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(bizesId => 
        this.enrichBusiness(bizesId, { sources, force })
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) {
            if (result.value.fieldsFailed.length > 0) {
              partial++;
            } else {
              succeeded++;
            }
          } else {
            failed++;
          }
        } else {
          results.push({
            success: false,
            bizesId: batch[results.length % batch.length],
            source: 'error',
            fieldsEnriched: [],
            fieldsFailed: [],
            enrichmentScore: 0,
            data: {},
            errors: [result.reason instanceof Error ? result.reason.message : String(result.reason)],
            durationMs: 0,
          });
          failed++;
        }
      }
    }

    return {
      total: bizesIds.length,
      succeeded,
      failed,
      partial,
      results,
      durationMs: Date.now() - startTime,
    };
  }

  async enrichByArea(area: string, options: { sources?: string[]; force?: boolean; limit?: number } = {}): Promise<BulkEnrichmentResult> {
    const businesses = await db.business.findMany({
      where: {
        OR: [
          { roadNameAddress: { contains: area, mode: 'insensitive' } },
          { lotNumberAddress: { contains: area, mode: 'insensitive' } },
        ],
        enrichmentStatus: options.force ? undefined : { not: 'completed' },
      },
      take: options.limit || 1000,
      select: { bizesId: true },
    });

    return this.enrichBulk({
      bizesIds: businesses.map(b => b.bizesId),
      sources: options.sources,
      force: options.force,
    });
  }

  async enrichByCategory(categoryCode: string, options: { sources?: string[]; force?: boolean; limit?: number } = {}): Promise<BulkEnrichmentResult> {
    const businesses = await db.business.findMany({
      where: {
        businessCode: categoryCode,
        enrichmentStatus: options.force ? undefined : { not: 'completed' },
      },
      take: options.limit || 1000,
      select: { bizesId: true },
    });

    return this.enrichBulk({
      bizesIds: businesses.map(b => b.bizesId),
      sources: options.sources,
      force: options.force,
    });
  }

  private async fetchFromSource(source: EnrichmentSource, business: any): Promise<Record<string, unknown> | null> {
    switch (source.name) {
      case 'kakao-local':
        return this.fetchFromKakaoLocal(source, business);
      case 'naver-place':
        return this.fetchFromNaverPlace(source, business);
      case 'public-data-portal':
        return this.fetchFromPublicDataPortal(source, business);
      case 'google-places':
        return this.fetchFromGooglePlaces(source, business);
      default:
        return null;
    }
  }

  private async fetchFromKakaoLocal(source: EnrichmentSource, business: any): Promise<Record<string, unknown> | null> {
    if (!source.config.apiKey) return null;

    try {
      const query = encodeURIComponent(`${business.name} ${business.roadNameAddress || business.lotNumberAddress || ''}`);
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${query}&page=1&size=5`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `KakaoAK ${source.config.apiKey}`,
        },
      });

      if (!response.ok) {
        syncLogger.warn({ status: response.status }, '카카오 로컬 API 오류');
        return null;
      }

      const data = await response.json();
      
      if (data.documents && data.documents.length > 0) {
        const place = data.documents[0];
        return {
          phone: place.phone || null,
          latitude: place.y ? parseFloat(place.y) : null,
          longitude: place.x ? parseFloat(place.x) : null,
          roadNameAddress: place.road_address_name || null,
          lotNumberAddress: place.address_name || null,
          kakaoPlaceUrl: place.place_url || null,
          mainImageUrl: place.thumbnail || null,
          enrichmentSource: 'kakao-local',
        };
      }

      return null;
    } catch (error) {
      syncLogger.error({ error }, '카카오 로컬 보강 실패');
      return null;
    }
  }

  private async fetchFromNaverPlace(source: EnrichmentSource, business: any): Promise<Record<string, unknown> | null> {
    if (!source.config.clientId || !source.config.clientSecret) return null;

    try {
      const query = encodeURIComponent(`${business.name} ${business.roadNameAddress || business.lotNumberAddress || ''}`);
      const url = `https://openapi.naver.com/v1/search/local.json?query=${query}&display=5&sort=random`;
      
      const response = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': source.config.clientId as string,
          'X-Naver-Client-Secret': source.config.clientSecret as string,
        },
      });

      if (!response.ok) {
        syncLogger.warn({ status: response.status }, '네이버 플레이스 API 오류');
        return null;
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const place = data.items[0];
        return {
          phone: place.tel || null,
          roadNameAddress: place.roadAddress || null,
          lotNumberAddress: place.address || null,
          naverPlaceUrl: place.link || null,
          blogUrl: place.bloglink || null,
          enrichmentSource: 'naver-place',
        };
      }

      return null;
    } catch (error) {
      syncLogger.error({ error }, '네이버 플레이스 보강 실패');
      return null;
    }
  }

  private async fetchFromPublicDataPortal(source: EnrichmentSource, business: any): Promise<Record<string, unknown> | null> {
    if (!source.config.serviceKey) return null;

    try {
      const url = new URL('http://apis.data.go.kr/B550598/smppKiCertInfo/getKiCertInfo');
      url.searchParams.set('serviceKey', source.config.serviceKey as string);
      url.searchParams.set('bizesId', business.bizesId);
      url.searchParams.set('numOfRows', '1');

      const response = await fetch(url.toString());
      
      if (!response.ok) return null;

      const text = await response.text();
      // XML 파싱 로직은 public-data-portal.service.ts 참고
      
      return { enrichmentSource: 'public-data-portal' };
    } catch (error) {
      return null;
    }
  }

  private async fetchFromGooglePlaces(source: EnrichmentSource, business: any): Promise<Record<string, unknown> | null> {
    if (!source.config.apiKey) return null;

    try {
      const query = encodeURIComponent(`${business.name} ${business.roadNameAddress || business.lotNumberAddress || ''}`);
      const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=name,formatted_address,geometry,opening_hours,price_level,rating,reviews,photos,website,international_phone_number&key=${source.config.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) return null;

      const data = await response.json();
      
      if (data.candidates && data.candidates.length > 0) {
        const place = data.candidates[0];
        return {
          phone: place.international_phone_number || null,
          latitude: place.geometry?.location?.lat || null,
          longitude: place.geometry?.location?.lng || null,
          roadNameAddress: place.formatted_address || null,
          websiteUrl: place.website || null,
          averageRating: place.rating || null,
          reviewCount: place.user_ratings_total || 0,
          openingHours: place.opening_hours?.weekday_text || null,
          priceRange: place.price_level ? this.formatPriceLevel(place.price_level) : null,
          mainImageUrl: place.photos?.[0] ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${source.config.apiKey}` : null,
          enrichmentSource: 'google-places',
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private formatPriceLevel(level: number): string {
    const levels = ['무료', '저렴', '보통', '비쌈', '매우 비쌈'];
    return levels[level] || '알 수 없음';
  }

  private checkRateLimit(source: EnrichmentSource): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(source.name);
    
    if (!record || now > record.resetAt) {
      this.requestCounts.set(source.name, { count: 1, resetAt: now + 60000 });
      return true;
    }
    
    return record.count < source.rateLimit;
  }

  private incrementRateLimit(source: EnrichmentSource): void {
    const record = this.requestCounts.get(source.name);
    if (record) {
      record.count++;
    }
  }

  private calculateEnrichmentScore(business: any, newData: Record<string, unknown>): number {
    const enrichmentFields = [
      'phone', 'latitude', 'longitude', 'roadNameAddress', 'lotNumberAddress',
      'openTime', 'closeTime', 'holidayInfo', 'parkingInfo', 'menuInfo', 'priceRange',
      'capacity', 'facilityInfo', 'accessibility', 'deliveryInfo', 'takeoutInfo', 'reservationInfo',
      'websiteUrl', 'blogUrl', 'instagramUrl', 'facebookUrl', 'kakaoPlaceUrl', 'naverPlaceUrl',
      'reviewCount', 'averageRating', 'reviewKeywords',
      'mainImageUrl', 'imageUrls', 'thumbnailUrl',
    ];

    let score = 0;
    let maxScore = 0;

    for (const field of enrichmentFields) {
      maxScore += 10;
      const existingValue = business[field];
      const newValue = newData[field];
      
      if (newValue !== null && newValue !== undefined && newValue !== '') {
        if (!existingValue || existingValue === '') {
          score += 10;
        } else {
          score += 5;
        }
      }
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  addSource(source: EnrichmentSource): void {
    const existing = this.sources.findIndex(s => s.name === source.name);
    if (existing >= 0) {
      this.sources[existing] = source;
    } else {
      this.sources.push(source);
      this.sources.sort((a, b) => a.priority - b.priority);
    }
  }

  removeSource(name: string): void {
    this.sources = this.sources.filter(s => s.name !== name);
  }

  getSources(): EnrichmentSource[] {
    return [...this.sources];
  }

  getSource(name: string): EnrichmentSource | undefined {
    return this.sources.find(s => s.name === name);
  }

  async getEnrichmentStatus(bizesId: string): Promise<{
    bizesId: string;
    status: string;
    score: number;
    source: string | null;
    lastEnrichedAt: Date | null;
    fieldsEnriched: string[];
    fieldsMissing: string[];
  } | null> {
    const business = await db.business.findUnique({
      where: { bizesId },
      select: {
        bizesId: true,
        enrichmentStatus: true,
        enrichmentScore: true,
        enrichmentSource: true,
        lastEnrichedAt: true,
        enrichmentData: true,
      },
    });

    if (!business) return null;

    const enrichmentFields = [
      'phone', 'latitude', 'longitude', 'roadNameAddress', 'lotNumberAddress',
      'openTime', 'closeTime', 'holidayInfo', 'parkingInfo', 'menuInfo', 'priceRange',
      'capacity', 'facilityInfo', 'accessibility', 'deliveryInfo', 'takeoutInfo', 'reservationInfo',
      'websiteUrl', 'blogUrl', 'instagramUrl', 'facebookUrl', 'kakaoPlaceUrl', 'naverPlaceUrl',
      'reviewCount', 'averageRating', 'reviewKeywords',
      'mainImageUrl', 'imageUrls', 'thumbnailUrl',
    ];

    const enrichedData = business.enrichmentData as Record<string, unknown> || {};
    const fieldsEnriched = enrichmentFields.filter(f => enrichedData[f] !== null && enrichedData[f] !== undefined && enrichedData[f] !== '');
    const fieldsMissing = enrichmentFields.filter(f => !enrichedData[f] || enrichedData[f] === '' || enrichedData[f] === undefined);

    return {
      bizesId: business.bizesId,
      status: business.enrichmentStatus,
      score: Number(business.enrichmentScore) || 0,
      source: business.enrichmentSource,
      lastEnrichedAt: business.lastEnrichedAt,
      fieldsEnriched,
      fieldsMissing,
    };
  }

  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    averageScore: number;
    sourcesUsed: Record<string, number>;
    scoreDistribution: Record<string, number>;
  }> {
    const [total, byStatus, avgScore, sourcesUsed, scoreDist] = await Promise.all([
      db.business.count(),
      db.business.groupBy({ by: ['enrichmentStatus'], _count: true }),
      db.business.aggregate({ _avg: { enrichmentScore: true } }),
      db.business.groupBy({ by: ['enrichmentSource'], _count: true, where: { enrichmentSource: { not: null } } }),
      db.business.groupBy({
        by: ['enrichmentScore'],
        _count: true,
        where: { enrichmentScore: { not: null } },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const item of byStatus) {
      statusMap[item.enrichmentStatus] = item._count;
    }

    const sourceMap: Record<string, number> = {};
    for (const item of sourcesUsed) {
      if (item.enrichmentSource) {
        sourceMap[item.enrichmentSource] = item._count;
      }
    }

    const scoreBuckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    for (const item of scoreDist) {
      const score = Number(item.enrichmentScore) || 0;
      if (score <= 20) scoreBuckets['0-20'] += item._count;
      else if (score <= 40) scoreBuckets['21-40'] += item._count;
      else if (score <= 60) scoreBuckets['41-60'] += item._count;
      else if (score <= 80) scoreBuckets['61-80'] += item._count;
      else scoreBuckets['81-100'] += item._count;
    }

    return {
      total,
      byStatus: statusMap,
      averageScore: Math.round(Number(avgScore._avg.enrichmentScore) || 0),
      sourcesUsed: sourceMap,
      scoreDistribution: scoreBuckets,
    };
  }

  async getEnrichmentResults(options: {
    limit?: number;
    offset?: number;
    status?: string;
    orderBy?: 'score' | 'date';
    orderDir?: 'asc' | 'desc';
  } = {}): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { limit = 50, offset = 0, status, orderBy = 'date', orderDir = 'desc' } = options;

    const where: any = {};
    if (status) where.enrichmentStatus = status;

    const [items, total] = await Promise.all([
      db.business.findMany({
        where,
        select: {
          bizesId: true,
          name: true,
          enrichmentStatus: true,
          enrichmentScore: true,
          enrichmentSource: true,
          lastEnrichedAt: true,
          updatedAt: true,
        },
        orderBy: orderBy === 'score' ? { enrichmentScore: orderDir } : { lastEnrichedAt: orderDir },
        skip: offset,
        take: limit,
      }),
      db.business.count({ where }),
    ]);

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    };
  }

  async getBusinessesNeedingEnrichment(scoreThreshold: number = 80, limit: number = 100): Promise<any[]> {
    return db.business.findMany({
      where: {
        OR: [
          { enrichmentStatus: 'pending' },
          { enrichmentStatus: 'failed' },
          { enrichmentStatus: 'partial' },
          { enrichmentScore: { lt: scoreThreshold } },
        ],
      },
      select: {
        bizesId: true,
        name: true,
        roadNameAddress: true,
        lotNumberAddress: true,
        phone: true,
        latitude: true,
        longitude: true,
        businessCode: true,
        businessName: true,
        indsLclsCd: true,
        indsLclsNm: true,
        indsMclsCd: true,
        indsMclsNm: true,
        indsSclsCd: true,
        indsSclsNm: true,
        enrichmentStatus: true,
        enrichmentScore: true,
        lastEnrichedAt: true,
      },
      orderBy: { enrichmentScore: 'asc' },
      take: limit,
    });
  }

  async resetEnrichmentStatus(bizesIds: string[]): Promise<number> {
    const result = await db.business.updateMany({
      where: { bizesId: { in: bizesIds } },
      data: {
        enrichmentStatus: 'pending',
        enrichmentScore: null,
        enrichmentSource: null,
        lastEnrichedAt: null,
        enrichmentData: Prisma.DbNull,
      },
    });
    dbLogger.info({ count: result.count }, '보강 상태 초기화 완료');
    return result.count;
  }

  scheduleEnrichment(cron: string, options: { sources?: string[]; force?: boolean; batchSize?: number } = {}): string {
    const jobId = `enrichment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    // 크론 스케줄링 로직은 추후 worker에서 구현
    syncLogger.info({ jobId, cron, options }, '보강 스케줄 등록');
    return jobId;
  }

  cancelSchedule(jobId: string): void {
    syncLogger.info({ jobId }, '보강 스케줄 취소');
  }
}

export const businessEnrichmentService = new BusinessEnrichmentService();