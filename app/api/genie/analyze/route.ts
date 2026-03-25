import { NextRequest, NextResponse } from 'next/server';

export interface AnalyzeRequest {
  type: 'date' | 'region' | 'industry' | 'trend';
  date?: string;
  regionCode?: string;
  industryCode?: string;
  startDate?: string;
  endDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { type, date, regionCode, industryCode, startDate, endDate } = body;

    // 지연 imports - 지니 API 클라이언트
    const { 
      fetchBusinessesByDate, 
      fetchByIndustry, 
      fetchByDistrict, 
      fetchTrendByPeriod,
      fetchIndustryCategories,
      fetchRegions 
    } = await import('@/lib/api/public-data-client');

    let result;

    switch (type) {
      case 'date':
        if (!date) {
          return NextResponse.json({ error: '날짜가 필요합니다' }, { status: 400 });
        }
        result = await fetchBusinessesByDate(date, 1, 100);
        break;

      case 'region':
        if (!regionCode) {
          return NextResponse.json({ error: '지역코드가 필요합니다' }, { status: 400 });
        }
        result = await fetchByDistrict(regionCode, 1, 100);
        break;

      case 'industry':
        if (!industryCode) {
          return NextResponse.json({ error: '업종코드가 필요합니다' }, { status: 400 });
        }
        result = await fetchByIndustry(industryCode, 1, 100);
        break;

      case 'trend':
        if (!startDate || !endDate) {
          return NextResponse.json({ error: '시작일과 종료일이 필요합니다' }, { status: 400 });
        }
        result = await fetchTrendByPeriod(startDate, endDate);
        break;

      default:
        return NextResponse.json({ error: '유효하지 않은 분석 타입입니다' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('분석 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { fetchIndustryCategories, fetchRegions } = await import('@/lib/api/public-data-client');

  const [categories, regions] = await Promise.all([
    fetchIndustryCategories(),
    fetchRegions(),
  ]);

  return NextResponse.json({
    categories,
    regions,
  });
}
