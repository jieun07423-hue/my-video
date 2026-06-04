import db from '@/lib/db';
import { noteLogger } from '@/lib/logger';

export interface CreateNoteInput {
  businessId: string;
  title?: string;
  content: string;
}

export interface SearchNotesOptions {
  page?: number;
  limit?: number;
}

export class NoteRepository {
  async create(data: CreateNoteInput) {
    noteLogger.info({ businessId: data.businessId }, '노트 생성 시작');
    const note = await db.note.create({
      data: {
        businessId: data.businessId,
        title: data.title,
        content: data.content,
      },
    });
    noteLogger.info({ noteId: note.id }, '노트 생성 완료');
    return note;
  }

  async findDeleted(options: SearchNotesOptions = {}) {
    const { page = 1, limit = 20 } = options;
    const where = { deletedAt: { not: null } };
    const [items, total] = await Promise.all([
      db.note.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { deletedAt: 'desc' },
        include: { business: true },
      }),
      db.note.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async softDelete(id: string) {
    noteLogger.info({ noteId: id }, '노트 소프트 삭제 시작');
    const note = await db.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    noteLogger.info({ noteId: id }, '노트 소프트 삭제 완료');
    return note;
  }

  async restore(id: string) {
    noteLogger.info({ noteId: id }, '노트 복원 시작');
    const note = await db.note.update({
      where: { id },
      data: { deletedAt: null },
    });
    noteLogger.info({ noteId: id }, '노트 복원 완료');
    return note;
  }

  async permanentDelete(id: string) {
    noteLogger.info({ noteId: id }, '노트 영구 삭제 시작');
    const result = await db.note.delete({
      where: { id },
    });
    noteLogger.info({ noteId: id }, '노트 영구 삭제 완료');
    return result;
  }

  async search(options: SearchNotesOptions = {}) {
    const { page = 1, limit = 20 } = options;
    const where = { deletedAt: null };
    const [items, total] = await Promise.all([
      db.note.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { business: true },
      }),
      db.note.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const noteRepository = new NoteRepository();
