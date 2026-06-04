import { describe, it, expect, beforeEach } from '@jest/globals'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import { noteRepository } from '../repositories/note.repository'
import { useDeletedNotes, useRestoreNote, usePermanentDeleteNote } from './useNotes'

jest.mock('../repositories/note.repository', () => ({
  noteRepository: {
    findDeleted: jest.fn(),
    restore: jest.fn(),
    permanentDelete: jest.fn(),
  },
}))

describe('useDeletedNotes', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    jest.clearAllMocks()
  })

  it('삭제된 노트 목록을 조회해야 한다', async () => {
    const mockNotes = [
      { id: 'note-1', businessId: 'B1', content: '삭제된 노트1', deletedAt: new Date() },
      { id: 'note-2', businessId: 'B2', content: '삭제된 노트2', deletedAt: new Date() },
    ]
    const mockResponse = {
      items: mockNotes,
      total: 2,
      page: 1,
      limit: 20,
    }

    jest.mocked(noteRepository.findDeleted).mockResolvedValue(mockResponse as any)

    const { result } = renderHook(() => useDeletedNotes(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(noteRepository.findDeleted).toHaveBeenCalledWith({})
    expect(result.current.data).toEqual(mockResponse)
  })

  it('커스텀 페이지네이션 옵션으로 조회해야 한다', async () => {
    const mockResponse = {
      items: [],
      total: 0,
      page: 2,
      limit: 10,
    }

    jest.mocked(noteRepository.findDeleted).mockResolvedValue(mockResponse as any)

    const { result } = renderHook(
      () => useDeletedNotes({ page: 2, limit: 10 }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(noteRepository.findDeleted).toHaveBeenCalledWith({ page: 2, limit: 10 })
  })

  it('에러 시 error 상태를 반환해야 한다', async () => {
    jest.mocked(noteRepository.findDeleted).mockRejectedValue(new Error('조회 실패'))

    const { result } = renderHook(() => useDeletedNotes(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})

describe('useRestoreNote', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    jest.clearAllMocks()
  })

  it('노트를 복원해야 한다', async () => {
    const mockRestoredNote = { id: 'note-1', businessId: 'B1', content: '복원됨', deletedAt: null }
    jest.mocked(noteRepository.restore).mockResolvedValue(mockRestoredNote as any)

    const { result } = renderHook(() => useRestoreNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('note-1')
    })

    expect(noteRepository.restore).toHaveBeenCalledWith('note-1')
    expect(result.current.isSuccess).toBe(true)
  })

  it('복원 실패 시 에러를 처리해야 한다', async () => {
    jest.mocked(noteRepository.restore).mockRejectedValue(new Error('복원 실패'))

    const { result } = renderHook(() => useRestoreNote(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync('note-1')
      } catch (e) {}
    })

    expect(noteRepository.restore).toHaveBeenCalledWith('note-1')
    expect(result.current.isError).toBe(true)
  })
})

describe('usePermanentDeleteNote', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    jest.clearAllMocks()
  })

  it('노트를 영구 삭제해야 한다', async () => {
    const mockDeletedNote = { id: 'note-1', businessId: 'B1', content: '삭제됨' }
    jest.mocked(noteRepository.permanentDelete).mockResolvedValue(mockDeletedNote as any)

    const { result } = renderHook(() => usePermanentDeleteNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('note-1')
    })

    expect(noteRepository.permanentDelete).toHaveBeenCalledWith('note-1')
    expect(result.current.isSuccess).toBe(true)
  })

  it('영구 삭제 실패 시 에러를 처리해야 한다', async () => {
    jest.mocked(noteRepository.permanentDelete).mockRejectedValue(new Error('영구 삭제 실패'))

    const { result } = renderHook(() => usePermanentDeleteNote(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync('note-1')
      } catch (e) {}
    })

    expect(noteRepository.permanentDelete).toHaveBeenCalledWith('note-1')
    expect(result.current.isError).toBe(true)
  })
})
