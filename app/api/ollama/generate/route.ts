import { NextRequest, NextResponse } from 'next/server';
import { ollamaService } from '@/lib/services/ollama.service';
import { apiLogger } from '@/lib/logger';

export interface GenerateRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
}

/**
 * Ollama 텍스트 생성 API
 * 
 * POST /api/ollama/generate
 * 
 * Body:
 * - prompt: string (필수) - 생성 프롬프트
 * - model?: string - 사용할 모델 (기본: .env 설정값)
 * - temperature?: number - 생성 온도 (0-2)
 * - top_p?: number - nucleus sampling (0-1)
 * - top_k?: number - top-k sampling
 * - num_predict?: number - 최대 토큰 수
 * - stop?: string[] - 중지 시퀀스
 * 
 * 응답:
 * - model: string - 사용된 모델
 * - response: string - 생성된 텍스트
 * - done: boolean - 완료 여부
 * - timing: { prompt_eval_count?: number; eval_count?: number; eval_duration?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json({
        status: 'error',
        message: 'prompt가 필요합니다.',
      }, { status: 400 });
    }

    apiLogger.info({ 
      promptLength: body.prompt.length,
      model: body.model || ollamaService.getDefaultModel()
    }, 'Ollama 텍스트 생성 요청 수신');

    const result = await ollamaService.generate({
      model: body.model || ollamaService.getDefaultModel(),
      prompt: body.prompt,
      options: {
        temperature: body.temperature,
        top_p: body.top_p,
        top_k: body.top_k,
        num_predict: body.num_predict,
        stop: body.stop,
      },
    });

    return NextResponse.json({
      status: 'success',
      data: {
        model: result.model,
        response: result.response,
        done: result.done,
        timing: {
          promptEvalCount: result.prompt_eval_count,
          evalCount: result.eval_count,
          evalDuration: result.eval_duration,
        },
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, 'Ollama 텍스트 생성 요청 실패');

    return NextResponse.json({
      status: 'error',
      message: errorMessage,
    }, { status: 500 });
  }
}
