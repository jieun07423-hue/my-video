import { NextRequest, NextResponse } from 'next/server';
import { businessRepository } from '@/app/lib/repositories/business.repository';
import { apiLogger } from '@/app/lib/logger';
import { createApiErrorResponse, createBadRequestResponse } from '@/app/lib/api/handlers';

/**
 * GET /api/businesses - 소상공인 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || undefined;
    const statusValue = searchParams.get('status');
    const recordStatusValue = searchParams.get('recordStatus');
    const businessCode = searchParams.get('businessCode') || undefined;

    const result = await businessRepository.search({
      page,
      limit,
      search,
      status: statusValue as 'pending' | 'active' | 'inactive' | 'dissolved' | 'pending_renewal' | undefined,
      recordStatus: recordStatusValue as 'new' | 'synced' | 'verified' | undefined,
      businessCode,
    });

    apiLogger.info({ page, limit, count: result.items.length, total: result.total }, '소상공인 목록 조회 성공');
    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '소상공인 목록 조회 실패');
    return createApiErrorResponse(error, '조회 실패', 500);
  }
}

/**
 * POST /api/businesses - 소상공인 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businesses = Array.isArray(body) ? body : [body];

    const result = await businessRepository.createMany(businesses);
    apiLogger.info({ created: result.count }, '소상공인 생성 성공');
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '소상공인 생성 실패');
    return createApiErrorResponse(error, '생성 실패', 400);
  }
}
