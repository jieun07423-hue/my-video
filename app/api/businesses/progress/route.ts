import { NextRequest, NextResponse } from 'next/server';
import { progressService } from '@/lib/services/progress.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const taskType = searchParams.get('taskType');
    const state = searchParams.get('state') as any;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (taskId) {
      const progress = await progressService.getProgress(taskId);
      if (!progress) {
        return NextResponse.json({ error: '진행 상태를 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json(progress);
    }

    const results = await progressService.queryProgress({
      taskType: taskType || undefined,
      state: state || undefined,
      limit,
      offset,
    });

    const stats = await progressService.getProgressStats(taskType || undefined);

    apiLogger.info({ count: results.length, taskType, state }, '진행 상태 조회');
    return NextResponse.json({
      items: results,
      total: stats.total,
      page: Math.floor(offset / limit) + 1,
      limit,
      stats: stats.byState,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '진행 상태 조회 실패');
    return NextResponse.json({ error: '진행 상태 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, taskType, totalSteps, initialMessage, metadata, ttlSeconds } = body;

    if (!taskId || !taskType) {
      return NextResponse.json({ error: 'taskId와 taskType은 필수입니다' }, { status: 400 });
    }

    const progress = await progressService.createProgress({
      taskId,
      taskType,
      totalSteps,
      initialMessage,
      metadata,
      ttlSeconds,
    });

    apiLogger.info({ taskId, taskType }, '진행 상태 생성');
    return NextResponse.json(progress, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '진행 상태 생성 실패');
    return NextResponse.json({ error: '진행 상태 생성 실패' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const body = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: 'taskId는 필수입니다' }, { status: 400 });
    }

    const { percentage, state, message, currentStep, completedSteps, metadata, error } = body;

    const progress = await progressService.updateProgress(taskId, {
      percentage,
      state,
      message,
      currentStep,
      completedSteps,
      metadata,
      error,
    });

    if (!progress) {
      return NextResponse.json({ error: '진행 상태를 찾을 수 없습니다' }, { status: 404 });
    }

    apiLogger.info({ taskId, percentage, state }, '진행 상태 업데이트');
    return NextResponse.json(progress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '진행 상태 업데이트 실패');
    return NextResponse.json({ error: '진행 상태 업데이트 실패' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId는 필수입니다' }, { status: 400 });
    }

    const deleted = await progressService.deleteProgress(taskId);
    if (!deleted) {
      return NextResponse.json({ error: '진행 상태를 찾을 수 없습니다' }, { status: 404 });
    }

    apiLogger.info({ taskId }, '진행 상태 삭제');
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, '진행 상태 삭제 실패');
    return NextResponse.json({ error: '진행 상태 삭제 실패' }, { status: 500 });
  }
}