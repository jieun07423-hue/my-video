'use client';

import Navbar from '@/components/Navbar';
import { DeletedNoteTable } from './_components/DeletedNoteTable';
import { useDeletedNotes, useRestoreNote, usePermanentDeleteNote } from '@/lib/hooks/useNotes';
import { useQueryClient } from '@tanstack/react-query';

export const dynamic = 'force-dynamic';

export default function DeletedNotesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useDeletedNotes({ page: 1, limit: 20 });
  const restoreMutation = useRestoreNote();
  const deleteMutation = usePermanentDeleteNote();

  const handleRestore = (id: string) => {
    restoreMutation.mutate(id);
  };

  const handlePermanentDelete = (id: string) => {
    if (confirm('정말로 이 노트를 영구 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">삭제된 노트</h1>
          <p className="mt-2 text-sm text-gray-600">
            삭제된 노트를 복원하거나 영구 삭제할 수 있습니다.
          </p>
        </div>

        {isLoading && (
          <div className="text-center py-8">로딩 중...</div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500">
            오류가 발생했습니다: {error.message}
          </div>
        )}

        {data && (
          <>
            <DeletedNoteTable
              notes={data.items}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
              isRestoring={restoreMutation.isPending}
              isDeleting={deleteMutation.isPending}
            />
            {data.totalPages > 1 && (
              <div className="mt-4 flex justify-center space-x-2">
                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`px-3 py-1 rounded ${
                      page === data.page ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
