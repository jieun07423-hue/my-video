import { NextRequest, NextResponse } from 'next/server';
import { claimRequestRepository } from '@/lib/repositories/claim-request.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse, createNotFoundResponse, createBadRequestResponse } from '@/lib/api/handlers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const claim = await claimRequestRepository.findById(params.id);
    if (!claim) {
      return createNotFoundResponse('존재하지 않는 요청입니다');
    }
    return NextResponse.json({ success: true, data: claim });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Claim request fetch failed');
    return createApiErrorResponse(error, '조회 실패', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, adminNote, reviewedBy } = body;

    if (!action) {
      return createBadRequestResponse('action 필드는 필수입니다 (approve/reject)');
    }

    if (!reviewedBy) {
      return createBadRequestResponse('reviewedBy 필드는 필수입니다');
    }

    let result;
    switch (action) {
      case 'approve':
        result = await claimRequestRepository.approve(params.id, reviewedBy, adminNote);
        break;
      case 'reject':
        if (!adminNote) {
          return createBadRequestResponse('거절 시 adminNote는 필수입니다');
        }
        result = await claimRequestRepository.reject(params.id, reviewedBy, adminNote);
        break;
      default:
        return createBadRequestResponse('action은 approve 또는 reject만 가능합니다');
    }

    apiLogger.info({ id: params.id, action, reviewedBy }, 'Claim request updated');
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Claim request update failed');
    return createApiErrorResponse(error, '처리 실패', 400);
  }
}
