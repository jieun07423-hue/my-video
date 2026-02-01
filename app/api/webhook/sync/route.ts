import { NextRequest, NextResponse } from 'next/server';
import { syncFromPublicDataPortal } from '@/app/lib/services/public-data-portal.service';
import { syncLogger, apiLogger } from '@/app/lib/logger';
import { syncStateRepository } from '@/app/lib/repositories/sync-state.repository';

interface WebhookRequest {
  secret?: string;
  trigger?: 'manual' | 'scheduled';
  force?: boolean;
}

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-webhook-secret';

export async function POST(request: NextRequest) {
  try {
    const body: WebhookRequest = await request.json();
    const { secret, trigger = 'manual', force = false } = body;

    apiLogger.info({ trigger, force }, '웹훅 수신');

    if (secret !== WEBHOOK_SECRET) {
      apiLogger.warn('잘못된 웹훅 비밀키');
      return NextResponse.json(
        { error: '인증 실패' },
        { status: 401 }
      );
    }

    await syncStateRepository.setRunning('public-data-portal');

    const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;

    if (!serviceKey) {
      apiLogger.error('DATA_GO_KR_SERVICE_KEY가 설정되지 않음');
      return NextResponse.json(
        { error: '서비스 키가 필요합니다' },
        { status: 500 }
      );
    }

    syncLogger.info(
      { trigger, force },
      '웹훅으로 데이터 동기화 시작'
    );

    const result = await syncFromPublicDataPortal({
      serviceKey,
      pageSize: 50,
      maxPages: 20,
    });

    if (result.success) {
      apiLogger.info(
        {
          trigger,
          totalProcessed: result.totalProcessed,
          newRecords: result.newRecords,
        },
        '웹훅 동기화 성공'
      );
    } else {
      apiLogger.error(
        { trigger, errors: result.errors },
        '웹훅 동기화 실패'
      );
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? '웹훅으로 동기화가 완료되었습니다'
        : '웹훅 동기화 중 오류가 발생했습니다',
      summary: result.success
        ? {
            totalProcessed: result.totalProcessed,
            newRecords: result.newRecords,
            updatedRecords: result.updatedRecords,
          }
        : {
            errors: result.errors,
          },
    });
  } catch (error) {
    apiLogger.error(
      { error: error instanceof Error ? error.message : String(error) },
      '웹훅 처리 중 에러'
    );

    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
