import pino from 'pino';
import { chromium, type Browser, type Page } from 'playwright';

const logger = pino({ name: 'blog-poster-service' });

const NAVER_CONFIG = {
  blogUrl: 'https://blog.naver.com',
  loginUrl: 'https://nid.naver.com/nidlogin.login',
  writeUrl: 'https://blog.naver.com/BlogWriteForm.nhn',
};

export interface BlogPostParams {
  title: string;
  content: string;
  category?: string;
}

export interface BlogPostResult {
  success: boolean;
  postUrl?: string;
  error?: string;
}

export class BlogPosterService {
  private browser: Browser | null = null;
  private isLoggedIn: boolean = false;

  async initialize() {
    if (this.browser) return;

    logger.info('브라우저 초기화 시작');
    this.browser = await chromium.launch({
      headless: process.env.NODE_ENV !== 'development',
    });
    logger.info('브라우저 초기화 완료');
  }

  async postToNaverBlog(params: BlogPostParams): Promise<BlogPostResult> {
    await this.initialize();

    const page = await this.browser!.newPage();

    try {
      logger.info({ title: params.title }, '네이버 블로그 포스팅 시작');

      await this.loginToNaver(page);

      await page.goto(NAVER_CONFIG.writeUrl, { waitUntil: 'networkidle' });

      await this.fillBlogPost(page, params);

      const postUrl = await this.extractPostUrl(page);

      logger.info({ postUrl }, '블로그 포스팅 완료');

      return { success: true, postUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage }, '블로그 포스팅 오류');
      return { success: false, error: errorMessage };
    } finally {
      await page.close();
    }
  }

  private async loginToNaver(page: Page) {
    if (this.isLoggedIn) return;

    logger.info('네이버 로그인 시작');

    const naverId = process.env.NAVER_BLOG_ID;
    const naverPassword = process.env.NAVER_BLOG_PASSWORD;

    if (!naverId || !naverPassword) {
      throw new Error('NAVER_BLOG_ID 또는 NAVER_BLOG_PASSWORD 환경변수가 설정되지 않았습니다');
    }

    await page.goto(NAVER_CONFIG.loginUrl, { waitUntil: 'networkidle' });

    await page.fill('#id', naverId);
    await page.fill('#pw', naverPassword);
    await page.click('#log.login');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    this.isLoggedIn = true;
    logger.info('네이버 로그인 완료');
  }

  private async fillBlogPost(page: Page, params: BlogPostParams) {
    await page.waitForSelector('#SE-editor-0', { timeout: 10000 });

    await page.fill('#SE-editor-0', params.title);

    await page.click('#SE-editor-0');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    await page.fill('#SE-editor-0', params.content);

    await page.waitForTimeout(1000);
  }

  private async extractPostUrl(page: Page): Promise<string> {
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    
    const postIdMatch = currentUrl.match(/post\.naver\.com\/(\w+)\/(\d+)/);
    if (postIdMatch) {
      return `https://blog.naver.com/${postIdMatch[1]}/${postIdMatch[2]}`;
    }

    return currentUrl;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isLoggedIn = false;
    }
  }
}

export const blogPosterService = new BlogPosterService();