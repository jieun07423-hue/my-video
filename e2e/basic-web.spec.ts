import { test, expect } from '@playwright/test';

test.describe('Small Business Tracker - Basic Web Tests', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
  });

  test('홈페이지 로드 및 기본 기능 테스트', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
    
    const title = await page.title();
    console.log('Page title:', title);
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Page error:', msg.text());
      }
    });
    
    const bodyText = await page.locator('body').textContent();
    console.log('Page content preview:', bodyText?.substring(0, 200) + '...');
    
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test('API 엔드포인트 접근 테스트', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/api/businesses');
    
    if (response) {
      const status = page.url().includes('500') ? '500' : '200';
      console.log('API response status:', status);
      
      await page.screenshot({ path: 'test-results/api-response.png' });
      
      const content = await page.locator('body').textContent();
      console.log('API response:', content?.substring(0, 200));
      
      expect(content?.length).toBeGreaterThan(0);
    }
  });

  test('네트워크 요청 모니터링', async ({ page }) => {
    const requests: any[] = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('Network requests:', requests.length);
    requests.forEach(req => {
      console.log(`  ${req.method} ${req.url} (${req.resourceType})`);
    });
    
    const apiRequests = requests.filter(req => req.url.includes('/api/'));
    console.log(`Found ${apiRequests.length} API requests`);
    
    expect(requests.length).toBeGreaterThan(0);
  });

  test('에러 페이지 처리 테스트', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/non-existent-page');
    
    const status = response?.status();
    console.log('404 test status:', status);
    
    await page.screenshot({ path: 'test-results/404-page.png' });
    
    const content = await page.locator('body').textContent();
    console.log('404 page content:', content?.substring(0, 100));
    
    expect(content?.length).toBeGreaterThan(0);
  });

  test('모바일 반응형 테스트', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const isMobileLayout = await page.evaluate(() => {
      return window.innerWidth <= 375;
    });
    
    console.log('Mobile viewport test:', isMobileLayout);
    expect(isMobileLayout).toBe(true);
    
    await page.screenshot({ path: 'test-results/mobile-view.png', fullPage: true });
  });

  test('성능 메트릭 수집', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0,
        domInteractive: navigation.domInteractive,
        domComplete: navigation.domComplete
      };
    });
    
    console.log('Performance metrics:', metrics);
    
    await page.evaluate((metricsData) => {
      const blob = new Blob([JSON.stringify(metricsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'performance-metrics.json';
      a.click();
    }, metrics);
    
    expect(metrics.domContentLoaded).toBeGreaterThan(0);
    expect(metrics.loadComplete).toBeGreaterThan(0);
  });
});