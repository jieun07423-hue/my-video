import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, campaignId, type, label, targetUrl } = body;

    if (!storeId || !type) {
      return NextResponse.json(
        { error: '스토어 ID와 QR 타입은 필수입니다.' },
        { status: 400 }
      );
    }

    const qrCode = await db.qrCode.create({
      data: {
        storeId,
        type,
        label: label || null,
        targetUrl: targetUrl || '/',
        scanCount: 0,
      },
    });

    apiLogger.info({ qrCodeId: qrCode.id, type }, 'QR code created');
    return NextResponse.json({ success: true, data: qrCode }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to create QR code');
    return NextResponse.json({ error: 'QR 코드 생성에 실패했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = {};
    if (storeId) where.storeId = storeId;
    if (type) where.type = type;

    const qrCodes = await db.qrCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: qrCodes });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to list QR codes');
    return NextResponse.json({ error: 'QR 코드 목록 조회에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'QR 코드 ID가 필요합니다.' }, { status: 400 });
    }
    await db.qrCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to delete QR code');
    return NextResponse.json({ error: 'QR 코드 삭제에 실패했습니다.' }, { status: 500 });
  }
}