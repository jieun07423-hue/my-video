import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { businessRepository } from '../repositories/business.repository'
import { useBusinesses, useBusinessStats, useBusinessById } from './useBusinesses'

jest.mock('../repositories/business.repository', () => ({
  businessRepository: {
    search: jest.fn(),
    getStats: jest.fn(),
    getById: jest.fn(),
  },
}))

describe('useBusinesses', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    wrapper = ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
    jest.clearAllMocks()
  })

  it('fetches businesses with default options', async () => {
    const mockBusinesses = [
      { id: '1', name: '사업체1' },
      { id: '2', name: '사업체2' },
    ]
    const mockResponse = {
      items: mockBusinesses,
      total: 2,
      page: 1,
      limit: 20,
    }

    jest.mocked(businessRepository.search).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useBusinesses(), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true)

    expect(businessRepository.search).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    })
    expect(result.current.data).toEqual(mockResponse)
  })

  it('fetches businesses with custom options', async () => {
    const mockResponse = {
      items: [{ id: '1', name: '사업체1' }],
      total: 1,
      page: 2,
      limit: 10,
    }

    jest.mocked(businessRepository.search).mockResolvedValue(mockResponse)

    const { result } = renderHook(
      () => useBusinesses({ page: 2, limit: 10, status: 'active' }),
      {
        wrapper: ({ children }) => (
          <queryClient.Provider client={queryClient}>{children}</queryClient.Provider>
        ),
      }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true)

    expect(businessRepository.search).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      status: 'active',
    })
  })

  it('handles error state', async () => {
    const mockError = new Error('조회 실패')
    jest.mocked(businessRepository.search).mockRejectedValue(mockError)

    const { result } = renderHook(() => useBusinesses(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })
})

describe('useBusinessStats', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    jest.clearAllMocks()
  })

  it('fetches business statistics', async () => {
    const mockStats = {
      total: 100,
      active: 50,
      inactive: 30,
      dissolved: 20,
    }

    jest.mocked(businessRepository.getStats).mockResolvedValue(mockStats)

    const { result } = renderHook(() => useBusinessStats(), {
      wrapper: ({ children }) => (
        <queryClient.Provider client={queryClient}>{children}</queryClient.Provider>
      ),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(businessRepository.getStats).toHaveBeenCalled()
    expect(result.current.data).toEqual(mockStats)
  })
})

describe('useBusinessById', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    jest.clearAllMocks()
  })

  it('fetches business by id', async () => {
    const mockBusiness = {
      id: 'test-id',
      name: '테스트 사업체',
    }

    jest.mocked(businessRepository.getById).mockResolvedValue(mockBusiness)

    const { result } = renderHook(() => useBusinessById('test-id'), {
      wrapper: ({ children }) => (
        <queryClient.Provider client={queryClient}>{children}</queryClient.Provider>
      ),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(businessRepository.getById).toHaveBeenCalledWith('test-id')
    expect(result.current.data).toEqual(mockBusiness)
  })

  it('does not fetch when id is empty', () => {
    jest.mocked(businessRepository.getById).mockClear()

    renderHook(() => useBusinessById(''), {
      wrapper: ({ children }) => (
        <queryClient.Provider client={queryClient}>{children}</queryClient.Provider>
      ),
    })

    expect(businessRepository.getById).not.toHaveBeenCalled()
  })
})
