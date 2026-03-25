#!/usr/bin/env node

/**
 * 성능 테스트 스크립트
 * 대용량 데이터 처리 시 Repository의 성능을 측정합니다
 */

const { performance } = require('perf_hooks');

// Mock 데이터 생성기
function generateMockBusinesses(count) {
  const businesses = [];
  const businessTypes = ['식당', '카페', '의류', '미용실', '편의점', '약국', '학원', '병원'];
  const districts = ['강남구', '서초구', '마포구', '영등포구', '송파구', '강동구'];
  const streets = ['테헤란로', '강남대로', '마포대로', '영등포로', '송파대로'];
  
  for (let i = 0; i < count; i++) {
    const businessType = businessTypes[i % businessTypes.length];
    const district = districts[i % districts.length];
    const street = streets[i % streets.length];
    const number = Math.floor(Math.random() * 1000) + 1;
    
    businesses.push({
      bizesId: `TEST${String(i + 1).padStart(6, '0')}`,
      name: `${businessType} 테스트 ${i + 1}`,
      roadNameAddress: `서울시 ${district} ${street} ${number}`,
      lotNumberAddress: `서울시 ${district} 테스트동 ${number}-${Math.floor(Math.random() * 100)}`,
      phone: `02-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
      businessName: businessType,
      status: ['active', 'inactive', 'pending', 'dissolved'][i % 4],
      recordStatus: ['new', 'synced', 'verified'][i % 3],
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      latitude: (37.4 + Math.random() * 0.3).toFixed(8),
      longitude: (126.8 + Math.random() * 0.4).toFixed(8),
      businessCode: String(Math.floor(Math.random() * 90000) + 10000),
      indsLclsCd: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
      indsLclsNm: ['음식', '도소매', '서비스'][Math.floor(Math.random() * 3)],
      indsMclsCd: String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 99),
      indsMclsNm: businessType,
      indsSclsCd: String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 99) + 'A',
      indsSclsNm: `${businessType} 세부`,
      dataSource: 'performance-test'
    });
  }
  
  return businesses;
}

// 간단한 In-Memory Repository (테스트용)
class InMemoryRepository {
  constructor() {
    this.businesses = [];
  }
  
  async createMany(data) {
    const startTime = performance.now();
    this.businesses.push(...data);
    const endTime = performance.now();
    
    return {
      count: data.length,
      duration: endTime - startTime,
      memory: process.memoryUsage()
    };
  }
  
  async search(options = {}) {
    const startTime = performance.now();
    const { search, status, recordStatus, businessCode, page = 1, limit = 20 } = options;
    
    let filtered = [...this.businesses];
    
    // 검색 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(searchLower) ||
        b.roadNameAddress?.toLowerCase().includes(searchLower) ||
        b.businessName?.toLowerCase().includes(searchLower)
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
    
    const endTime = performance.now();
    
    return {
      items: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
      duration: endTime - startTime,
      memory: process.memoryUsage()
    };
  }
  
  async getStats() {
    const startTime = performance.now();
    const stats = {
      total: this.businesses.length,
      newRecords: this.businesses.filter(b => b.recordStatus === 'new').length,
      active: this.businesses.filter(b => b.status === 'active').length,
      inactive: this.businesses.filter(b => b.status === 'inactive').length,
      dissolved: this.businesses.filter(b => b.status === 'dissolved').length,
      pending: this.businesses.filter(b => b.status === 'pending').length,
      synced: this.businesses.filter(b => b.recordStatus === 'synced').length,
      verified: this.businesses.filter(b => b.recordStatus === 'verified').length,
      duration: 0,
      memory: process.memoryUsage()
    };
    
    const endTime = performance.now();
    stats.duration = endTime - startTime;
    
    return stats;
  }
}

// 성능 테스트 실행기
async function runPerformanceTests() {
  console.log('🚀 Small Business Tracker 성능 테스트 시작\n');
  
  const testSizes = [100, 1000, 5000, 10000];
  const results = [];
  
  for (const size of testSizes) {
    console.log(`📊 테스트 크기: ${size.toLocaleString()}건\n`);
    
    const repository = new InMemoryRepository();
    
    // 1. 대량 생성 테스트
    console.log('  1️⃣ 대량 생성 테스트...');
    const mockData = generateMockBusinesses(size);
    const createResult = await repository.createMany(mockData);
    
    console.log(`     ✅ ${size}건 생성: ${createResult.duration.toFixed(2)}ms`);
    console.log(`     💾 메모리 사용: ${(createResult.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    
    // 2. 검색 성능 테스트
    console.log('  2️⃣ 검색 성능 테스트...');
    
    // 기본 검색
    const search1 = await repository.search({ page: 1, limit: 20 });
    console.log(`     🔍 기본 검색: ${search1.duration.toFixed(2)}ms (${search1.total}/${search1.total}건)`);
    
    // 이름으로 검색
    const search2 = await repository.search({ search: '테스트', page: 1, limit: 20 });
    console.log(`     🔍 이름 검색: ${search2.duration.toFixed(2)}ms (${search2.items.length}/${search2.total}건)`);
    
    // 상태 필터링
    const search3 = await repository.search({ status: 'active', page: 1, limit: 20 });
    console.log(`     🔍 상태 필터: ${search3.duration.toFixed(2)}ms (${search3.items.length}/${search3.total}건)`);
    
    // 복합 검색
    const search4 = await repository.search({ 
      search: '식당', 
      status: 'active', 
      page: 1, 
      limit: 20 
    });
    console.log(`     🔍 복합 검색: ${search4.duration.toFixed(2)}ms (${search4.items.length}/${search4.total}건)`);
    
    // 3. 통계 조회 테스트
    console.log('  3️⃣ 통계 조회 테스트...');
    const stats = await repository.getStats();
    console.log(`     📈 통계 조회: ${stats.duration.toFixed(2)}ms`);
    console.log(`     💾 메모리 사용: ${(stats.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    
    // 4. 페이지네이션 테스트
    console.log('  4️⃣ 페이지네이션 테스트...');
    const paginationTimes = [];
    for (let page = 1; page <= Math.min(10, Math.ceil(size / 20)); page++) {
      const paginationResult = await repository.search({ page, limit: 20 });
      paginationTimes.push(paginationResult.duration);
    }
    const avgPaginationTime = paginationTimes.reduce((a, b) => a + b, 0) / paginationTimes.length;
    console.log(`     📄 페이지네이션 평균: ${avgPaginationTime.toFixed(2)}ms`);
    
    results.push({
      size,
      create: createResult.duration,
      search: {
        basic: search1.duration,
        name: search2.duration,
        status: search3.duration,
        complex: search4.duration,
        pagination: avgPaginationTime
      },
      stats: stats.duration,
      memory: stats.memory.heapUsed / 1024 / 1024
    });
    
    console.log('');
  }
  
  // 결과 요약
  console.log('📋 성능 테스트 결과 요약');
  console.log('=' * 60);
  
  results.forEach(result => {
    console.log(`\n📊 데이터 ${result.size.toLocaleString()}건:`);
    console.log(`   생성: ${result.create.toFixed(2)}ms`);
    console.log(`   검색: 기본 ${result.search.basic.toFixed(2)}ms | 이름 ${result.search.name.toFixed(2)}ms | 상태 ${result.search.status.toFixed(2)}ms | 복합 ${result.search.complex.toFixed(2)}ms`);
    console.log(`   통계: ${result.stats.toFixed(2)}ms`);
    console.log(`   메모리: ${result.memory.toFixed(2)}MB`);
  });
  
  // 성능 병목 분석
  console.log('\n🔍 성능 병목 분석');
  console.log('=' * 60);
  
  const lastResult = results[results.length - 1];
  const firstResult = results[0];
  
  console.log(`\n📈 성능 확장성:`);
  console.log(`   데이터 ${firstResult.size}건 → ${lastResult.size}건 (${(lastResult.size / firstResult.size).toFixed(1)}배 증가)`);
  console.log(`   생성 시간: ${firstResult.create.toFixed(2)}ms → ${lastResult.create.toFixed(2)}ms (${(lastResult.create / firstResult.create).toFixed(2)}배 증가)`);
  console.log(`   검색 시간: ${firstResult.search.basic.toFixed(2)}ms → ${lastResult.search.basic.toFixed(2)}ms (${(lastResult.search.basic / firstResult.search.basic).toFixed(2)}배 증가)`);
  
  // 성능 권장사항
  console.log('\n💡 성능 최적화 권장사항:');
  
  if (lastResult.create > 100) {
    console.log('   ⚠️  대량 생성 속도가 100ms를 초과했습니다. Batch 처리를 고려해주세요.');
  }
  
  if (lastResult.search.basic > 10) {
    console.log('   ⚠️  기본 검색 속도가 10ms를 초과했습니다. 인덱스 최적화를 고려해주세요.');
  }
  
  if (lastResult.memory > 100) {
    console.log('   ⚠️  메모리 사용량이 100MB를 초과했습니다. 데이터 파티셔닝을 고려해주세요.');
  }
  
  if (lastResult.search.complex > lastResult.search.basic * 3) {
    console.log('   ⚠️  복합 검색이 기본 검색보다 3배 이상 느립니다. 쿼리 최적화가 필요합니다.');
  }
  
  console.log('\n✅ 성능 테스트 완료!');
  
  return results;
}

// 스크립트 실행
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = { runPerformanceTests, generateMockBusinesses, InMemoryRepository };