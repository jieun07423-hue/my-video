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
    const items: any[] = serviceData.row || [];
    const totalCount = serviceData.list_total_count || 0;

    const permitData = items.map((item: any) => ({
      manageNo: String(item.MGTNO || ''),
      bplcNm: String(item.BPLCNM || ''),
      bpNm: String(item.BPNM || ''),
      bizcnd: String(item.BIZCND || ''),
      locplcd: String(item.LOCPLCD || ''),
      rdnWhladdr: String(item.RDNWHLADDR || ''),
      siteTel: String(item.SITETEL || ''),
      apvPermYmd: String(item.APVPERMYMD || ''),
      apvCancelYmd: String(item.APVCANCELYMD || ''),
      trdStateGbn: String(item.TRDSTATEGBN || ''),
      trdStateNm: String(item.TRDSTATENM || ''),
      dtlStateGbn: String(item.DTLSTATEGBN || ''),
      dtlStateNm: String(item.DTLSTATENM || ''),
      dcbyYmd: String(item.DCBYMD || ''),
      sitePostNo: String(item.SITEPOSTNO || ''),
      xCoord: item.X ? parseFloat(String(item.X).trim()) : null,
      yCoord: item.Y ? parseFloat(String(item.Y).trim()) : null,
      serviceCode,
    }));

    const inserted = await seoulPermitRepository.upsertMany(permitData as any);

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
    syncLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Seoul permit sync failed');
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
    syncLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch Seoul permits');
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}