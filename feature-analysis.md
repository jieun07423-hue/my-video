# WeMarket (Small Business Tracker) Feature & Architecture Analysis Report

## 1. 프로젝트 개요 (Overview)
- **플랫폼명**: WeMarket (SaaS QR Menu & Small Business Platform)
- **기술 스택**: Next.js 14 App Router, TypeScript (Strict Mode), Prisma ORM, PostgreSQL, Redis / BullMQ, Tailwind CSS, TanStack Query
- **아키텍처 패턴**: Repository 패턴, Service Layer, Event-Driven Architecture (EventEmitter), Server-Sent Events (SSE)

---

## 2. 데이터베이스 모델 및 스키마 현황 (Prisma Models)
실제 `prisma/schema.prisma` 기준 정의된 주요 모델 및 열거형(Enum):
- **핵심 엔티티**: `Admin`, `Business`, `SeoulPermit`, `Store`, `Product`, `Order`, `OrderItem`, `StockHistory`, `Menu`, `QrCode`, `Note`, `BusinessClaimRequest`, `WebhookEndpoint`, `WebhookDeliveryLog`, `Message`, `SystemSetting`, `AuditLog`, `SyncState`, `AdCampaign`, `AdCopy`
- **열거형 (Enums)**: `BusinessStatus`, `RecordStatus`, `EnrichmentStatus`, `AdminRole`, `AdCampaignStatus`, `AdCopyQuality`, `OrderStatus`, `StockChangeType`, `ClaimRequestStatus`, `WebhookDeliveryStatus`, `StorePlan`, `QrCodeType`

---

## 3. API 라우트 및 고도화 기능 현황 (API Routes & Features)
- **공공데이터 및 동기화**: `/api/sync`, `/api/sync/status`, `/api/webhook/sync`
- **소상공인 관리 및 검색**: `/api/businesses`, `/api/businesses/[id]`, `/api/businesses/enrichment`, `/api/businesses/metrics`, `/api/businesses/progress`
- **주문 및 재고 관리**: `/api/orders`, `/api/orders/[id]`, `/api/products`
- **QR 메뉴 및 다국어 지원**: `/api/menus`, `/api/menus/[id]`, `/api/menus/multilingual`, `/api/qrcodes`
- **결제 및 정산 자동화**: `/api/payments/toss`, `/api/settlements/toss`
- **실시간 KDS (주방 현황판)**: `/api/kds/stream` (SSE 기반 이벤트 브로드캐스트)
- **AI 인사이트 및 대시보드**: `/api/dashboard/ai-insights`, `/api/dashboard/stats`, `/api/dashboard/trends`
- **멀티 테넌시 RBAC 권한 관리**: `/api/auth/rbac`
- **알림 및 리워드 시스템**: `/api/notifications/alimtalk`, `/api/rewards`, `/api/mobile/devices`

---

## 4. 해결된 주요 기술적 이슈 & 고도화 (Resolved Issues & Enhancements)
1. **결정적 전화번호 암호화 (`phoneEncryption.ts`)**:
   - 기존 무작위 IV 방식의 AES-CBC 암호화로 인해 발생하던 DB 검색 불가 문제를 고정 IV 기반 결정적 암호화 및 블라인드 해시 인덱스(`hashForSearch`) 도입으로 해결.
2. **Redis 연결 장애 방어 (`redis.ts`)**:
   - 로컬 오프라인/테스트 환경에서 Redis 미실행 시 발생하는 `ECONNREFUSED` 에러를 우아하게 핸들링하고 재시도 전략을 최적화.
3. **Next.js 정적 렌더링 경고 해결**:
   - `request.url`을 사용하는 동적 API 라우트에 `export const dynamic = 'force-dynamic'` 명시하여 빌드 로그 정돈.
4. **CI/CD 및 보안 스캔 설정**:
   - GitHub Actions 워크플로우에 필요한 시크릿(`RENDER_DEPLOY_HOOK_URL`, `CLOUDFLARE_API_TOKEN`, `SNYK_TOKEN`) 설정 가이드 수립.

---

## 5. 배포 및 컨테이너화 (Deployment & Docker)
- **배포 플랫폼**: Vercel (Production Build: `npm run build`)
- **Docker 지원**: 컨테이너 환경 실행을 위한 `Dockerfile` 및 `docker-compose.yml` (PostgreSQL + Redis + Next.js 앱 멀티 컨테이너 구성 지원)
