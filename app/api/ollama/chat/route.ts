import { NextRequest, NextResponse } from 'next/server';
import { ollamaService } from '@/lib/services/ollama.service';
import { apiLogger } from '@/lib/logger';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
}

/**
 * Ollama 채팅 API
 * 
 * POST /api/ollama/chat
 * 
 * Body:
 * - messages: Array<{ role: string; content: string }> - 채팅 메시지 목록
 * - temperature?: number - 생성 온도 (0-2)
 * - top_p?: number - nucleus sampling (0-1)
 * - top_k?: number - top-k sampling
 * - num_predict?: number - 최대 토큰 수
 * - stop?: string[] - 중지 시퀀스
 * 
 * 응답:
 * - message: { role: string; content: string } - 생성된 응답
 * - done: boolean - 완료 여부
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({
        status: 'error',
        message: 'messages 배열이 필요합니다.',
      }, { status: 400 });
    }

    apiLogger.info({ 
      messageCount: body.messages.length,
      lastMessageLength: body.messages[body.messages.length - 1]?.content?.length 
    }, 'Ollama 채팅 요청 수신');

    const options = {
      temperature: body.temperature,
      top_p: body.top_p,
      top_k: body.top_k,
      num_predict: body.num_predict,
      stop: body.stop,
    };

    const result = await ollamaService.chat(body.messages, options);

    return NextResponse.json({
      status: 'success',
      data: {
        message: result.message,
        done: result.done,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    apiLogger.error({ error: errorMessage }, 'Ollama 채팅 요청 실패');

    return NextResponse.json({
      status: 'error',
      message: errorMessage,
    }, { status: 500 });
  }
}
