import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { settlementService } from '@/lib/services/settlement.service';
import { z } from 'zod';

const SettlementQuerySchema = z.object({
  storeId: z.string().min(1),
  date: z.string().regex(/^\d{8}$/, 'YYYYMMDD 형식이어야 합니다'),
  grossSales: z.number().positive(),
  transactionCount: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SettlementQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: '정산 요청 데이터가 올바르지 않습니다.', details: parsed.error.format() }, { status: 400 });
    }

    const { storeId, date, grossSales, transactionCount } = parsed.data;
    const report = await settlementService.calculateDailySettlement(storeId, date, grossSales, transactionCount);

    apiLogger.info({ storeId, date, netPayout: report.netPayout }, '토스페이먼츠 연동 정산 리포트 생성 완료');

    return NextResponse.json({
      success: true,
      message: '토스페이먼츠 정산 자동화 리포트가 생성되었습니다.',
      report,
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '정산 리포트 생성 실패');
    return NextResponse.json({ success: false, error: '정산 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
