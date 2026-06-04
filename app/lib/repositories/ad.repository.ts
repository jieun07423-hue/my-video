import db from '../db';
import { dbLogger } from '../logger';

export interface CreateAdCampaignInput {
  userId?: string;
  industry: string;
  location: string;
  target?: string;
  goal?: string;
  strengths?: string;
  keywords: string[];
  tone?: string;
  telegramChatId?: string;
}

export interface CreateAdCopyInput {
  campaignId: string;
  content: string;
  rank: number;
  quality?: 'high' | 'medium' | 'low';
  isSelected?: boolean;
  filterStage?: string;
  charCount?: number;
  hasCta?: boolean;
}

export interface AdCampaignSearchOptions {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class AdRepository {
  async createCampaign(data: CreateAdCampaignInput) {
    dbLogger.info({ industry: data.industry, location: data.location }, '광고 캠페인 생성');

    const campaign = await db.adCampaign.create({
      data: {
        industry: data.industry,
        location: data.location,
        target: data.target || null,
        goal: data.goal || null,
        strengths: data.strengths || null,
        keywords: data.keywords,
        tone: data.tone || null,
        userId: data.userId || null,
        telegramChatId: data.telegramChatId || null,
        status: 'pending',
        totalCopies: 0,
        selectedCount: 0,
      },
    });

    dbLogger.info({ campaignId: campaign.id }, '광고 캠페인 생성 완료');
    return campaign;
  }

  async updateCampaignStatus(
    campaignId: string,
    status: 'pending' | 'generating' | 'completed' | 'failed',
    options?: {
      totalCopies?: number;
      selectedCount?: number;
      errorMessage?: string;
      telegramMessageId?: string;
    }
  ) {
    dbLogger.info({ campaignId, status }, '광고 캠페인 상태 업데이트');

    const updateData: Record<string, unknown> = {
      status,
    };

    if (options?.totalCopies !== undefined) updateData.totalCopies = options.totalCopies;
    if (options?.selectedCount !== undefined) updateData.selectedCount = options.selectedCount;
    if (options?.errorMessage !== undefined) updateData.errorMessage = options.errorMessage;
    if (options?.telegramMessageId !== undefined) updateData.telegramMessageId = options.telegramMessageId;
    if (status === 'completed') updateData.completedAt = new Date();

    const campaign = await db.adCampaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    return campaign;
  }

  async createCopies(data: CreateAdCopyInput[]) {
    dbLogger.info({ count: data.length, campaignId: data[0]?.campaignId }, '광고 카피 대량 생성');

    const result = await db.adCopy.createMany({
      skipDuplicates: true,
      data: data.map(copy => ({
        campaignId: copy.campaignId,
        content: copy.content,
        rank: copy.rank,
        quality: copy.quality || null,
        isSelected: copy.isSelected || false,
        filterStage: copy.filterStage || null,
        charCount: copy.charCount || copy.content.length,
        hasCta: copy.hasCta || false,
      })),
    });

    dbLogger.info({ created: result.count }, '광고 카피 생성 완료');
    return result;
  }

  async findCampaignById(campaignId: string) {
    return await db.adCampaign.findUnique({
      where: { id: campaignId },
      include: { copies: true },
    });
  }

  async findCampaignsByUserId(userId: string, options?: { limit?: number }) {
    return await db.adCampaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
      include: { copies: { where: { isSelected: true } } },
    });
  }

  async search(options: AdCampaignSearchOptions) {
    const { userId, status, page = 1, limit = 20 } = options;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.adCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { copies: { where: { isSelected: true } } },
      }),
      db.adCampaign.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateBlogPostInfo(campaignId: string, blogPostUrl: string) {
    dbLogger.info({ campaignId, blogPostUrl }, '블로그 포스팅 정보 업데이트');

    return await db.adCampaign.update({
      where: { id: campaignId },
      data: {
        blogPosted: true,
        blogPostUrl,
      },
    });
  }

  async getStats() {
    const [total, completed, failed, pending] = await Promise.all([
      db.adCampaign.count(),
      db.adCampaign.count({ where: { status: 'completed' } }),
      db.adCampaign.count({ where: { status: 'failed' } }),
      db.adCampaign.count({ where: { status: 'pending' } }),
    ]);

    return { total, completed, failed, pending };
  }
}

export const adRepository = new AdRepository();