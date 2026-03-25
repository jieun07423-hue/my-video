import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/services/gemini.service';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    apiLogger.info('Gemini 연동 테스트 요청 수신');
    
    const result = await geminiService.testConnection();
    
    return NextResponse.json({
      status: 'success',
      message: 'Gemini API 연동 성공',
      data: result
    });
  } catch (error: any) {
    apiLogger.error({ error: error.message }, 'Gemini 연동 테스트 실패');
    
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Gemini API 연동 실패',
      hint: 'GEMINI_API_KEY가 올바른지, 그리고 API 권한이 활성화되어 있는지 확인해주세요.'
    }, { status: 500 });
  }
}
