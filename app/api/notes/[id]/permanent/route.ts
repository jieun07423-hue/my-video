import { NextRequest, NextResponse } from 'next/server';
import { noteRepository } from '@/lib/repositories/note.repository';
import { noteLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await noteRepository.permanentDelete(params.id);
    if (!result) {
      return NextResponse.json({ error: '노트를 찾을 수 없습니다' }, { status: 404 });
    }
    noteLogger.info({ noteId: params.id }, '노트 영구 삭제 완료');
    return NextResponse.json({ message: '영구 삭제 성공' });
  } catch (error) {
    noteLogger.error({ error: error instanceof Error ? error.message : String(error), noteId: params.id }, '노트 영구 삭제 실패');
    return NextResponse.json({ error: '영구 삭제 실패' }, { status: 500 });
  }
}
