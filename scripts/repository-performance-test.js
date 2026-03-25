#!/usr/bin/env node

/**
 * 실제 Repository 성능 테스트
 * 현재 Repository 구현의 성능을 측정하고 병목 지점을 분석합니다
 */

const path = require('path');
const { performance } = require('perf_hooks');

// 프로젝트 경로 설정
const projectRoot = __dirname + '/..';
process.chdir(projectRoot);

// 실제 Repository 임포트
let businessRepository;
try {
  // 정적 모드로 실행 (실제 DB 없이)
  process.env.DATABASE_URL = ''; // 정적 모드 활성화
  
  // CommonJS 방식으로 임포트
  const repoPath = path.join(projectRoot, 'app/lib/repositories/business.repository.js');
  delete require.cache[require.resolve(repoPath)];
  const repoModule = require(repoPath);
  
  businessRepository = repoModule.businessRepository;
  console.log('✅ Repository 로드 성공 (정적 모드)');
} catch (error) {
  console.error('❌ Repository 로드 실패:', error.message);
  process.exit(1);
}

// 대량 테스트 데이터 생성기
function generateTestData(count) {
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
      bizesId: `PERF${String(i + 1).padStart(6, '0')}`,
      name: `${businessType} 성능테스트 ${i + 1}`,
      roadNameAddress: `서울시 ${district} ${street} ${number}`,
      lotNumberAddress: `서울시 ${district} 테스트동 ${number}-${Math.floor(Math.random() * 100)}`,
      phone: `02-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
      businessName: businessType,
      status: ['active', 'inactive', 'pending', 'dissolved'][i % 4],
      recordStatus: ['new', 'synced', 'verified'][i % 3],
      latitude: parseFloat((37.4 + Math.random() * 0.3).toFixed(8)),
      longitude: parseFloat((126.8 + Math.random() * 0.4).toFixed(8)),
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

// 성능 측정 헬퍼 함수
async function measurePerformance(fn, description) {
  const startMemory = process.memoryUsage();
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    return {
      success: true,
      result,
      duration: endTime - startTime,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      },
      memory: endMemory
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      success: false,
      error: error.message,
      duration: endTime - startTime,
      memory: process.memoryUsage()
    };
  }
}

// Repository 성능 테스트
async function testRepositoryPerformance() {
  console.log('🔧 Small Business Tracker Repository 성능 테스트\n');
  
  const testSizes = [100, 500, 1000];
  const results = [];
  
  for (const size of testSizes) {
    console.log(`📊 테스트 크기: ${size.toLocaleString()}건\n`);
    
    const testData = generateTestData(size);
    const testResults = {};
    
    // 1. 대량 생성 테스트
    console.log('  1️⃣ 대량 생성 테스트...');
    const createResult = await measurePerformance(
      () => businessRepository.createMany(testData),
      '대량 생성'
    );
    
    if (createResult.success) {
      console.log(`     ✅ ${size}건 생성: ${createResult.duration.toFixed(2)}ms`);
      console.log(`     💾 메모리 변화: ${(createResult.memoryDelta.heapUsed / 1024).toFixed(2)}KB`);
    } else {
      console.log(`     ❌ 생성 실패: ${createResult.error}`);
    }
    
    testResults.create = createResult;
    
    // 잠시 대기하여 처리 시간 확보
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 2. 검색 성능 테스트
    console.log('  2️⃣ 검색 성능 테스트...');
    
    // 기본 검색
    const searchBasic = await measurePerformance(
      () => businessRepository.search({ page: 1, limit: 20 }),
      '기본 검색'
    );
    
    if (searchBasic.success) {
      console.log(`     🔍 기본 검색: ${searchBasic.duration.toFixed(2)}ms (${searchBasic.result.items.length}/${searchBasic.result.total}건)`);
    }
    
    // 이름으로 검색
    const searchName = await measurePerformance(
      () => businessRepository.search({ search: '성능테스트', page: 1, limit: 20 }),
      '이름 검색'
    );
    
    if (searchName.success) {
      console.log(`     🔍 이름 검색: ${searchName.duration.toFixed(2)}ms (${searchName.result.items.length}/${searchName.result.total}건)`);
    }
    
    // 상태 필터링
    const searchStatus = await measurePerformance(
      () => businessRepository.search({ status: 'active', page: 1, limit: 20 }),
      '상태 필터'
    );
    
    if (searchStatus.success) {
      console.log(`     🔍 상태 필터: ${searchStatus.duration.toFixed(2)}ms (${searchStatus.result.items.length}/${searchStatus.result.total}건)`);
    }
    
    testResults.search = { basic: searchBasic, name: searchName, status: searchStatus };
    
    // 3. 통계 조회 테스트
    console.log('  3️⃣ 통계 조회 테스트...');
    const statsResult = await measurePerformance(
      () => businessRepository.getStats(),
      '통계 조회'
    );
    
    if (statsResult.success) {
      console.log(`     📈 통계 조회: ${statsResult.duration.toFixed(2)}ms`);
    }
    
    testResults.stats = statsResult;
    
    // 4. 개별 조회 테스트
    if (testData.length > 0) {
      console.log('  4️⃣ 개별 조회 테스트...');
      const getByIdResult = await measurePerformance(
        () => businessRepository.getById(testData[0].bizesId),
        '개별 조회'
      );
      
      if (getByIdResult.success) {
        console.log(`     🔎 개별 조회: ${getByIdResult.duration.toFixed(2)}ms`);
      }
      
      testResults.getById = getByIdResult;
    }
    
    results.push({ size, results: testResults });
    console.log('');
  }
  
  // 결과 분석
  console.log('📋 Repository 성능 분석 결과');
  console.log('=' * 60);
  
  results.forEach(({ size, results: testResults }) => {
    console.log(`\n📊 데이터 ${size.toLocaleString()}건:`);
    
    if (testResults.create.success) {
      console.log(`   생성: ${testResults.create.duration.toFixed(2)}ms`);
    }
    
    if (testResults.search.basic.success) {
      console.log(`   검색: 기본 ${testResults.search.basic.duration.toFixed(2)}ms | 이름 ${testResults.search.name.duration.toFixed(2)}ms | 상태 ${testResults.search.status.duration.toFixed(2)}ms`);
    }
    
    if (testResults.stats.success) {
      console.log(`   통계: ${testResults.stats.duration.toFixed(2)}ms`);
    }
    
    if (testResults.getById && testResults.getById.success) {
      console.log(`   개별 조회: ${testResults.getById.duration.toFixed(2)}ms`);
    }
  });
  
  // 성능 병목 식별
  console.log('\n🔍 Repository 성능 병목 분석');
  console.log('=' * 60);
  
  const lastResult = results[results.length - 1];
  const testResults = lastResult.results;
  
  const bottlenecks = [];
  
  if (testResults.create.success && testResults.create.duration > 50) {
    bottlenecks.push({
      type: 'CREATE',
      severity: 'HIGH',
      value: testResults.create.duration,
      threshold: 50,
      recommendation: 'Batch 처리 크기 조정 또는 비동기 처리 고려'
    });
  }
  
  if (testResults.search.basic.success && testResults.search.basic.duration > 10) {
    bottlenecks.push({
      type: 'SEARCH_BASIC',
      severity: 'MEDIUM',
      value: testResults.search.basic.duration,
      threshold: 10,
      recommendation: '기본 인덱스 최적화 및 쿼리 튜닝'
    });
  }
  
  if (testResults.stats.success && testResults.stats.duration > 20) {
    bottlenecks.push({
      type: 'STATS',
      severity: 'MEDIUM',
      value: testResults.stats.duration,
      threshold: 20,
      recommendation: '통계 캐싱 또는 집계 테이블 도입'
    });
  }
  
  if (bottlenecks.length === 0) {
    console.log('✅ 현재 성능은 양호합니다. 특별한 병목이 발견되지 않았습니다.');
  } else {
    console.log('⚠️ 다음과 같은 성능 병목이 발견되었습니다:\n');
    
    bottlenecks.forEach(bottleneck => {
      const severityIcon = bottleneck.severity === 'HIGH' ? '🔴' : '🟡';
      console.log(`${severityIcon} ${bottleneck.type}: ${bottleneck.value.toFixed(2)}ms (기준: ${bottleneck.threshold}ms)`);
      console.log(`   권장 조치: ${bottleneck.recommendation}\n`);
    });
  }
  
  return results;
}

// 스크립트 실행
if (require.main === module) {
  testRepositoryPerformance().catch(console.error);
}

module.exports = { testRepositoryPerformance, generateTestData };