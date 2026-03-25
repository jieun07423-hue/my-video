import { test, expect } from '@playwright/test';
import { businessRepository } from '@/app/lib/repositories/business.repository';
import { apiLogger } from '@/app/lib/logger';

test.describe('Small Business Tracker E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('http://localhost:3000/auth/signin');
    
    // 로그인 처리
    await page.fill('[data-testid="username"]', 'admin');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="signin-button"]');
    
    // 대시보드 페이지로 이동 대기
    await page.waitForURL('http://localhost:3000/dashboard');
  });

  test('대시보드 페이지 로드', async ({ page }) => {
    // 대시보드 페이지가 제대로 로드되는지 확인
    await expect(page.locator('h1')).toHaveText('소상공인 대시보드');
    
    // 통계 카드들이 렌더링되는지 확인
    const statCards = page.locator('[data-testid^="stat-card-"]');
    await expect(statCards.first()).toBeVisible();
    
    // 새로고운 소상공인 목록 확인
    const recentBusinesses = page.locator('[data-testid="recent-businesses"]');
    await expect(recentBusinesses.first()).toBeVisible();
  });

  test('소상공인 목록 페이지', async ({ page }) => {
    // 소상공인 목록 페이지로 이동
    await page.click('[data-testid="businesses-nav-link"]');
    await page.waitForURL('http://localhost:3000/businesses');
    
    // 페이지 제목 확인
    await expect(page.locator('h1')).toHaveText('소상공인 목록');
    
    // 목록이 렌더링되는지 확인
    const businessTable = page.locator('[data-testid="business-table"]');
    await expect(businessTable.first()).toBeVisible();
    
    // 검색 기능 테스트
    await page.fill('[data-testid="search-input"]', '테스트 사업체');
    await page.click('[data-testid="search-button"]');
    
    // 검색 결과 확인
    await expect(page.locator('[data-testid="business-row"]').first()).toContainText('테스트 사업체');
  });

  test('소상공인 상세 정보', async ({ page }) => {
    // 상세 정보 페이지로 이동
    await page.goto('http://localhost:3000/businesses/test-id');
    
    // 상세 정보 확인
    await expect(page.locator('[data-testid="business-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="business-name"]')).toHaveText('테스트 사업체');
    await expect(page.locator('[data-testid="business-status"]')).toHaveText('활성');
  });

  test('API 엔드포인트 테스트', async ({ page }) => {
    // API 엔드포인트 페이지로 이동
    await page.click('[data-testid="api-docs-nav-link"]');
    await page.waitForURL('http://localhost:3000/api-docs');
    
    // Swagger UI가 보이는지 확인
    await expect(page.locator('h1')).toContainText('API 문서');
    await expect(page.locator('[data-testid="swagger-ui"]')).toBeVisible();
  });

  test('반응형 및 오류 처리', async ({ page }) => {
    // 모바일 뷰 테스트를 위해 뷰포트 크기 조정
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 존재하지 않는 소상공인 페이지 접근
    await page.goto('http://localhost:3000/businesses/non-existent');
    
    // 404 에러 페이지로 리다이렉트되는지 확인
    await expect(page.locator('h1')).toHaveText('페이지를 찾을 수 없습니다');
    await expect(page.locator('[data-testid="error-code"]')).toHaveText('404');
    await expect(page.locator('[data-testid="back-button"]')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // 테스트 실행 후 API 로깅
    apiLogger.info({ 
      test: 'e2e', 
      browser: 'chromium', 
      result: 'passed' 
    }, 'E2E 테스트 완료');
  });
});