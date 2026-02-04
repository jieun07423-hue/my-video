import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  })
}

function AllTheProviders({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient?: QueryClient
}) {
  const testQueryClient = queryClient || createTestQueryClient()

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

export function renderWithProviders(ui: React.ReactElement, options?: CustomRenderOptions) {
  const { queryClient, ...renderOptions } = options || {}

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <AllTheProviders queryClient={queryClient}>
        {children}
      </AllTheProviders>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

export function createMockRouter() {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }
}

export function mockNextUseRouter() {
  jest.mock('next/navigation', () => ({
    useRouter() {
      return createMockRouter()
    },
    usePathname() {
      return '/'
    },
    useSearchParams() {
      return new URLSearchParams()
    },
  }))
}

export function createMockBusiness(overrides = {}) {
  return {
    id: 'test-business-1',
    bizesId: '12345678',
    name: '테스트 사업체',
    roadNameAddress: '서울시 강남구 테헤란로 123',
    lotNumberAddress: '서울시 강남구 역삼동 123-45',
    phone: '02-1234-5678',
    businessCode: '0101',
    businessName: '식당',
    status: 'active',
    recordStatus: 'verified',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}
