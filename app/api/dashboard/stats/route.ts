import { businessRepository } from '@/lib/repositories/business.repository';
import { apiLogger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const stats = await businessRepository.getStats();

    apiLogger.info({ stats }, 'Dashboard stats fetched');
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch dashboard stats');
    return NextResponse.json(
      {
        success: false,
        error: '통계를 불러오는데 실패했습니다.'
      },
      { status: 500 }
    );
  }
}
