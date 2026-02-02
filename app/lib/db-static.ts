import { dbLogger, syncLogger } from '@/app/lib/logger';
import type { CreateBusinessInput, SearchOptions } from '@/app/lib/repositories/business.repository';

const mockBusinesses = [
  {
    id: '1',
    bizesId: 'TEST001',
    name: '테스트 상가 1',
    roadNameAddress: '서울시 강남구 테헤란로 123',
    lotNumberAddress: '서울시 강남구 역삼동 123-45',
    phone: '02-123-4567',
    businessName: '카페',
    status: 'active',
    recordStatus: 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    latitude: '37.5172',
    longitude: '127.0473',
    businessCode: '12345',
    indsLclsCd: 'I',
    indsLclsNm: '음식',
    indsMclsCd: 'I12',
    indsMclsNm: '커피',
    indsSclsCd: 'I12A',
    indsSclsNm: '카페',
    dataSource: 'test'
  },
  {
    id: '2',
    bizesId: 'TEST002',
    name: '테스트 상가 2',
    roadNameAddress: '서울시 서초구 강남대로 456',
    lotNumberAddress: '서울시 서초구 서초동 456-78',
    phone: '02-987-6543',
    businessName: '식당',
    status: 'pending',
    recordStatus: 'synced',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    latitude: '37.4847',
    longitude: '127.0323',
    businessCode: '54321',
    indsLclsCd: 'I',
    indsLclsNm: '음식',
    indsMclsCd: 'I11',
    indsMclsNm: '한식',
    indsSclsCd: 'I11A',
    indsSclsNm: '일반한식',
    dataSource: 'test'
  },
  {
    id: '3',
    bizesId: 'TEST003',
    name: '테스트 상가 3',
    roadNameAddress: '서울시 마포구 마포대로 789',
    lotNumberAddress: '서울시 마포구 공덕동 789-10',
    phone: '02-555-7777',
    businessName: '의류',
    status: 'inactive',
    recordStatus: 'verified',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    latitude: '37.5663',
    longitude: '126.9019',
    businessCode: '98765',
    indsLclsCd: 'G',
    indsLclsNm: '도소매',
    indsMclsCd: 'G12',
    indsMclsNm: '의류',
    indsSclsCd: 'G12A',
    indsSclsNm: '일반의류',
    dataSource: 'test'
  }
];

class StaticBusinessRepository {
  async createMany(data: CreateBusinessInput[]) {
    dbLogger.info({ count: data.length }, '소상공인 대량 생성 시작');
    const result = { count: data.length };
    dbLogger.info({ created: result.count }, '소상공인 대량 생성 완료');
    return result;
  }

  async search(options: SearchOptions = {}) {
    const { search, status, recordStatus, businessCode, page = 1, limit = 20 } = options;
    let filtered = [...mockBusinesses];

    if (search) {
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.roadNameAddress?.toLowerCase().includes(search.toLowerCase()) ||
        b.businessName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status) {
      filtered = filtered.filter(b => b.status === status);
    }

    if (recordStatus) {
      filtered = filtered.filter(b => b.recordStatus === recordStatus);
    }

    if (businessCode) {
      filtered = filtered.filter(b => b.businessCode === businessCode);
    }

    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async findByBizesId(bizesId: string) {
    return mockBusinesses.find(b => b.bizesId === bizesId) || null;
  }

  async getById(id: string) {
    return mockBusinesses.find(b => b.id === id) || null;
  }

  async upsertMany(data: CreateBusinessInput[]) {
    return data.map(item => ({ ...item, id: item.bizesId }));
  }

  async markAsVerified(bizesId: string) {
    const business = mockBusinesses.find(b => b.bizesId === bizesId);
    if (business) {
      business.recordStatus = 'verified';
    }
    return business;
  }

  async markAsSynced(bizesId: string) {
    const business = mockBusinesses.find(b => b.bizesId === bizesId);
    if (business) {
      business.recordStatus = 'synced';
    }
    return business;
  }

  async getStats() {
    return {
      total: mockBusinesses.length,
      newToday: 1,
      newRecords: mockBusinesses.filter(b => b.recordStatus === 'new').length,
      active: mockBusinesses.filter(b => b.status === 'active').length,
      inactive: mockBusinesses.filter(b => b.status === 'inactive').length,
    };
  }

  async getDistinctBusinessCodes() {
    const codes = mockBusinesses
      .filter(b => b.businessCode)
      .map(b => ({ businessCode: b.businessCode, businessName: b.businessName }));
    return Array.from(new Set(codes.map(c => c.businessCode)))
      .map(code => codes.find(c => c.businessCode === code));
  }
}

class StaticSyncStateRepository {
  async getSyncState() {
    return {
      id: '1',
      dataSource: 'public-data-portal',
      lastSyncedAt: new Date(),
      syncStatus: 'idle',
      errorMessage: null,
      syncCount: 0,
      totalSynced: 0,
      newRecordsCount: 0,
      lastBusinessId: null as string | null,
    };
  }
}

export const staticBusinessRepository = new StaticBusinessRepository();
export const staticSyncStateRepository = new StaticSyncStateRepository();
