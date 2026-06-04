import { NextRequest, NextResponse } from 'next/server';
import { adRepository, CreateAdCampaignInput } from '@/lib/repositories/ad.repository';
import { adGeneratorService } from '@/lib/services/ad-generator.service';
import { apiLogger } from '@/lib/logger';

interface AdGenerateBody {
  industry: string;
  location: string;
  target?: string;
  goal?: string;
  strengths?: string;
  keywords?: string[];
  tone?: string;
  userId?: string;
  telegramChatId?: string;
  postToBlog?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const userId = searchParams.get('userId') || undefined;
    const status = searchParams.get('status') || undefined;

    const result = await adRepository.search({
      page,
      limit,
      userId,
      status,
    });

    apiLogger.info({ page, limit, count: result.items.length, total: result.total }, '광고 캠페인 목록 조회 성공');
    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '광고 캠페인 목록 조회 실패');
    return NextResponse.json(
      { error: '조회 실패', message: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AdGenerateBody = await request.json();

    const { industry, location, keywords = [] } = body;

    if (!industry || !location) {
      return NextResponse.json(
        { error: '업종과 지역은 필수입니다' },
        { status: 400 }
      );
    }

    const campaignInput: CreateAdCampaignInput = {
      industry,
      location,
      target: body.target,
      goal: body.goal,
      strengths: body.strengths,
      keywords,
      tone: body.tone,
      userId: body.userId,
      telegramChatId: body.telegramChatId,
    };

    const campaign = await adRepository.createCampaign(campaignInput);

    await adRepository.updateCampaignStatus(campaign.id, 'generating');

    const generateResult = await adGeneratorService.generate({
      industry,
      location,
      target: body.target,
      goal: body.goal,
      strengths: body.strengths,
      keywords,
      tone: body.tone,
    });

    const allCopies = [
      ...generateResult.initialCopies.map((content, idx) => ({
        campaignId: campaign.id,
        content,
        rank: idx + 1,
        filterStage: 'initial',
      })),
      ...generateResult.top5Copies.map((content, idx) => ({
        campaignId: campaign.id,
        content,
        rank: idx + 1,
        filterStage: 'filtered',
      })),
      ...generateResult.finalCopies.map((content, idx) => ({
        campaignId: campaign.id,
        content,
        rank: idx + 1,
        filterStage: 'final',
        isSelected: true,
      })),
    ];

    await adRepository.createCopies(allCopies);

    await adRepository.updateCampaignStatus(campaign.id, 'completed', {
      totalCopies: generateResult.initialCopies.length,
      selectedCount: generateResult.finalCopies.length,
    });

    const finalCampaign = await adRepository.findCampaignById(campaign.id);

    apiLogger.info({
      campaignId: campaign.id,
      totalCopies: generateResult.initialCopies.length,
      selectedCount: generateResult.finalCopies.length,
      duration: generateResult.totalDuration,
    }, '광고 생성 완료');

    return NextResponse.json({
      campaign: finalCampaign,
      initialCopies: generateResult.initialCopies,
      top5Copies: generateResult.top5Copies,
      finalCopies: generateResult.finalCopies,
      duration: generateResult.totalDuration,
    }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '광고 생성 실패');
    return NextResponse.json(
      { error: '광고 생성 실패', message: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    );
  }
}