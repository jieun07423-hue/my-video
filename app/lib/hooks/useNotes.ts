import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noteRepository } from '@/lib/repositories/note.repository';
import { noteLogger } from '@/lib/logger';

export function useDeletedNotes(options: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['deleted-notes', options],
    queryFn: () => noteRepository.findDeleted(options),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRestoreNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => noteRepository.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-notes'] });
      noteLogger.info('노트 복원 성공');
    },
    onError: (error) => {
      noteLogger.error({ error: error.message }, '노트 복원 실패');
    },
  });
}

export function usePermanentDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => noteRepository.permanentDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-notes'] });
      noteLogger.info('노트 영구 삭제 성공');
    },
    onError: (error) => {
      noteLogger.error({ error: error.message }, '노트 영구 삭제 실패');
    },
  });
}
