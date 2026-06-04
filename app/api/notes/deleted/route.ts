import { NextRequest, NextResponse } from 'next/server';
import { noteRepository } from '@/lib/repositories/note.repository';
import { noteLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await noteRepository.findDeleted({ page, limit });
    noteLogger.info({ count: result.items.length }, '삭제된 노트 조회 완료');
    return NextResponse.json(result);
  } catch (error) {
    noteLogger.error({ error: error.message }, '삭제된 노트 조회 실패');
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}
