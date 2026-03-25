import { NextRequest, NextResponse } from 'next/server';
import { 
  sendTelegramMessage, 
  verifyTelegramSecretToken, 
  parseTelegramUpdate,
  escapeMarkdownV2 
} from '@/lib/services/telegram-bot.service';
import { syncFromPublicDataPortal, getSyncLockStatus } from '@/lib/services/public-data-portal.service';
import { processVoiceMessage } from '@/lib/services/voice.service';
import { syncStateRepository } from '@/lib/repositories/sync-state.repository';
import { notificationLogger } from '@/lib/logger';

interface TelegramChatSession {
  lastMessage?: string;
  messageCount: number;
}

const chatSessions = new Map<number | string, TelegramChatSession>();

async function handleAIChat(chatId: number | string, userMessage: string): Promise<string> {
  const session = chatSessions.get(chatId) || { messageCount: 0 };
  session.messageCount++;
  
  const context = session.lastMessage 
    ? `이전 대화:\n${session.lastMessage}\n\n현재 질문: ${userMessage}`
    : userMessage;

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ 
                text: `너는 소상공인 정보 조회 도우미야. 사용자가 사업자 정보, 동기화, 데이터 관련 질문하면 친절하게 한국어로 답변해줘. 

답변 규칙:
1. 짧고 명확하게
2. 이모지 적절히 사용
3. 필요한 경우 추가 정보 요청

대화 내용: ${context}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (answer) {
          session.lastMessage = userMessage;
          chatSessions.set(chatId, session);
          return answer;
        }
      }
    }

    return '죄송합니다. AI 서비스가 설정되지 않았습니다. Gemini API 키를 설정해주세요.';

  } catch (error) {
    notificationLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'AI Chat 실패');
    return '답변 생성 중 오류가 발생했습니다.';
  }
}

export async function POST(request: NextRequest) {
  try {
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    const configuredSecret = process.env.TELEGRAM_SECRET_TOKEN;
    
    if (configuredSecret && configuredSecret.length > 0) {
      if (!verifyTelegramSecretToken(secretToken)) {
        notificationLogger.warn('잘못된 Telegram secret token');
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const update = parseTelegramUpdate(body);

    if (!update || !update.message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const firstName = update.message.from?.first_name || '사용자';

    if (update.message.voice) {
      await sendTelegramMessage(chatId, '🎤 음성 메시지를 인식하는 중...');

      const voiceResult = await processVoiceMessage(update.message.voice.file_id);
      
      if (!voiceResult.success || !voiceResult.text) {
        await sendTelegramMessage(
          chatId,
          `❌ 음성 인식 실패: ${voiceResult.error || '알 수 없는 오류'}`
        );
        return NextResponse.json({ ok: true });
      }

      notificationLogger.info({ chatId, text: voiceResult.text }, '음성 인식 완료');
      await sendTelegramMessage(
        chatId,
        `📝 인식된 텍스트: "${voiceResult.text}"`
      );

      await sendTelegramMessage(chatId, '🤔 답변 생성 중...');

      const aiResponse = await handleAIChat(chatId, voiceResult.text);
      await sendTelegramMessage(chatId, aiResponse);

      return NextResponse.json({ ok: true });
    }

    if (!update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const text = update.message.text;
    notificationLogger.info({ chatId, text }, 'Telegram 메시지 수신');

    if (text === '/start') {
      await sendTelegramMessage(
        chatId,
        `안녕하세요 ${escapeMarkdownV2(firstName)}님! 🎉\n\n` +
        `*음성 대화:*\n` +
        `음성 메시지를 보내면 AI와 대화할 수 있습니다!\n\n` +
        `*텍스트 명령어:*\n` +
        `\\- /sync \\- 데이터 동기화 시작\n` +
        `\\- /sync\\_force \\- 강제 동기화\n` +
        `\\- /status \\- 동기화 상태\n` +
        `\\- /chat \\- AI 대화 모드\n` +
        `\\- /clear \\- 대화 초기화\n` +
        `\\- /help \\- 도움말`,
        { parse_mode: 'MarkdownV2' }
      );
      return NextResponse.json({ ok: true });
    }

    if (text === '/help') {
      await sendTelegramMessage(
        chatId,
        `*도움말*\n\n` +
        `🎤 *음성 대화:*\n` +
        `음성 메시지를 보내면 AI와 대화!\n\n` +
        `📝 *명령어:*\n` +
        `\\- /sync : 동기화 실행\\n` +
        `\\- /sync\\_force : 강제 동기화\\n` +
        `\\- /status : 상태 확인\\n` +
        `\\- /chat : AI 대화 시작\\n` +
        `\\- /clear : 대화 초기화\\n` +
        `\\- /help : 도움말`,
        { parse_mode: 'MarkdownV2' }
      );
      return NextResponse.json({ ok: true });
    }

    if (text === '/clear') {
      chatSessions.delete(chatId);
      await sendTelegramMessage(chatId, '🗑️ 대화 기록이 초기화되었습니다.');
      return NextResponse.json({ ok: true });
    }

    if (text === '/chat') {
      await sendTelegramMessage(
        chatId,
        `💬 AI 대화 모드 활성화!\n\n` +
        `원하는 것을 말씀하거나 질문해 주세요.\n` +
        `예: "동기화 상태 알려줘", "사업자 정보 조회 방법"`
      );
      return NextResponse.json({ ok: true });
    }

    if (text === '/status') {
      const lockStatus = getSyncLockStatus();
      const syncState = await syncStateRepository.getSyncState();

      let statusText = lockStatus.isLocked
        ? `🔄 *동기화 진행 중*\n시작: ${escapeMarkdownV2(lockStatus.lockedAt?.toISOString() || '알 수 없음')}\n\n`
        : `✅ *대기 중*\n\n`;

      statusText += `*마지막 동기화:*\n` +
        `\\- 시간: ${syncState.lastSyncedAt ? escapeMarkdownV2(syncState.lastSyncedAt.toISOString()) : '없음'}\n` +
        `\\- 상태: ${escapeMarkdownV2(syncState.syncStatus || 'unknown')}\n` +
        `\\- 레코드: ${syncState.syncCount || 0}`;

      await sendTelegramMessage(chatId, statusText, { parse_mode: 'MarkdownV2' });
      return NextResponse.json({ ok: true });
    }

    if (text === '/sync' || text === '/sync@We0098bot') {
      const lockStatus = getSyncLockStatus();
      
      if (lockStatus.isLocked) {
        await sendTelegramMessage(
          chatId,
          `⚠️ 동기화가 이미 진행 중!\n시작: ${escapeMarkdownV2(lockStatus.lockedAt?.toISOString() || '알 수 없음')}\n\n강제 실행: /sync\\_force`
        );
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(chatId, `🚀 동기화 시작...`);

      const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
      if (!serviceKey) {
        await sendTelegramMessage(chatId, `❌ DATA\\_GO\\_KR\\_SERVICE\\_KEY가 없습니다.`);
        return NextResponse.json({ ok: true });
      }

      const result = await syncFromPublicDataPortal({ serviceKey, pageSize: 50, maxPages: 20, force: false });

      if (result.success) {
        await sendTelegramMessage(
          chatId,
          `✅ *동기화 완료!*\n\\- 신규: ${result.newRecords}개\n\\- 수정: ${result.updatedRecords}개\n\\- 실패: ${result.failedRecords}개\n\\- 전체: ${result.totalProcessed}개`,
          { parse_mode: 'MarkdownV2' }
        );
      } else {
        await sendTelegramMessage(chatId, `❌ *동기화 실패*\n${result.errors.join('\n')}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (text === '/sync_force' || text === '/sync_force@We0098bot') {
      await sendTelegramMessage(chatId, `🚀 강제 동기화...`);

      const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
      if (!serviceKey) {
        await sendTelegramMessage(chatId, `❌ API 키 없음`);
        return NextResponse.json({ ok: true });
      }

      const result = await syncFromPublicDataPortal({ serviceKey, pageSize: 50, maxPages: 20, force: true });

      await sendTelegramMessage(
        chatId,
        result.success
          ? `✅ *완료!*\n신규: ${result.newRecords}, 수정: ${result.updatedRecords}, 실패: ${result.failedRecords}`
          : `❌ 실패: ${result.errors.join(', ')}`,
        { parse_mode: 'MarkdownV2' }
      );
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(chatId, '🤔 답변 생성 중...');
    const aiResponse = await handleAIChat(chatId, text);
    await sendTelegramMessage(chatId, aiResponse);

    return NextResponse.json({ ok: true });

  } catch (error) {
    notificationLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Telegram Webhook 실패');
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
