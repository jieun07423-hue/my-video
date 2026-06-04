import type { Note } from '@prisma/client';

interface DeletedNoteRowProps {
  note: Note & { business: { name: string } };
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  isRestoring: boolean;
  isDeleting: boolean;
}

export function DeletedNoteRow({
  note,
  onRestore,
  onPermanentDelete,
  isRestoring,
  isDeleting,
}: DeletedNoteRowProps) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="p-4">{note.title || '(제목 없음)'}</td>
      <td className="p-4 max-w-xs truncate">{note.content}</td>
      <td className="p-4">{note.business.name}</td>
      <td className="p-4">
        {note.deletedAt ? new Date(note.deletedAt).toLocaleDateString('ko-KR') : '-'}
      </td>
      <td className="p-4 space-x-2">
        <button
          onClick={() => onRestore(note.id)}
          disabled={isRestoring}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {isRestoring ? '복원 중...' : '복원'}
        </button>
        <button
          onClick={() => onPermanentDelete(note.id)}
          disabled={isDeleting}
          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isDeleting ? '삭제 중...' : '영구 삭제'}
        </button>
      </td>
    </tr>
  );
}
