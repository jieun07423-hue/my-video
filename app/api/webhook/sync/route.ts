import { NextRequest, NextResponse } from 'next/server';
import { syncFromPublicDataPortal, getSyncLockStatus } from '@/lib/services/public-data-portal.service';
import { syncLogger, apiLogger } from '@/lib/logger';
import { syncStateRepository } from '@/lib/repositories/sync-state.repository';

interface WebhookRequest {
  secret?: string;
  trigger?: 'manual' | 'scheduled' | 'webhook';
  force?: boolean;
  pageSize?: number;
  maxPages?: number;
}

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-webhook-secret';

async function executeSync(trigger: string, force: boolean, pageSize: number, maxPages: number) {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;

  if (!serviceKey) {
    throw new Error('DATA_GO_KR_SERVICE_KEY가 설정되지 않음');
  }

  return await syncFromPublicDataPortal({
    serviceKey,
    pageSize,
    maxPages,
    force,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: WebhookRequest = await request.json();
    const { 
      secret, 
      trigger = 'webhook', 
      force = false,
      pageSize = 50,
      maxPages = 20 
    } = body;

    apiLogger.info({ trigger, force, pageSize, maxPages }, '웹훅 수신');

    if (secret !== WEBHOOK_SECRET) {
      apiLogger.warn('잘못된 웹훅 비밀키');
      return NextResponse.json(
        { error: '인증 실패' },
        { status: 401 }
      );
    }

    await syncStateRepository.setRunning('public-data-portal');

    syncLogger.info({ trigger, force }, '웹훅으로 데이터 동기화 시작');

    const result = await executeSync(trigger, force, pageSize, maxPages);

    if (result.isLocked) {
      apiLogger.warn('동기화가 이미 진행 중');
      return NextResponse.json({
        success: false,
        error: result.errors[0] || '동기화가 이미 진행 중입니다',
        isLocked: true,
      }, { status: 409 });
    }

    if (result.success) {
      apiLogger.info(
        { trigger, totalProcessed: result.totalProcessed, newRecords: result.newRecords },
        '웹훅 동기화 성공'
      );
    } else {
      apiLogger.error({ trigger, errors: result.errors }, '웹훅 동기화 실패');
    }

    return NextResponse.json({
      success: result.success,
      message: result.success ? '동기화가 완료되었습니다' : '동기화 중 오류가 발생했습니다',
      summary: {
        totalProcessed: result.totalProcessed,
        newRecords: result.newRecords,
        updatedRecords: result.updatedRecords,
        failedRecords: result.failedRecords,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error({ error: errorMessage }, '웹훅 처리 중 에러');

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const lockStatus = getSyncLockStatus();
  const syncState = await syncStateRepository.getSyncState();

  return NextResponse.json({
    isLocked: lockStatus.isLocked,
    lockedAt: lockStatus.lockedAt,
    syncState,
  });
}
