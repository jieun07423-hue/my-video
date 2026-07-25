import { NextRequest, NextResponse } from 'next/server';
import { noteRepository } from '@/lib/repositories/note.repository';
import { noteLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const note = await noteRepository.restore(params.id);
    if (!note) {
      return NextResponse.json({ error: '노트를 찾을 수 없습니다' }, { status: 404 });
    }
    noteLogger.info({ noteId: params.id }, '노트 복원 완료');
    return NextResponse.json({ message: '복원 성공', note });
  } catch (error) {
    noteLogger.error({ error: error instanceof Error ? error.message : String(error), noteId: params.id }, '노트 복원 실패');
    return NextResponse.json({ error: '복원 실패' }, { status: 500 });
  }
}
