import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { noteRepository } from '@/lib/repositories/note.repository';

describe('/api/notes/deleted API Route', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('삭제된 노트를 정상적으로 반환해야 한다', async () => {
    const mockNotes = {
      items: [{ id: '1', content: '삭제된 노트 1' }],
      totalCount: 1,
      page: 1,
      limit: 20,
    };
    jest.spyOn(noteRepository, 'findDeleted').mockResolvedValue(mockNotes);

    const req = new NextRequest('http://localhost/api/notes/deleted?page=1&limit=20');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(mockNotes);
    expect(noteRepository.findDeleted).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('파라미터가 없을 때 기본값(1, 20)으로 조회해야 한다', async () => {
    const mockNotes = {
      items: [],
      totalCount: 0,
      page: 1,
      limit: 20,
    };
    jest.spyOn(noteRepository, 'findDeleted').mockResolvedValue(mockNotes);

    const req = new NextRequest('http://localhost/api/notes/deleted');
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    expect(noteRepository.findDeleted).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('서버 오류 발생 시 500 에러를 반환해야 한다', async () => {
    jest.spyOn(noteRepository, 'findDeleted').mockRejectedValue(new Error('DB Error'));

    const req = new NextRequest('http://localhost/api/notes/deleted');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('조회 실패');
  });
});
