import axios from 'axios';
import { notificationLogger } from '@/lib/logger';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface VoiceMessage {
  file_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface VoiceProcessingResult {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Telegram에서 음성 파일 다운로드
 */
export async function downloadTelegramVoiceFile(fileId: string): Promise<Buffer | null> {
  if (!TELEGRAM_BOT_TOKEN) {
    notificationLogger.error('TELEGRAM_BOT_TOKEN이 설정되지 않음');
    return null;
  }

  try {
    // 1. 파일 정보 가져오기
    const fileResponse = await axios.get(`${BASE_URL}/getFile`, {
      params: { file_id: fileId },
    });

    if (!fileResponse.data.ok) {
      notificationLogger.error({ fileId }, 'Telegram 파일 정보 가져오기 실패');
      return null;
    }

    const filePath = fileResponse.data.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

    // 2. 파일 다운로드
    const fileResponse2 = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
    });

    notificationLogger.info({ fileId, size: fileResponse2.data.length }, 'Telegram 음성 파일 다운로드 완료');
    return Buffer.from(fileResponse2.data);

  } catch (error) {
    notificationLogger.error({ fileId, error: error instanceof Error ? error.message : String(error) }, '음성 파일 다운로드 실패');
    return null;
  }
}

/**
 * OpenAI Whisper를 사용한 STT (Speech-to-Text)
 */
export async function speechToTextWithWhisper(audioBuffer: Buffer): Promise<VoiceProcessingResult> {
  if (!OPENAI_API_KEY) {
    return { success: false, error: 'OPENAI_API_KEY가 설정되지 않음' };
  }

  try {
    const formData = new FormData();
    
    // Buffer를 Blob으로 변환
    const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
    const audioFile = new File([audioBlob], 'voice.ogg', { type: 'audio/ogg' });
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'ko'); // 한국어
    formData.append('response_format', 'json');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    const text = response.data.text?.trim();
    if (!text) {
      return { success: false, error: '음성을 텍스트로 변환할 수 없음' };
    }

    notificationLogger.info({ text }, 'Whisper STT 완료');
    return { success: true, text };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    notificationLogger.error({ error: errorMessage }, 'Whisper STT 실패');
    return { success: false, error: errorMessage };
  }
}

/**
 * Google Cloud Speech-to-Text를 사용한 STT
 * (Whisper가 없을 때 대안)
 */
export async function speechToTextWithGoogle(audioBuffer: Buffer): Promise<VoiceProcessingResult> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { success: false, error: 'Google credentials가 설정되지 않음' };
  }

  // Google Cloud STT 구현 (추가 설정 필요)
  return { success: false, error: 'Google STT는 아직 구현되지 않음' };
}

/**
 * 기본 STT - Telegram voice 메시지 처리
 * 우선순위: Whisper > Google > Basic
 */
export async function processVoiceMessage(fileId: string): Promise<VoiceProcessingResult> {
  notificationLogger.info({ fileId }, '음성 메시지 처리 시작');

  // 1. 음성 파일 다운로드
  const audioBuffer = await downloadTelegramVoiceFile(fileId);
  if (!audioBuffer) {
    return { success: false, error: '음성 파일 다운로드 실패' };
  }

  // 2. STT 처리 (Whisper 우선)
  if (OPENAI_API_KEY) {
    return await speechToTextWithWhisper(audioBuffer);
  }

  return { success: false, error: 'STT 서비스가 설정되지 않음' };
}

/**
 * 텍스트를 음성으로 변환 (Telegram Voice)
 */
export async function textToSpeechWithTelegram(text: string, chatId: number | string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    notificationLogger.error('TELEGRAM_BOT_TOKEN이 설정되지 않음');
    return false;
  }

  try {
    // Telegram의 voice 메시지는 OGG 형식
    // Telegram Bot API의 sendVoice 사용
    
    // 방법 1: 직접 음성 파일 생성 후 전송 (추가 라이브러리 필요)
    // 방법 2: Telegram의 speech synthesis 사용 (제한적)
    
    // 현재는 텍스트 응답으로 대체
    notificationLogger.info({ chatId, textLength: text.length }, 'TTS 변환 (텍스트로 대체)');
    return false;

  } catch (error) {
    notificationLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'TTS 실패');
    return false;
  }
}

/**
 * Google Cloud TTS를 사용한 음성 생성
 */
export async function generateSpeechWithGoogle(text: string, lang: string = 'ko-KR'): Promise<Buffer | null> {
  if (!process.env.GOOGLE_TTS_API_KEY) {
    notificationLogger.warn('GOOGLE_TTS_API_KEY가 설정되지 않음');
    return null;
  }

  try {
    // Google Cloud Text-to-Speech API 호출
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
      {
        input: { text },
        voice: { languageCode: lang, ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'OGG_OPUS' },
      }
    );

    const audioContent = response.data.audioContent;
    if (!audioContent) {
      return null;
    }

    return Buffer.from(audioContent, 'base64');

  } catch (error) {
    notificationLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Google TTS 실패');
    return null;
  }
}

/**
 * Telegram으로 음성 전송
 */
export async function sendVoiceToTelegram(
  chatId: number | string, 
  audioBuffer: Buffer, 
  title?: string
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    return false;
  }

  try {
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
    const audioFile = new File([audioBlob], 'voice.ogg', { type: 'audio/ogg' });
    formData.append('chat_id', String(chatId));
    formData.append('voice', audioFile);
    if (title) {
      formData.append('caption', title);
    }

    await axios.post(`${BASE_URL}/sendVoice`, formData, {
      headers: formData.getHeaders(),
    });

    notificationLogger.info({ chatId }, 'Telegram 음성 전송 완료');
    return true;

  } catch (error) {
    notificationLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Telegram 음성 전송 실패');
    return false;
  }
}

export default {
  downloadTelegramVoiceFile,
  processVoiceMessage,
  speechToTextWithWhisper,
  generateSpeechWithGoogle,
  sendVoiceToTelegram,
};
