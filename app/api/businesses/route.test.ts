import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { businessRepository } from '../../lib/repositories/business.repository'

jest.mock('../../lib/repositories/business.repository', () => ({
  businessRepository: {
    search: jest.fn(),
    createMany: jest.fn(),
  },
}))
jest.mock('../../lib/logger', () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

describe('/api/businesses', () => {
  let mockRequest: Partial<NextRequest>

  beforeEach(() => {
    mockRequest = {
      url: 'http://localhost:3000/api/businesses',
      json: jest.fn(),
    }
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET', () => {
    it('returns businesses with default pagination', async () => {
      const mockResponse = {
        items: [{ id: '1', name: '사업체1' }],
        total: 1,
        page: 1,
        limit: 20,
      }

      jest.mocked(businessRepository.search).mockResolvedValue(mockResponse)

      const response = await GET(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResponse)
      expect(businessRepository.search).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        status: undefined,
        recordStatus: undefined,
        businessCode: undefined,
      })
    })

    it('returns businesses with custom pagination', async () => {
      mockRequest.url = 'http://localhost:3000/api/businesses?page=2&limit=10'

      const mockResponse = {
        items: [],
        total: 0,
        page: 2,
        limit: 10,
      }

      jest.mocked(businessRepository.search).mockResolvedValue(mockResponse)

      const response = await GET(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(businessRepository.search).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: undefined,
        status: undefined,
        recordStatus: undefined,
        businessCode: undefined,
      })
    })

    it('returns businesses with filters', async () => {
      mockRequest.url = 'http://localhost:3000/api/businesses?status=active&recordStatus=verified'

      const mockResponse = {
        items: [{ id: '1', name: '사업체1' }],
        total: 1,
        page: 1,
        limit: 20,
      }

      jest.mocked(businessRepository.search).mockResolvedValue(mockResponse)

      const response = await GET(mockRequest as NextRequest)

      expect(response.status).toBe(200)
      expect(businessRepository.search).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        status: 'active',
        recordStatus: 'verified',
        businessCode: undefined,
      })
    })

    it('returns businesses with search term', async () => {
      mockRequest.url = 'http://localhost:3000/api/businesses?search=테스트'

      const mockResponse = {
        items: [{ id: '1', name: '테스트 사업체' }],
        total: 1,
        page: 1,
        limit: 20,
      }

      jest.mocked(businessRepository.search).mockResolvedValue(mockResponse)

      const response = await GET(mockRequest as NextRequest)

      expect(response.status).toBe(200)
      expect(businessRepository.search).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: '테스트',
        status: undefined,
        recordStatus: undefined,
        businessCode: undefined,
      })
    })

    it('handles errors gracefully', async () => {
      jest.mocked(businessRepository.search).mockRejectedValue(
        new Error('조회 실패')
      )

      const response = await GET(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
    })
  })

  describe('POST', () => {
    it('creates a single business', async () => {
      const mockBusiness = {
        bizesId: '12345678',
        name: '새 사업체',
        status: 'active' as const,
        recordStatus: 'new' as const,
        dataSource: 'test',
      }

      mockRequest.json = jest.fn().mockResolvedValue(mockBusiness)

      const mockResult = { count: 1 }
      jest.mocked(businessRepository.createMany).mockResolvedValue(mockResult)

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockResult)
      expect(businessRepository.createMany).toHaveBeenCalledWith([mockBusiness])
    })

    it('creates multiple businesses', async () => {
      const mockBusinesses = [
        {
          bizesId: '12345678',
          name: '사업체1',
          status: 'active' as const,
          recordStatus: 'new' as const,
          dataSource: 'test',
        },
        {
          bizesId: '12345679',
          name: '사업체2',
          status: 'active' as const,
          recordStatus: 'new' as const,
          dataSource: 'test',
        },
      ]

      mockRequest.json = jest.fn().mockResolvedValue(mockBusinesses)

      const mockResult = { count: 2 }
      jest.mocked(businessRepository.createMany).mockResolvedValue(mockResult)

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockResult)
      expect(businessRepository.createMany).toHaveBeenCalledWith(mockBusinesses)
    })

    it('handles creation errors', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({})

      jest.mocked(businessRepository.createMany).mockRejectedValue(
        new Error('생성 실패')
      )

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('handles invalid request body', async () => {
      mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

      const response = await POST(mockRequest as NextRequest)

      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })
})

describe('/api/businesses', () => {
  let mockRequest: Partial<NextRequest>

  beforeEach(() => {
    mockRequest = {
      url: 'http://localhost:3000/api/businesses',
      json: jest.fn(),
    }
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET', () => {
    it('returns businesses with default pagination', async () => {
      const mockResponse = {
        items: [{ id: '1', name: '사업체1' }],
        total: 1,
        page: 1,
        limit: 20,
      }

      jest.mocked(businessRepository.search).mockResolvedValue(mockResponse)

      const response = await GET(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResponse)
      expect(businessRepository.search).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        status: undefined,
        recordStatus: undefined,
        businessCode: undefined,
      })
    })

    it('returns businesses with custom pagination', async () => {
      mockRequest.url = 'http://localhost:3000/api/businesses?page=2&limit=10'

      const mockResponse = {
        items: [],
        total: 0,
        page: 2,
        limit: 10,
      }

      jest.mocked(businessRepository.search).mockResolvedValue(mockResponse)

      const response = await GET(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(businessRepository.search).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: undefined,
        status: undefined,
        recordStatus: undefined,
        businessCode: undefined,
      })
    })

    it('returns businesses with filters', async () => {
      mockRequest.url = 'http://localhost:3000/api/businesses?status=active&recordStatus=verified'

      const mockResponse = {
        items: [{ id: '1', name: '사업체1' }],
        total: 1,
        page: 1,
        limit: 20,
      }

      jest.mocked(businessRepository.search).mockResolvedValue(mockResponse)

      const response = await GET(mockRequest as NextRequest)

      expect(response.status).toBe(200)
      expect(businessRepository.search).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        status: 'active',
        recordStatus: 'verified',
        businessCode: undefined,
      })
    })

    it('returns businesses with search term', async () => {
      mockRequest.url = 'http://localhost:3000/api/businesses?search=테스트'

      const mockResponse = {
        items: [{ id: '1', name: '테스트 사업체' }],
        total: 1,
        page: 1,
        limit: 20,
      }

      jest.mocked(businessRepository.search).mockResolvedValue(mockResponse)

      const response = await GET(mockRequest as NextRequest)

      expect(response.status).toBe(200)
      expect(businessRepository.search).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: '테스트',
        status: undefined,
        recordStatus: undefined,
        businessCode: undefined,
      })
    })

    it('handles errors gracefully', async () => {
      jest.mocked(businessRepository.search).mockRejectedValue(
        new Error('조회 실패')
      )

      const response = await GET(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
    })
  })

  describe('POST', () => {
    it('creates a single business', async () => {
      const mockBusiness = {
        bizesId: '12345678',
        name: '새 사업체',
        status: 'active' as const,
        recordStatus: 'new' as const,
        dataSource: 'test',
      }

      mockRequest.json = jest.fn().mockResolvedValue(mockBusiness)

      const mockResult = { count: 1 }
      jest.mocked(businessRepository.createMany).mockResolvedValue(mockResult)

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockResult)
      expect(businessRepository.createMany).toHaveBeenCalledWith([mockBusiness])
    })

    it('creates multiple businesses', async () => {
      const mockBusinesses = [
        {
          bizesId: '12345678',
          name: '사업체1',
          status: 'active' as const,
          recordStatus: 'new' as const,
          dataSource: 'test',
        },
        {
          bizesId: '12345679',
          name: '사업체2',
          status: 'active' as const,
          recordStatus: 'new' as const,
          dataSource: 'test',
        },
      ]

      mockRequest.json = jest.fn().mockResolvedValue(mockBusinesses)

      const mockResult = { count: 2 }
      jest.mocked(businessRepository.createMany).mockResolvedValue(mockResult)

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockResult)
      expect(businessRepository.createMany).toHaveBeenCalledWith(mockBusinesses)
    })

    it('handles creation errors', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({})

      jest.mocked(businessRepository.createMany).mockRejectedValue(
        new Error('생성 실패')
      )

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('handles invalid request body', async () => {
      mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

      const response = await POST(mockRequest as NextRequest)

      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })
})
