import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { syncLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await db.seoulPermit.findUnique({ where: { id: params.id } });

    if (!item) {
      return NextResponse.json({ error: '해당 정보를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    syncLogger.error({ error: error instanceof Error ? error.message : String(error), id: params.id }, 'Failed to fetch Seoul permit');
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}
