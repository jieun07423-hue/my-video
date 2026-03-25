import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

interface ErrorLogData {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
}

/**
 * POST /api/errors - 클라이언트 에러 로깅
 */
export async function POST(request: NextRequest) {
  try {
    const errorData: ErrorLogData = await request.json();
    
    apiLogger.error({
      clientError: errorData,
      userAgent: errorData.userAgent,
      url: errorData.url,
      timestamp: errorData.timestamp
    }, '클라이언트 에러 발생');

    // 실제 환경에서는 에러 분석 서비스로 전송하거나 DB 저장
    // 현재는 로그로만 처리
    
    return NextResponse.json({ 
      success: true,
      message: '에러가 로깅되었습니다'
    });
    
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '에러 로깅 실패');
    return createApiErrorResponse(error, '에러 로깅 실패', 500);
  }
}

/**
 * GET /api/errors - 에러 통계 조회 (관리자용)
 */
export async function GET(request: NextRequest) {
  try {
    // 실제 환경에서는 DB에서 에러 통계 조회
    const mockStats = {
      totalErrors: 0,
      recentErrors: [],
      errorsByType: {},
      last24Hours: []
    };
    
    apiLogger.info('에러 통계 조회');
    return NextResponse.json(mockStats);
    
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '에러 통계 조회 실패');
    return createApiErrorResponse(error, '조회 실패', 500);
  }
}