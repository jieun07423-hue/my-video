import { describe, it, expect, beforeEach } from '@jest/globals';
import { NoteRepository } from '../note.repository';
import { resetMockData } from '@/lib/db';

describe('NoteRepository', () => {
  let repository: NoteRepository;

  beforeEach(() => {
    resetMockData();
    repository = new NoteRepository();
  });

  describe('create', () => {
    it('노트를 생성해야 한다', async () => {
      const noteData = { businessId: 'B1', content: '내용' };
      const note = await repository.create(noteData);

      expect(note).toBeDefined();
      expect(note.content).toBe('내용');
      expect(note.businessId).toBe('B1');
    });
  });

  describe('search', () => {
    it('활성 노트를 조회해야 한다', async () => {
      const result = await repository.search({ page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total).toBeDefined();
    });
  });

  describe('softDelete', () => {
    it('노트를 소프트 삭제해야 한다', async () => {
      const note = await repository.create({ businessId: 'B1', content: '삭제 테스트' });
      const result = await repository.softDelete(note.id);

      expect(result).toBeDefined();
      expect(result.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('restore', () => {
    it('삭제된 노트를 복원해야 한다', async () => {
      const note = await repository.create({ businessId: 'B1', content: '복원 테스트' });
      await repository.softDelete(note.id);
      const result = await repository.restore(note.id);

      expect(result).toBeDefined();
      expect(result.deletedAt).toBeNull();
    });
  });

  describe('permanentDelete', () => {
    it('노트를 영구 삭제해야 한다', async () => {
      const note = await repository.create({ businessId: 'B1', content: '영구 삭제 테스트' });
      const result = await repository.permanentDelete(note.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(note.id);
    });
  });
});
