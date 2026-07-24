import pino from 'pino';
import { systemSettingRepository } from '../repositories/systemSetting.repository';

const logger = pino({ name: 'gemini-service' });

export interface AnalyzedMenuItem {
  name: string;
  price: number;
  sku: string;
  category: string;
  description: string;
  detailHtml: string;
}

export class GeminiService {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  private async getApiKey(): Promise<string> {
    try {
      const dbKey = await systemSettingRepository.getValue('GEMINI_API_KEY');
      return dbKey || process.env.GEMINI_API_KEY || '';
    } catch {
      return process.env.GEMINI_API_KEY || '';
    }
  }

  /**
   * 간단한 텍스트 생성 테스트
   */
  async testConnection(customKey?: string) {
    const apiKey = customKey || await this.getApiKey();

    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    }

    try {
      logger.info('Gemini API 연동 테스트 시작...');
      
      const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
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

  async analyzeMenuImage(base64Data: string, mimeType: string): Promise<AnalyzedMenuItem[]> {
    const apiKey = await this.getApiKey();

    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. 관리자 설정에서 API Key를 먼저 입력해주세요.');
    }

    try {
      logger.info('Gemini Vision API 메뉴판 분석 시작...');

      const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '');

      const prompt = `
당신은 대한민국 최고의 소상공인 푸드테크 컨설턴트 및 UI/UX 전문가입니다. 
제공된 메뉴판 사진 이미지를 면밀히 판독하여 메뉴 아이템 정보를 구조화된 JSON 데이터로 완벽하게 추출하십시오.

[출출 및 생성 규칙]
1. 이미지 속에서 모든 메뉴 이름, 가격을 정확하게 식별하십시오.
2. 각 메뉴별로 아래 정보를 포함하여 JSON 배열로 반환하십시오.
   - name: 메뉴 이름 (한국어, 예: '수제 치즈 버거')
   - price: 메뉴 가격 (원화 숫자만, 예: 8500)
   - sku: 고유 영문 식별값. 메뉴 이름을 의미 있는 영단어 조합의 케밥 케이스로 변환 (예: 'homemade-cheese-burger')
   - category: 메뉴가 속할 최적의 카테고리 (한국어 단일 카테고리, 예: '버거', '음료', '사이드', '파스타' 등)
   - description: 고객의 입맛을 돋우는 매력적인 1-2문장의 한국어 설명 (예: '매일 아침 직접 구워낸 부드러운 번과 100% 소고기 패티의 고소함이 돋보이는 수제버거')
   - detailHtml: 해당 메뉴의 스마트스토어/배달앱 스타일 고품질 반응형 상세페이지 HTML 블록 (Tailwind CSS 스타일링 필수 적용). 
                 이 상세페이지는 반드시 한국어로 작성되어야 하며 아래 내용을 예쁘게 디자인된 격자 카드나 리스트 형태로 포함해야 합니다:
                 - 메뉴의 매력 포인트 / 스토리텔링
                 - 주요 식재료 및 원산지 정보 요약
                 - 영양 성분 하이라이트 (칼로리, 단백질 등 합리적 추정치)
                 - 알레르기 유발 물질 경고 문구 (예: '밀, 대두, 우유 포함')
                 - 맛있게 먹는 법 또는 추천 조합 (Honey Tip!)
                 * 주의: 외부 CSS나 외부 이미지를 사용하지 말고, Tailwind 인라인 클래스로 아주 우아하고 정밀하게 꾸미십시오. 테마 색상(오렌지/로즈/화이트/슬레이트 그레이 등)을 감각적으로 사용하십시오. 전체적인 디자인 퀄리티가 대단히 뛰어나야 합니다.

[반환 형식 규격]
반드시 아래 JSON 스키마를 100% 충족하는 순수 JSON 형식으로만 응답해야 합니다. 
마크다운 백틱(\`\`\`)을 사용하여 JSON을 감싸지 마십시오.
`;

      const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: cleanBase64
                }
              }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                items: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      name: { type: 'STRING' },
                      price: { type: 'NUMBER' },
                      sku: { type: 'STRING' },
                      category: { type: 'STRING' },
                      description: { type: 'STRING' },
                      detailHtml: { type: 'STRING' }
                    },
                    required: ['name', 'price', 'sku', 'category', 'description', 'detailHtml']
                  }
                }
              },
              required: ['items']
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error({ errorData }, 'Gemini Vision API 호출 실패');
        throw new Error(`Vision API 호출 실패: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error('Gemini Vision API로부터 분석 결과를 생성받지 못했습니다.');
      }

      logger.info('Gemini Vision API 메뉴판 분석 완료. JSON 파싱 시도...');
      const parsed = JSON.parse(rawText);
      return parsed.items || [];
    } catch (error: any) {
      logger.error({ error: error.message }, 'Gemini Vision 서비스 오류');
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
