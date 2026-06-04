import type { Note } from '@prisma/client';
import { DeletedNoteRow } from './DeletedNoteRow';

interface DeletedNoteTableProps {
  notes: (Note & { business: { name: string } })[] ;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  isRestoring: boolean;
  isDeleting: boolean;
}

export function DeletedNoteTable({
  notes,
  onRestore,
  onPermanentDelete,
  isRestoring,
  isDeleting,
}: DeletedNoteTableProps) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        삭제된 노트가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-4">제목</th>
            <th className="p-4">내용</th>
            <th className="p-4">비즈니스</th>
            <th className="p-4">삭제일</th>
            <th className="p-4">작업</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => (
            <DeletedNoteRow
              key={note.id}
              note={note}
              onRestore={onRestore}
              onPermanentDelete={onPermanentDelete}
              isRestoring={isRestoring}
              isDeleting={isDeleting}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
