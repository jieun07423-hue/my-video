import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdRepository } from '../ad.repository';
import { resetMockData } from '@/lib/db';

describe('AdRepository', () => {
  let repository: AdRepository;

  beforeEach(() => {
    resetMockData();
    repository = new AdRepository();
  });

  describe('createCampaign', () => {
    it('광고 캠페인을 생성해야 한다', async () => {
      const campaignData = {
        industry: '치과',
        targetRegion: '서울',
        budget: 1000000,
        period: { start: new Date(), end: new Date() },
      };
      const campaign = await repository.createCampaign(campaignData);

      expect(campaign).toBeDefined();
      expect(campaign.industry).toBe('치과');
      expect(campaign.status).toBe('pending');
    });
  });

  describe('updateCampaignStatus', () => {
    it('캠페인 상태를 업데이트해야 한다', async () => {
      const campaign = await repository.createCampaign({
        industry: '치과',
        targetRegion: '서울',
        budget: 1000000,
        period: { start: new Date(), end: new Date() },
      });
      const updated = await repository.updateCampaignStatus(campaign.id, 'completed', {
        totalCopies: 10,
        totalSpend: 500000,
      });

      expect(updated).toBeDefined();
      expect(updated.status).toBe('completed');
      expect(updated.totalCopies).toBe(10);
    });
  });

  describe('createCopies', () => {
    it('광고 카피를 대량으로 생성해야 한다', async () => {
      const campaign = await repository.createCampaign({
        industry: '치과',
        targetRegion: '서울',
        budget: 1000000,
        period: { start: new Date(), end: new Date() },
      });
      const copiesData = [
        { campaignId: campaign.id, content: '카피 1', rank: 1 },
        { campaignId: campaign.id, content: '카피 2', rank: 2 },
      ];
      const result = await repository.createCopies(copiesData);

      expect(result).toBeDefined();
      expect(result.count).toBe(2);
    });
  });

  describe('findCampaignById', () => {
    it('ID로 캠페인을 조회해야 한다', async () => {
      const campaign = await repository.createCampaign({
        industry: '치과',
        targetRegion: '서울',
        budget: 1000000,
        period: { start: new Date(), end: new Date() },
      });
      const found = await repository.findCampaignById(campaign.id);

      expect(found).toBeDefined();
      expect(found?.industry).toBe('치과');
    });
  });

  describe('getStats', () => {
    it('캠페인 통계 정보를 반환해야 한다', async () => {
      const result = await repository.getStats();

      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(typeof result.completed).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(typeof result.pending).toBe('number');
    });
  });
});

