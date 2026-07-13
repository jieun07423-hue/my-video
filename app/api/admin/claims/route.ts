import { NextRequest, NextResponse } from 'next/server';
import { claimRequestRepository } from '@/lib/repositories/claim-request.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse, createBadRequestResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'cancelled' | undefined;
    const search = searchParams.get('search') || undefined;

    const result = await claimRequestRepository.search({ page, limit, status, search });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Claim requests fetch failed');
    return createApiErrorResponse(error, '조회 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, requesterName, requesterContact, requesterNote } = body;

    if (!businessId || !requesterName || !requesterContact) {
      return createBadRequestResponse('businessId, requesterName, requesterContact는 필수 항목입니다');
    }

    const claim = await claimRequestRepository.create({
      businessId,
      requesterName,
      requesterContact,
      requesterNote,
    });

    apiLogger.info({ id: claim.id, businessId }, 'Claim request created');
    return NextResponse.json({ success: true, data: claim }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Claim request creation failed');
    return createApiErrorResponse(error, '생성 실패', 400);
  }
}
