import { businessRepository } from '@app/lib/repositories/business.repository';
import { apiLogger } from '@app/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const stats = await businessRepository.getStats();

    apiLogger.info({ stats }, 'Dashboard stats fetched');
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    apiLogger.error({ error: error.message }, 'Failed to fetch dashboard stats');
    return NextResponse.json(
      {
        success: false,
        error: '통계를 불러오는데 실패했습니다.'
      },
      { status: 500 }
    );
  }
}
