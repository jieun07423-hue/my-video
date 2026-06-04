import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DELETE } from '../route';
import { NextRequest } from 'next/server';
import { noteRepository } from '@/lib/repositories/note.repository';

describe('/api/notes/[id]/permanent API Route', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('노트를 정상적으로 영구 삭제해야 한다', async () => {
    jest.spyOn(noteRepository, 'permanentDelete').mockResolvedValue(true);

    const req = new NextRequest('http://localhost/api/notes/1/permanent');
    const res = await DELETE(req, { params: { id: '1' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe('영구 삭제 성공');
    expect(noteRepository.permanentDelete).toHaveBeenCalledWith('1');
  });

  it('존재하지 않는 노트 삭제 시 404 에러를 반환해야 한다', async () => {
    jest.spyOn(noteRepository, 'permanentDelete').mockResolvedValue(false);

    const req = new NextRequest('http://localhost/api/notes/999/permanent');
    const res = await DELETE(req, { params: { id: '999' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('노트를 찾을 수 없습니다');
  });

  it('서버 오류 발생 시 500 에러를 반환해야 한다', async () => {
    jest.spyOn(noteRepository, 'permanentDelete').mockRejectedValue(new Error('DB Error'));

    const req = new NextRequest('http://localhost/api/notes/1/permanent');
    const res = await DELETE(req, { params: { id: '1' } });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('영구 삭제 실패');
  });
});
