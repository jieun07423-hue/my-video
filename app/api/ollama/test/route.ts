import { NextRequest, NextResponse } from 'next/server';
import { ollamaService } from '@/lib/services/ollama.service';
import { apiLogger } from '@/lib/logger';

/**
 * Ollama 서버 연결 테스트
 * 
 * GET /api/ollama/test
 * 
 * 응답:
 * - success: boolean - 연결 성공 여부
 * - models: Array<{ name: string; modified_at: string; size: number }> - 사용 가능한 모델 목록
 * - baseUrl: string - Ollama 서버 URL
 */
export async function GET(request: NextRequest) {
  try {
    apiLogger.info('Ollama 연동 테스트 요청 수신');

    const result = await ollamaService.testConnection();

    return NextResponse.json({
      status: 'success',
      message: 'Ollama 서버 연결 성공',
      data: {
        baseUrl: result.baseUrl,
        defaultModel: ollamaService.getDefaultModel(),
        models: result.models.map(model => ({
          name: model.name,
          modifiedAt: model.modified_at,
          size: model.size,
        })),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, 'Ollama 연동 테스트 실패');

    return NextResponse.json({
      status: 'error',
      message: errorMessage,
      hint: 'Ollama 서버가 실행 중인지 확인해주세요. (기본: http://localhost:11434)',
    }, { status: 500 });
  }
}
