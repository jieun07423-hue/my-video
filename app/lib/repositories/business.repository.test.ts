import { describe, it, expect, beforeEach } from '@jest/globals'
import { BusinessRepository } from './business.repository'
import { staticBusinessRepository } from '../db-static'

jest.mock('../db-static', () => ({
  staticBusinessRepository: {
    createMany: jest.fn(),
    search: jest.fn(),
    findByBizesId: jest.fn(),
    upsertMany: jest.fn(),
    markAsVerified: jest.fn(),
    markAsSynced: jest.fn(),
    getStats: jest.fn(),
    getById: jest.fn(),
    getDistinctBusinessCodes: jest.fn(),
  },
}))

jest.mock('../../lib/logger', () => ({
  dbLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

describe('BusinessRepository', () => {
  let repository: BusinessRepository

  beforeEach(() => {
    repository = new BusinessRepository()
    jest.clearAllMocks()
  })

  describe('createMany', () => {
    it('should create multiple businesses', async () => {
      const businesses = [
        {
          bizesId: 'TEST001',
          name: '테스트 사업체1',
          roadNameAddress: '서울시 강남구',
          lotNumberAddress: null,
          phone: '02-1234-5678',
          latitude: 37.5172,
          longitude: 127.0473,
          businessCode: '12345',
          businessName: '식당',
          indsLclsCd: 'I',
          indsLclsNm: '음식',
          indsMclsCd: 'I12',
          indsMclsNm: '커피',
          indsSclsCd: 'I12A',
          indsSclsNm: '카페',
          status: 'active' as const,
          recordStatus: 'new' as const,
          dataSource: 'test'
        }
      ]

      const mockResult = { count: 1 }
      jest.mocked(staticBusinessRepository.createMany).mockResolvedValue(mockResult)

      const result = await repository.createMany(businesses)

      expect(staticBusinessRepository.createMany).toHaveBeenCalledWith(businesses)
      expect(result).toEqual(mockResult)
    })
  })

  describe('search', () => {
    it('should search businesses with default options', async () => {
      const mockResponse = {
        items: [
          {
            id: '1',
            bizesId: 'TEST001',
            name: '테스트 사업체',
            status: 'active',
            recordStatus: 'new'
          }
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      }

      jest.mocked(staticBusinessRepository.search).mockResolvedValue(mockResponse)

      const result = await repository.search({})

      expect(staticBusinessRepository.search).toHaveBeenCalledWith({
        page: 1,
        limit: 20
      })
      expect(result).toEqual(mockResponse)
    })

    it('should search businesses with filters', async () => {
      const options = {
        search: '테스트',
        status: 'active' as const,
        recordStatus: 'new' as const,
        page: 2,
        limit: 10
      }

      const mockResponse = {
        items: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0
      }

      jest.mocked(staticBusinessRepository.search).mockResolvedValue(mockResponse)

      const result = await repository.search(options)

      expect(staticBusinessRepository.search).toHaveBeenCalledWith(options)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('findByBizesId', () => {
    it('should find business by bizesId', async () => {
      const mockBusiness = {
        id: '1',
        bizesId: 'TEST001',
        name: '테스트 사업체'
      }

      jest.mocked(staticBusinessRepository.findByBizesId).mockResolvedValue(mockBusiness)

      const result = await repository.findByBizesId('TEST001')

      expect(staticBusinessRepository.findByBizesId).toHaveBeenCalledWith('TEST001')
      expect(result).toEqual(mockBusiness)
    })

    it('should return null when business not found', async () => {
      jest.mocked(staticBusinessRepository.findByBizesId).mockResolvedValue(null)

      const result = await repository.findByBizesId('NOTFOUND')

      expect(staticBusinessRepository.findByBizesId).toHaveBeenCalledWith('NOTFOUND')
      expect(result).toBeNull()
    })
  })

  describe('markAsVerified', () => {
    it('should mark business as verified', async () => {
      const mockBusiness = {
        id: '1',
        bizesId: 'TEST001',
        name: '테스트 사업체',
        recordStatus: 'verified'
      }

      jest.mocked(staticBusinessRepository.markAsVerified).mockResolvedValue(mockBusiness)

      const result = await repository.markAsVerified('TEST001')

      expect(staticBusinessRepository.markAsVerified).toHaveBeenCalledWith('TEST001')
      expect(result).toEqual(mockBusiness)
    })
  })

  describe('markAsSynced', () => {
    it('should mark business as synced', async () => {
      const mockBusiness = {
        id: '1',
        bizesId: 'TEST001',
        name: '테스트 사업체',
        recordStatus: 'synced'
      }

      jest.mocked(staticBusinessRepository.markAsSynced).mockResolvedValue(mockBusiness)

      const result = await repository.markAsSynced('TEST001')

      expect(staticBusinessRepository.markAsSynced).toHaveBeenCalledWith('TEST001')
      expect(result).toEqual(mockBusiness)
    })
  })

  describe('getStats', () => {
    it('should return business statistics', async () => {
      const mockStats = {
        total: 100,
        newToday: 5,
        newRecords: 10,
        active: 80,
        inactive: 15
      }

      jest.mocked(staticBusinessRepository.getStats).mockResolvedValue(mockStats)

      const result = await repository.getStats()

      expect(staticBusinessRepository.getStats).toHaveBeenCalled()
      expect(result).toEqual(mockStats)
    })
  })

  describe('getById', () => {
    it('should get business by id', async () => {
      const mockBusiness = {
        id: '1',
        bizesId: 'TEST001',
        name: '테스트 사업체'
      }

      jest.mocked(staticBusinessRepository.getById).mockResolvedValue(mockBusiness)

      const result = await repository.getById('1')

      expect(staticBusinessRepository.getById).toHaveBeenCalledWith('1')
      expect(result).toEqual(mockBusiness)
    })
  })

  describe('getDistinctBusinessCodes', () => {
    it('should return distinct business codes', async () => {
      const mockCodes = [
        { businessCode: '12345', businessName: '식당' },
        { businessCode: '54321', businessName: '카페' }
      ]

      jest.mocked(staticBusinessRepository.getDistinctBusinessCodes).mockResolvedValue(mockCodes)

      const result = await repository.getDistinctBusinessCodes()

      expect(staticBusinessRepository.getDistinctBusinessCodes).toHaveBeenCalled()
      expect(result).toEqual(mockCodes)
    })
  })
})