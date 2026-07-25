import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const qrCode = await db.qrCode.findUnique({ where: { id: params.id } });
    if (!qrCode) {
      return NextResponse.json({ error: 'QR 코드를 찾을 수 없습니다.' }, { status: 404 });
    }

    const updated = await db.qrCode.update({
      where: { id: params.id },
      data: { scanCount: { increment: 1 } },
    });

    apiLogger.info({ qrCodeId: params.id, scanCount: updated.scanCount }, 'QR code scanned');
    return NextResponse.json({ success: true, data: { scanCount: updated.scanCount } });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to track QR scan');
    return NextResponse.json({ error: '스캔 추적에 실패했습니다.' }, { status: 500 });
  }
}