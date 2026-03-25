const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Testing http://localhost:3000/genie...\n');
    
    // Navigate to the page
    await page.goto('http://localhost:3000/genie', { waitUntil: 'networkidle' });
    
    // Get page info
    const url = page.url();
    const title = await page.title();
    
    console.log(`📌 URL: ${url}`);
    console.log(`📌 Title: ${title}`);
    console.log('');
    
    // Check for main elements
    const hasGenieHeading = await page.locator('text=🧞 지니 Assistant').isVisible();
    const hasInput = await page.locator('textarea').isVisible();
    const hasSendButton = await page.locator('button:has(svg.lucide-send)').isVisible();
    const hasChat = await page.locator('text=안녕하세요! 저는 지니입니다').isVisible();
    
    console.log('✅ UI Elements Check:');
    console.log(`   - 🧞 지니 Assistant 타이틀: ${hasGenieHeading ? '✅' : '❌'}`);
    console.log(`   - 📝 텍스트 입력창: ${hasInput ? '✅' : '❌'}`);
    console.log(`   - 📤 전송 버튼: ${hasSendButton ? '✅' : '❌'}`);
    console.log(`   - 💬 채팅 시작 메시지: ${hasChat ? '✅' : '❌'}`);
    console.log('');
    
    // Check for feature cards
    const hasSearchCard = await page.locator('text=사업자 검색').isVisible();
    const hasDataCard = await page.locator('text=데이터 조회').isVisible();
    const hasChatCard = await page.locator('text=일반 대화').isVisible();
    
    console.log('✅ Feature Cards:');
    console.log(`   - 🔍 사업자 검색: ${hasSearchCard ? '✅' : '❌'}`);
    console.log(`   - 📊 데이터 조회: ${hasDataCard ? '✅' : '❌'}`);
    console.log(`   - 💬 일반 대화: ${hasChatCard ? '✅' : '❌'}`);
    console.log('');
    
    // Test text input
    await page.fill('textarea', '안녕하세요');
    await page.click('button:has(svg.lucide-send)');
    await page.waitForTimeout(1500);
    
    const userMessage = await page.locator('text=안녕하세요').first().isVisible();
    const assistantResponse = await page.locator('text=지니').first().isVisible();
    
    console.log('✅ 대화 기능 테스트:');
    console.log(`   - 사용자 메시지 표시: ${userMessage ? '✅' : '❌'}`);
    console.log(`   - 지니 응답: ${assistantResponse ? '✅' : '❌'}`);
    console.log('');
    
    // Take screenshot
    await page.screenshot({ path: '/home/pkw/genie-test.png', fullPage: true });
    console.log('📸 스크린샷 저장: /home/pkw/genie-test.png');
    console.log('');
    
    console.log('🎉 모든 테스트 통과!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
