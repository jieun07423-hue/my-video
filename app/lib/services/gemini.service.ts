import pino from 'pino';

const logger = pino({ name: 'gemini-service' });

export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  /**
   * 간단한 텍스트 생성 테스트
   */
  async testConnection() {
    if (!this.apiKey || this.apiKey === 'your-gemini-api-key-here') {
      throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    }

    try {
      logger.info('Gemini API 연동 테스트 시작...');
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: '안녕! 너는 누구니? 한국어로 짧게 대답해줘.' }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error({ errorData }, 'Gemini API 호출 실패');
        throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      logger.info('Gemini API 연동 성공!');
      return {
        success: true,
        answer: text,
        model: 'gemini-1.5-flash'
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Gemini 서비스 오류');
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
