import { NextRequest, NextResponse } from 'next/server';
import { fetchPermitList } from '@/lib/api/seoul-data-client';
import { seoulPermitRepository } from '@/lib/repositories/seoul-permit.repository';
import { syncLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const serviceCode = body.serviceCode || 'LOCALDATA_031001';
    const perPage = body.perPage || 1000;

    syncLogger.info({ serviceCode, perPage }, 'Starting Seoul permit sync');

    const result = await fetchPermitList(serviceCode, 1, perPage);
    
    if (!result || !result[serviceCode]) {
      syncLogger.error({ serviceCode }, 'Failed to fetch from Seoul API');
      return NextResponse.json({ error: 'API 호출 실패' }, { status: 500 });
    }

    const serviceData = result[serviceCode];
    const items = serviceData.row || [];
    const totalCount = serviceData.list_total_count || 0;

    const permitData = items.map((item: any) => ({
      manageNo: item.MGTNO,
      bplcNm: item.BPLCNM,
      bpNm: item.BPNM,
      bizcnd: item.BIZCND,
      locplcd: item.LOCPLCD,
      rdnWhladdr: item.RDNWHLADDR,
      siteTel: item.SITETEL,
      apvPermYmd: item.APVPERMYMD,
      apvCancelYmd: item.APVCANCELYMD,
      trdStateGbn: item.TRDSTATEGBN,
      trdStateNm: item.TRDSTATENM,
      dtlStateGbn: item.DTLSTATEGBN,
      dtlStateNm: item.DTLSTATENM,
      dcbyYmd: item.DCBYMD,
      sitePostNo: item.SITEPOSTNO,
      xCoord: item.X ? parseFloat(item.X.trim()) : null,
      yCoord: item.Y ? parseFloat(item.Y.trim()) : null,
      serviceCode,
    }));

    const inserted = await seoulPermitRepository.upsertMany(permitData);

    syncLogger.info({ 
      serviceCode, 
      total: totalCount, 
      inserted 
    }, 'Seoul permit sync completed');

    return NextResponse.json({
      success: true,
      serviceCode,
      totalCount,
      inserted,
    });
  } catch (error) {
    syncLogger.error({ error: error.message }, 'Seoul permit sync failed');
    return NextResponse.json({ error: '동기화 실패' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceCode = searchParams.get('serviceCode') || undefined;
    const trdStateNm = searchParams.get('trdStateNm') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await seoulPermitRepository.findMany({
      serviceCode,
      trdStateNm,
      search,
      page,
      limit,
    });

    const stats = await seoulPermitRepository.getStats();

    return NextResponse.json({
      items: result.items,
      total: result.total,
      page,
      limit,
      stats,
    });
  } catch (error) {
    syncLogger.error({ error: error.message }, 'Failed to fetch Seoul permits');
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}