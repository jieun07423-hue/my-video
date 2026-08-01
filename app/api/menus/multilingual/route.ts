import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';

const translations: Record<string, Record<string, string>> = {
  en: {
    signatureSet: 'Signature Set Menu',
    americano: 'Iced Americano',
    orderNow: 'Order Now',
    paymentToss: 'Toss Pay / Easy Payment',
  },
  ja: {
    signatureSet: 'シグネチャーセットメニュー',
    americano: 'アイスアメリカーノ',
    orderNow: '今すぐ注文',
    paymentToss: 'トスペイ / 簡単決済',
  },
  zh: {
    signatureSet: '招牌套餐',
    americano: '冰美式咖啡',
    orderNow: '立即点餐',
    paymentToss: 'Toss Pay / 快捷支付',
  },
  ko: {
    signatureSet: '시그니처 세트메뉴',
    americano: '아이스 아메리카노',
    orderNow: '주문하기',
    paymentToss: '토스페이 / 간편결제',
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const langParam = searchParams.get('lang');
    const acceptLang = request.headers.get('accept-language') || 'ko';

    let lang = 'ko';
    if (langParam && translations[langParam]) {
      lang = langParam;
    } else if (acceptLang.includes('en')) {
      lang = 'en';
    } else if (acceptLang.includes('ja')) {
      lang = 'ja';
    } else if (acceptLang.includes('zh')) {
      lang = 'zh';
    }

    apiLogger.info({ lang, acceptLang }, '다국어 QR 메뉴 번역 반환');

    return NextResponse.json({
      success: true,
      language: lang,
      translations: translations[lang] || translations.ko,
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '다국어 메뉴 로딩 실패');
    return NextResponse.json({ success: false, error: '다국어 메뉴 로딩 실패' }, { status: 500 });
  }
}
