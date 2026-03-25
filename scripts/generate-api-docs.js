#!/usr/bin/env node

/**
 * API 문서 자동 생성 스크립트
 * Next.js API 라우트를 스캔하여 OpenAPI/Swagger 문서 생성
 */

const fs = require('fs');
const path = require('path');

// API 라우트 스캐너
class ApiRouteScanner {
  constructor() {
    this.apiRoutes = [];
    this.basePath = path.join(__dirname, '..', 'app', 'api');
  }

  scanApiRoutes() {
    console.log('🔍 API 라우트 스캔 중...');
    this.scanDirectory(this.basePath, '');
    console.log(`✅ ${this.apiRoutes.length}개의 API 라우트 발견`);
    return this.apiRoutes;
  }

  scanDirectory(dirPath, routePath) {
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        if (item === 'businesses') {
          // businesses 하위 폴더 스캔
          this.scanDirectory(itemPath, `${routePath}/businesses`);
        } else if (item.startsWith('[') && item.endsWith(']')) {
          // 동적 라우트 [slug], [id] 등
          const paramName = item.slice(1, -1);
          this.scanDirectory(itemPath, `${routePath}/{${paramName}}`);
        } else {
          this.scanDirectory(itemPath, `${routePath}/${item}`);
        }
      } else if (item === 'route.ts' || item === 'route.js') {
        // 라우트 파일 분석
        const fullPath = path.join(dirPath, item);
        this.analyzeRouteFile(fullPath, routePath);
      }
    }
  }

  analyzeRouteFile(filePath, routePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 기본 메서드 추출
      const methods = [];
      
      if (content.includes('export async function GET') || content.includes('export function GET')) {
        methods.push('GET');
      }
      if (content.includes('export async function POST') || content.includes('export function POST')) {
        methods.push('POST');
      }
      if (content.includes('export async function PUT') || content.includes('export function PUT')) {
        methods.push('PUT');
      }
      if (content.includes('export async function DELETE') || content.includes('export function DELETE')) {
        methods.push('DELETE');
      }
      if (content.includes('export async function PATCH') || content.includes('export function PATCH')) {
        methods.push('PATCH');
      }

      // 주석에서 설명 추출
      const description = this.extractDescription(content);
      
      // 파라미터 추출 (간단한)
      const parameters = this.extractParameters(content, routePath);
      
      // 응답 스키마 추출
      const responses = this.extractResponses(content);

      for (const method of methods) {
        this.apiRoutes.push({
          path: routePath === '' ? '/' : `/${routePath}`,
          method,
          description: description[method] || description.default || `${method} ${routePath}`,
          parameters: parameters[method] || [],
          responses: responses[method] || { '200': { description: 'Success' } },
          tags: this.extractTags(routePath)
        });
      }
    } catch (error) {
      console.warn(`⚠️ 라우트 분석 실패: ${filePath} - ${error.message}`);
    }
  }

  extractDescription(content) {
    const descriptions = { default: '' };
    
    // GET 메서드 설명
    const getMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^*]+)\s*\*\//);
    if (getMatch) {
      descriptions.GET = getMatch[1].trim();
      descriptions.default = getMatch[1].trim();
    }
    
    // POST 메서드 설명
    const postMatch = content.match(/export async function POST[^\/]*\/(?:.*\n)*?\s*\/\*\*\s*\n\s*\*\s*([^*]+)\s*\*\//);
    if (postMatch) {
      descriptions.POST = postMatch[1].trim();
    }

    return descriptions;
  }

  extractParameters(content, routePath) {
    const parameters = {};

    // URL 파라미터
    const urlParams = routePath.match(/{([^}]+)}/g);
    if (urlParams) {
      for (const param of urlParams) {
        const paramName = param.slice(1, -1);
        
        // 모든 메서드에 공통 URL 파라미터 추가
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(method => {
          if (!parameters[method]) parameters[method] = [];
          
          parameters[method].push({
            name: paramName,
            in: 'path',
            required: true,
            type: 'string',
            description: `${paramName} 파라미터`
          });
        });
      }
    }

    // Query 파라미터 (GET 요청)
    if (content.includes('searchParams')) {
      const queryParams = [
        { name: 'page', type: 'integer', description: '페이지 번호 (기본값: 1)' },
        { name: 'limit', type: 'integer', description: '페이지당 항목 수 (기본값: 20)' },
        { name: 'search', type: 'string', description: '검색어' },
        { name: 'status', type: 'string', description: '상태 필터' },
        { name: 'recordStatus', type: 'string', description: '레코드 상태 필터' }
      ];

      if (!parameters.GET) parameters.GET = [];
      parameters.GET.push(...queryParams);
    }

    return parameters;
  }

  extractResponses(content) {
    const responses = {};

    // 성공 응답
    ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(method => {
      responses[method] = {
        '200': {
          description: '성공',
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        '400': {
          description: '잘못된 요청'
        },
        '404': {
          description: '리소스를 찾을 수 없음'
        },
        '500': {
          description: '서버 내부 오류'
        }
      };
    });

    return responses;
  }

  extractTags(routePath) {
    const segments = routePath.split('/').filter(s => s && !s.startsWith('{'));
    
    if (segments.includes('businesses')) {
      return ['소상공인'];
    }
    if (segments.includes('auth')) {
      return ['인증'];
    }
    if (segments.includes('sync')) {
      return ['동기화'];
    }
    if (segments.includes('dashboard')) {
      return ['대시보드'];
    }
    
    return ['기본'];
  }
}

// OpenAPI 문서 생성기
class OpenApiGenerator {
  constructor() {
    this.scanner = new ApiRouteScanner();
    this.info = {
      title: 'Small Business Tracker API',
      version: '1.0.0',
      description: '소상공인 정보 관리를 위한 RESTful API',
      contact: {
        name: 'API Support',
        email: 'api@example.com'
      }
    };
  }

  generateOpenAPISpec() {
    console.log('📝 OpenAPI 명세 생성 중...');
    
    const routes = this.scanner.scanApiRoutes();
    
    const spec = {
      openapi: '3.0.0',
      info: this.info,
      servers: [
        {
          url: 'http://localhost:3000',
          description: '개발 서버'
        },
        {
          url: 'https://your-domain.com',
          description: '프로덕션 서버'
        }
      ],
      tags: this.generateTags(routes),
      paths: this.generatePaths(routes),
      components: {
        schemas: this.generateSchemas()
      }
    };

    console.log('✅ OpenAPI 명세 생성 완료');
    return spec;
  }

  generateTags(routes) {
    const tagSet = new Set();
    
    routes.forEach(route => {
      route.tags.forEach(tag => tagSet.add(tag));
    });

    return Array.from(tagSet).map(tag => ({
      name: tag,
      description: `${tag} 관련 API`
    }));
  }

  generatePaths(routes) {
    const paths = {};

    routes.forEach(route => {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }

      const operation = {
        summary: route.description,
        description: route.description,
        tags: route.tags,
        parameters: route.parameters,
        responses: route.responses
      };

      paths[route.path][route.method.toLowerCase()] = operation;
    });

    return paths;
  }

  generateSchemas() {
    return {
      Business: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '고유 ID' },
          bizesId: { type: 'string', description: '상가업소번호' },
          name: { type: 'string', description: '상호명' },
          roadNameAddress: { type: 'string', description: '도로명 주소' },
          lotNumberAddress: { type: 'string', description: '지번 주소' },
          phone: { type: 'string', description: '전화번호' },
          businessName: { type: 'string', description: '업종명' },
          status: { 
            type: 'string', 
            enum: ['pending', 'active', 'inactive', 'dissolved', 'pending_renewal'],
            description: '영업 상태'
          },
          recordStatus: {
            type: 'string',
            enum: ['new', 'synced', 'verified'],
            description: '레코드 상태'
          },
          createdAt: { type: 'string', format: 'date-time', description: '생성일' },
          updatedAt: { type: 'string', format: 'date-time', description: '수정일' }
        }
      },
      BusinessListResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Business' }
          },
          total: { type: 'integer', description: '전체 항목 수' },
          page: { type: 'integer', description: '현재 페이지' },
          limit: { type: 'integer', description: '페이지당 항목 수' },
          totalPages: { type: 'integer', description: '전체 페이지 수' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', description: '에러 메시지' }
        }
      }
    };
  }

  saveOpenAPISpec(spec, outputPath) {
    const jsonSpec = JSON.stringify(spec, null, 2);
    
    // JSON 파일로 저장
    fs.writeFileSync(outputPath, jsonSpec, 'utf8');
    console.log(`💾 OpenAPI JSON 저장: ${outputPath}`);
    
    // HTML 문서 생성
    this.generateHtmlDoc(spec, outputPath.replace('.json', '.html'));
  }

  generateHtmlDoc(spec, outputPath) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${this.info.title} - API Documentation</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .header { text-align: center; margin-bottom: 30px; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${this.info.title}</h1>
    <p>${this.info.description}</p>
    <p>Version: ${this.info.version}</p>
  </div>
  
  <div id="swagger-ui"></div>
  
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '${path.basename(outputPath)}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ]
      });
    }
  </script>
</body>
</html>`;
    
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`📄 API 문서 HTML 저장: ${outputPath}`);
  }
}

// 메인 실행 함수
async function generateApiDocumentation() {
  console.log('🚀 API 문서 자동 생성 시작\n');

  try {
    const generator = new OpenApiGenerator();
    const spec = generator.generateOpenAPISpec();
    
    const outputDir = path.join(__dirname, '..', 'public', 'api-docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const jsonPath = path.join(outputDir, 'openapi.json');
    const htmlPath = path.join(outputDir, 'index.html');
    
    generator.saveOpenAPISpec(spec, jsonPath);
    
    console.log('\n✅ API 문서 생성 완료!');
    console.log(`📁 출력 디렉토리: ${outputDir}`);
    console.log(`🌐 로컬 접근: http://localhost:3000/api-docs`);
    console.log(`📄 JSON 명세: ${jsonPath}`);
    console.log(`🌐 HTML 문서: ${htmlPath}`);
    
  } catch (error) {
    console.error('❌ API 문서 생성 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  generateApiDocumentation();
}

module.exports = { ApiRouteScanner, OpenApiGenerator, generateApiDocumentation };