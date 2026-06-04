import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { noteRepository } from '@/lib/repositories/note.repository';

describe('/api/notes/[id]/restore API Route', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('노트를 정상적으로 복원해야 한다', async () => {
    const mockNote = { id: '1', content: '복원된 노트' };
    jest.spyOn(noteRepository, 'restore').mockResolvedValue(mockNote);

    const req = new NextRequest('http://localhost/api/notes/1/restore');
    const res = await POST(req, { params: { id: '1' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe('복원 성공');
    expect(data.note).toEqual(mockNote);
    expect(noteRepository.restore).toHaveBeenCalledWith('1');
  });

  it('존재하지 않는 노트 복원 시 404 에러를 반환해야 한다', async () => {
    jest.spyOn(noteRepository, 'restore').mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/notes/999/restore');
    const res = await POST(req, { params: { id: '999' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('노트를 찾을 수 없습니다');
  });

  it('서버 오류 발생 시 500 에러를 반환해야 한다', async () => {
    jest.spyOn(noteRepository, 'restore').mockRejectedValue(new Error('DB Error'));

    const req = new NextRequest('http://localhost/api/notes/1/restore');
    const res = await POST(req, { params: { id: '1' } });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('복원 실패');
  });
});
