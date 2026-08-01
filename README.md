# WeMarket (Small Business Tracker)

Vite / Next.js-based SaaS QR Menu & Small Business Platform.

## 기술 스택
- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript 5.6 (Strict Mode)
- **데이터베이스**: PostgreSQL + Prisma ORM
- **상태 관리**: TanStack Query, Zustand
- **캐시 및 큐**: Redis + BullMQ
- **로깅**: Pino
- **배포**: Vercel

## 주요 고도화 기능
1. **토스페이먼츠 원스톱 QR 간편결제** (`/api/payments/toss`)
2. **실시간 주방 주문 현황판 KDS SSE 스트리밍** (`/api/kds/stream`)
3. **AI 매출 예측 및 경영 인사이트 대시보드** (`/api/dashboard/ai-insights`)
4. **다국어 QR 메뉴판 자동 번역 (KO, EN, JA, ZH)** (`/api/menus/multilingual`)
5. **결정적 전화번호 암호화 및 검색** (`phoneEncryption.ts`)
6. **멀티 테넌시 RBAC 역할별 권한 관리** (`/api/auth/rbac`)
7. **카카오 알림톡 및 모바일 푸시 알림** (`/api/notifications/alimtalk`)
8. **단골 고객 리워드 스탬프 및 자동 쿠폰 발행** (`/api/rewards`)
9. **토스페이먼츠 정산 자동화 시스템** (`/api/settlements/toss`)

## 시작하기
```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```
