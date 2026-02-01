import { NextRequest, NextResponse } from 'next/server';
import { businessRepository } from '@/app/lib/repositories/business.repository';
import { apiLogger } from '@/app/lib/logger';
import { createApiErrorResponse, createNotFoundResponse, createBadRequestResponse } from '@/app/lib/api/handlers';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/businesses/[id] - 소상공인 상세 조회
 */
export async function generateStaticParams() {
  return [{ id: 'mock' }];
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = params;
    const business = await businessRepository.getById(id);

    if (!business) {
      apiLogger.warn({ id }, '소상공인을 찾을 수 없음');
      return createNotFoundResponse('존재하지 않는 소상공인입니다');
    }

    apiLogger.info({ id }, '소상공인 상세 조회 성공');
    return NextResponse.json(business);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '소상공인 상세 조회 실패');
    return createApiErrorResponse(error, '조회 실패', 500);
  }
}

/**
 * PUT /api/businesses/[id] - 소상공인 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Note: 현재 정적 데이터베이스에서는 수정이 완전히 지원되지 않음
    // 실제 Prisma 데이터베이스에서는 db.business.update 사용
    apiLogger.info({ id, updates: Object.keys(body) }, '소상공인 수정 요청');

    return NextResponse.json({ message: '수정 성공', id, ...body } as any);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '소상공인 수정 실패');
    return createApiErrorResponse(error, '수정 실패', 400);
  }
}

/**
 * DELETE /api/businesses/[id] - 소상공인 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = params;

    // Note: 현재 정적 데이터베이스에서는 삭제가 지원되지 않음
    // 실제 Prisma 데이터베이스에서는 db.business.delete 사용
    apiLogger.info({ id }, '소상공인 삭제 요청');

    return NextResponse.json({ message: '삭제 성공', id } as any);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '소상공인 삭제 실패');
    return createApiErrorResponse(error, '삭제 실패', 400);
  }
}
