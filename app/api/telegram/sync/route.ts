import { NextRequest, NextResponse } from 'next/server';
import { syncFromPublicDataPortal, getSyncLockStatus } from '@/lib/services/public-data-portal.service';
import { syncLogger, notificationLogger } from '@/lib/logger';
import { syncStateRepository } from '@/lib/repositories/sync-state.repository';

interface TelegramCommandRequest {
  command: 'sync' | 'status' | 'force';
  chatId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TelegramCommandRequest = await request.json();
    const { command, chatId } = body;

    notificationLogger.info({ command, chatId }, 'Telegram 명령 수신');

    if (command === 'status') {
      const lockStatus = getSyncLockStatus();
      const syncState = await syncStateRepository.getSyncState();

      const statusMessage = lockStatus.isLocked
        ? `🔄 동기화 진행 중... (시작: ${lockStatus.lockedAt?.toISOString()})`
        : `✅ 대기 중\n마지막 동기화: ${syncState.lastSyncedAt?.toISOString() || '없음'}`;

      return NextResponse.json({
        message: statusMessage,
        isLocked: lockStatus.isLocked,
        syncState: {
          status: syncState.syncStatus,
          lastSyncedAt: syncState.lastSyncedAt,
          syncCount: syncState.syncCount,
          errorMessage: syncState.errorMessage,
        },
      });
    }

    if (command === 'sync' || command === 'force') {
      const lockStatus = getSyncLockStatus();
      
      if (lockStatus.isLocked && command !== 'force') {
        return NextResponse.json({
          message: `⚠️ 동기화가 이미 진행 중입니다.\n강제 실행: /telegram/sync -d '{"command":"force"}'`,
          isLocked: true,
        }, { status: 409 });
      }

      const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
      if (!serviceKey) {
        return NextResponse.json({
          message: '❌ 서비스 키가 설정되지 않았습니다',
        }, { status: 500 });
      }

      notificationLogger.info({ command, force: command === 'force' }, '동기화 시작');

      const result = await syncFromPublicDataPortal({
        serviceKey,
        pageSize: 50,
        maxPages: 20,
        force: command === 'force',
      });

      const responseMessage = result.success
        ? `✅ 동기화 완료!\n신규: ${result.newRecords}개\n수정: ${result.updatedRecords}개\n실패: ${result.failedRecords}개`
        : `❌ 동기화 실패\n${result.errors.join('\n')}`;

      return NextResponse.json({
        message: responseMessage,
        summary: {
          totalProcessed: result.totalProcessed,
          newRecords: result.newRecords,
          updatedRecords: result.updatedRecords,
          failedRecords: result.failedRecords,
        },
        errors: result.errors,
      });
    }

    return NextResponse.json({
      message: '알 수 없는 명령입니다',
    }, { status: 400 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    notificationLogger.error({ error: errorMessage }, 'Telegram 명령 처리 실패');

    return NextResponse.json(
      { message: `❌ 오류 발생: ${errorMessage}` },
      { status: 500 }
    );
  }
}