import { IncomingWebhook } from '@slack/webhook';
import { notificationLogger } from '@/lib/logger';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

let webhook: IncomingWebhook | null = null;

if (SLACK_WEBHOOK_URL) {
  webhook = new IncomingWebhook(SLACK_WEBHOOK_URL, {
    username: '소상공인 동기화 알림',
    icon_emoji: ':store:',
  });
  notificationLogger.info('Slack 웹훅 초기화됨');
} else {
  notificationLogger.warn('SLACK_WEBHOOK_URL 환경변수가 설정되지 않음');
}

export interface NewBusinessNotification {
  businessId: string;
  name: string;
  address: string;
  businessType: string | null;
}

export interface SyncStats {
  totalFetched: number;
  totalSynced: number;
  newRecords: number;
  updatedRecords: number;
  errors: number;
}

export async function notifyNewBusiness(business: NewBusinessNotification) {
  if (!webhook) {
    return;
  }

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:new: *신규 소상공인 등록됨*`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*상호명:*\n${business.name}`,
        },
        {
          type: 'mrkdwn',
          text: `*업종:*\n${business.businessType || 'N/A'}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*주소:*\n${business.address}`,
      },
    },
  ];

  await webhook.send({ blocks });
  notificationLogger.info({ businessId: business.businessId }, '신규 소상공인 Slack 알림 전송');
}

export async function notifySyncStart() {
  if (!webhook) {
    return;
  }

  await webhook.send({
    text: `:arrows_counterclockwise: 소상공인 데이터 동기화 시작`,
  });
  notificationLogger.info('동기화 시작 Slack 알림 전송');
}

export async function notifySyncComplete(stats: SyncStats, duration: number) {
  if (!webhook) {
    return;
  }

  const durationSeconds = (duration / 1000).toFixed(2);
  const durationMinutes = (duration / 60000).toFixed(2);

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: ':white_check_mark: 동기화 완료',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*전체 조회:*\n${stats.totalFetched}`,
        },
        {
          type: 'mrkdwn',
          text: `*동기화 완료:*\n${stats.totalSynced}`,
        },
        {
          type: 'mrkdwn',
          text: `*신규 레코드:*\n${stats.newRecords}`,
        },
        {
          type: 'mrkdwn',
          text: `*수정 레코드:*\n${stats.updatedRecords}`,
        },
        {
          type: 'mrkdwn',
          text: `*오류:*\n${stats.errors}`,
        },
        {
          type: 'mrkdwn',
          text: `*소요 시간:*\n${durationSeconds}초 (${durationMinutes}분)`,
        },
      ],
    },
  ];

  await webhook.send({ blocks });
  notificationLogger.info({ stats, duration }, '동기화 완료 Slack 알림 전송');
}

export async function notifySyncError(error: Error) {
  if (!webhook) {
    return;
  }

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:x: *동기화 실패*\n\`\`\`${error.message}\`\`\``,
      },
    },
  ];

  await webhook.send({ blocks });
  notificationLogger.error({ error: error.message }, '동기화 실패 Slack 알림 전송');
}

export async function notifyError(error: string, context?: Record<string, unknown>) {
  if (!webhook) {
    return;
  }

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:warning: *오류 발생*\n\`\`\`${error}\`\`\``,
      },
    },
  ];

  if (context) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``,
      },
    });
  }

  await webhook.send({ blocks });
  notificationLogger.error({ error, context }, '오류 Slack 알림 전송');
}

export default {
  notifyNewBusiness,
  notifySyncStart,
  notifySyncComplete,
  notifySyncError,
  notifyError,
};
