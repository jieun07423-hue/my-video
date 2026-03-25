import axios from 'axios';
import { notificationLogger } from '@/lib/logger';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN || 'telegram-secret-token';
const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    date: number;
    text?: string;
    voice?: {
      file_id: string;
      duration: number;
      mime_type?: string;
      file_size?: number;
    };
  };
  edited_message?: unknown;
  callback_query?: unknown;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    parse_mode?: 'MarkdownV2' | 'HTML';
    reply_markup?: unknown;
  }
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    notificationLogger.error('TELEGRAM_BOT_TOKEN이 설정되지 않음');
    return false;
  }

  try {
    const response = await axios.post(`${BASE_URL}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'MarkdownV2',
      reply_markup: options?.reply_markup,
    });

    notificationLogger.info({ chatId, messageId: response.data.result.message_id }, 'Telegram 메시지 전송 완료');
    return true;
  } catch (error) {
    notificationLogger.error({ chatId, error: error instanceof Error ? error.message : String(error) }, 'Telegram 메시지 전송 실패');
    return false;
  }
}

export async function setWebhook(url: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    notificationLogger.error('TELEGRAM_BOT_TOKEN이 설정되지 않음');
    return false;
  }

  try {
    const response = await axios.post(`${BASE_URL}/setWebhook`, {
      url,
      secret_token: TELEGRAM_SECRET_TOKEN,
      allowed_updates: ['message', 'edited_message', 'callback_query'],
      drop_pending_updates: true,
    });

    notificationLogger.info({ url, result: response.data.result }, 'Telegram Webhook 설정 완료');
    return response.data.ok;
  } catch (error) {
    notificationLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Telegram Webhook 설정 실패');
    return false;
  }
}

export async function deleteWebhook(): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    return false;
  }

  try {
    const response = await axios.post(`${BASE_URL}/deleteWebhook`, {});
    notificationLogger.info('Telegram Webhook 삭제 완료');
    return response.data.ok;
  } catch (error) {
    notificationLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Telegram Webhook 삭제 실패');
    return false;
  }
}

export function verifyTelegramSecretToken(secretToken: string | undefined): boolean {
  return secretToken === TELEGRAM_SECRET_TOKEN;
}

export function parseTelegramUpdate(body: unknown): TelegramUpdate | null {
  try {
    return body as TelegramUpdate;
  } catch {
    return null;
  }
}

export function escapeMarkdownV2(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

export default {
  sendTelegramMessage,
  setWebhook,
  deleteWebhook,
  verifyTelegramSecretToken,
  parseTelegramUpdate,
  escapeMarkdownV2,
};
