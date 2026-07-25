import { NextRequest, NextResponse } from 'next/server';
import { 
  sendTelegramMessage, 
  sendTelegramMessageWithKeyboard,
  verifyTelegramSecretToken, 
  parseTelegramUpdate,
  escapeMarkdownV2,
  createMainMenuKeyboard,
  createAdIndustryKeyboard,
  answerCallbackQuery,
  type InlineKeyboardMarkup,
} from '@/lib/services/telegram-bot.service';
import { syncFromPublicDataPortal, getSyncLockStatus } from '@/lib/services/public-data-portal.service';
import { processVoiceMessage, generateSpeechWithGoogle, sendVoiceToTelegram } from '@/lib/services/voice.service';
import { adGeneratorService } from '@/lib/services/ad-generator.service';
import { adRepository } from '@/lib/repositories/ad.repository';
import { syncStateRepository } from '@/lib/repositories/sync-state.repository';
import { userSessionService } from '@/lib/services/user-session.service';
import { ollamaService } from '@/lib/services/ollama.service';
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
    const messages = [
      {
        role: 'system',
        content: `너는 소상공인 정보 조회 도우미야. 사용자가 사업자 정보, 동기화, 데이터 관련 질문하면 친절하게 한국어로 답변해줘. 

답변 규칙:
1. 짧고 명확하게 (500자 이내)
2. 이모지 적절히 사용
3. 필요한 경우 추가 정보 요청
4. 명령어 관련 질문에는 실제 명령어 예시 제공`
      },
      {
        role: 'user',
        content: context
      }
    ];

    const result = await ollamaService.chat(messages, {
      temperature: 0.7,
      num_predict: 500,
    });

    const answer = result.message?.content?.trim();
    if (answer) {
      session.lastMessage = userMessage;
      chatSessions.set(chatId, session);
      return answer;
    }

    return '답변을 생성할 수 없습니다.';

  } catch (error) {
    notificationLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Ollama AI Chat 실패');
    return '죄송합니다. AI 서비스( Ollama ) 연결에 실패했습니다. 서버가 실행 중인지 확인해주세요.';
  }
}

async function handleCallbackQuery(callbackQuery: { id: string; from?: { id: number }; data?: string; message?: { chat?: { id: number } } }) {
  const callbackId = callbackQuery.id;
  const data = callbackQuery.data || '';
  const chatId = callbackQuery.message?.chat?.id;
  const userId = String(callbackQuery.from?.id);

  if (!chatId) {
    await answerCallbackQuery(callbackId, '오류가 발생했습니다.');
    return;
  }

  notificationLogger.info({ callbackData: data, chatId }, '콜백 쿼리 수신');

  if (data.startsWith('menu_')) {
    const menuAction = data.replace('menu_', '');
    
    switch (menuAction) {
      case 'home':
        await sendTelegramMessageWithKeyboard(
          chatId,
          '🏠 *메인으로*\n\n원하는 작업을 선택해주세요.',
          createMainMenuKeyboard()
        );
        break;
      case 'ads':
        const campaigns = await adRepository.findCampaignsByUserId(userId, { limit: 5 });
        if (campaigns.length === 0) {
          await sendTelegramMessage(chatId, '📊 생성한 광고가 없습니다.\n/ad 명령어로 새로운 광고를 만들어보세요!');
        } else {
          let message = '📊 *내 광고 목록*\n\n';
          campaigns.forEach((c, i) => {
            message += `${i + 1}. ${c.industry} - ${c.location} (${c.status})\n`;
          });
          await sendTelegramMessage(chatId, message);
        }
        break;
      case 'settings':
        const rateStatus = adGeneratorService.getRateLimitStatus(userId);
        await sendTelegramMessage(
          chatId,
          `⚙️ *설정*\n\nRate Limit: ${rateStatus.count}/${rateStatus.limit}\n남은 요청: ${rateStatus.limit - rateStatus.count}`
        );
        break;
      case 'help':
        await sendTelegramMessage(
          chatId,
          `*도움말*\n\n🎯 /ad [업종] [지역] - 광고 생성\n📊 /status - 상태 확인\n🔄 /sync - 데이터 동기화\n❓ /help - 도움말`
        );
        break;
      case 'back':
        await sendTelegramMessageWithKeyboard(
          chatId,
          '🔙 뒤로\n\n원하는 작업을 선택해주세요.',
          createMainMenuKeyboard()
        );
        break;
    }
    
    await answerCallbackQuery(callbackId);
    return;
  }

  if (data.startsWith('industry_')) {
    const industry = data.replace('industry_', '');
    userSessionService.updateContext(String(chatId), { industry });
    userSessionService.updateState(String(chatId), { mode: 'ad_location', step: 1 });
    
    await sendTelegramMessage(chatId, `🏢 업종: *${industry}*\n\n지역을 입력해주세요.\n예: 강남, 잠실, 홍대`);
    await answerCallbackQuery(callbackId);
    return;
  }

  await answerCallbackQuery(callbackId, '알 수 없는 명령입니다.');
}

export async function POST(request: NextRequest) {
  try {
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    const configuredSecret = process.env.TELEGRAM_SECRET_TOKEN;
    
    if (configuredSecret && configuredSecret.length > 0) {
      if (!verifyTelegramSecretToken(secretToken ?? undefined)) {
        notificationLogger.warn('잘못된 Telegram secret token');
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const update = parseTelegramUpdate(body);

    if (update?.callback_query) {
      await handleCallbackQuery(update.callback_query as { id: string; from?: { id: number }; data?: string; message?: { chat?: { id: number } } });
      return NextResponse.json({ ok: true });
    }

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

      const ttsAudio = await generateSpeechWithGoogle(aiResponse, 'ko-KR');
      
      if (ttsAudio) {
        const voiceSent = await sendVoiceToTelegram(chatId, ttsAudio, '🔊 AI 답변');
        if (voiceSent) {
          return NextResponse.json({ ok: true });
        }
      }

      await sendTelegramMessage(chatId, aiResponse);
      return NextResponse.json({ ok: true });
    }

    if (!update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const text = update.message.text;
    notificationLogger.info({ chatId, text }, 'Telegram 메시지 수신');

if (text === '/start') {
      await sendTelegramMessageWithKeyboard(
        chatId,
        `안녕하세요 ${escapeMarkdownV2(firstName)}님! 🎉\n\n` +
        `*광고 카피 생성:*\n` +
        `/ad [업종] [지역] [타겟]\n` +
        `예: /ad 강남 치과 30대 여성\n\n` +
        `*음성 대화:*\n` +
        `음성 메시지를 보내면 AI와 대화!\n\n` +
        `아래 버튼을 눌러 빠르게 시작하세요!`,
        createMainMenuKeyboard()
      );
      return NextResponse.json({ ok: true });
    }

    if (text === '/help') {
      await sendTelegramMessageWithKeyboard(
        chatId,
        `*도움말*\n\n` +
        `🎯 *광고 카피:*\n` +
        `/ad [업종] [지역] [타겟]\n` +
        `예: /ad 강남 치과\n\n` +
        `🎤 *음성 대화:*\n` +
        `음성 메시지를 보내면 AI와 대화!\n\n` +
        `📝 *명령어:*\n` +
        `\\- /ad : 광고 생성\\n` +
        `\\- /sync : 동기화 실행\\n` +
        `\\- /sync\\_force : 강제 동기화\\n` +
        `\\- /status : 상태 확인\\n` +
        `\\- /chat : AI 대화 시작\\n` +
        `\\- /clear : 대화 초기화\\n` +
        `\\- /help : 도움말`,
        createMainMenuKeyboard()
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

    if (text.startsWith('/ad') || text.startsWith('/ad@We0098bot')) {
      const parts = text.replace(/^\/ad(@We0098bot)?/, '').trim().split(' ').filter(p => p);
      
      if (parts.length < 2) {
        await sendTelegramMessage(
          chatId,
          `📝 *광고 카피 생성*\n\n사용법: /ad [업종] [지역] [타겟]\n\n예시:\n/ad 강남 치과 30대 여성\n/ad 잠실 부동산 투자\n/ad 홍대 카페 학생\n\n선택적 옵션:\n/_ad 강남 치과 | 통증최소화 | 임플란트`,
          { parse_mode: 'MarkdownV2' }
        );
        return NextResponse.json({ ok: true });
      }

      const industry = parts[0];
      const location = parts[1];
      const target = parts[2] || undefined;

      await sendTelegramMessage(
        chatId,
        `🎯 *광고 카피 생성 중...*\n업종: ${escapeMarkdownV2(industry)}\n지역: ${escapeMarkdownV2(location)}${target ? `\n타겟: ${escapeMarkdownV2(target)}` : ''}`,
        { parse_mode: 'MarkdownV2' }
      );

      try {
        const campaign = await adRepository.createCampaign({
          industry,
          location,
          target,
          keywords: [],
          telegramChatId: String(chatId),
        });

        await adRepository.updateCampaignStatus(campaign.id, 'generating');

        const result = await adGeneratorService.generate({
          industry,
          location,
          target,
          keywords: [],
        });

        const allCopies = [
          ...result.initialCopies.map((content, idx) => ({
            campaignId: campaign.id,
            content,
            rank: idx + 1,
            filterStage: 'initial',
          })),
          ...result.top5Copies.map((content, idx) => ({
            campaignId: campaign.id,
            content,
            rank: idx + 1,
            filterStage: 'filtered',
          })),
          ...result.finalCopies.map((content, idx) => ({
            campaignId: campaign.id,
            content,
            rank: idx + 1,
            filterStage: 'final',
            isSelected: true,
          })),
        ];

        await adRepository.createCopies(allCopies);
        await adRepository.updateCampaignStatus(campaign.id, 'completed', {
          totalCopies: result.initialCopies.length,
          selectedCount: result.finalCopies.length,
        });

        let responseText = `✅ *광고 카피 생성 완료!*\n\n`;

        if (result.finalCopies.length > 0) {
          responseText += `*추천 카피 (${result.finalCopies.length}개):*\n`;
          result.finalCopies.forEach((copy, idx) => {
            responseText += `${idx + 1}. ${escapeMarkdownV2(copy)}\n`;
          });
        }

        if (result.top5Copies.length > 0 && result.top5Copies.length !== result.finalCopies.length) {
          responseText += `\n*필터링된 카피:*\n`;
          result.top5Copies.forEach((copy, idx) => {
            responseText += `${idx + 1}. ${escapeMarkdownV2(copy)}\n`;
          });
        }

        responseText += `\n⏱️ 생성 시간: ${(result.totalDuration / 1000).toFixed(1)}초`;

        await sendTelegramMessage(chatId, responseText, { parse_mode: 'MarkdownV2' });

        return NextResponse.json({ ok: true });
      } catch (error) {
        notificationLogger.error({ error: error instanceof Error ? error.message : String(error) }, '광고 생성 실패');
        await sendTelegramMessage(
          chatId,
          `❌ *광고 생성 실패*\n${error instanceof Error ? error.message : '알 수 없는 오류'}`
        );
        return NextResponse.json({ ok: true });
      }
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
