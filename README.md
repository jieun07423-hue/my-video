This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Small Business Tracker

소상공인 정보를 수집하고 관리하는 Next.js 14 기반 웹 애플리케이션입니다.

## 주요 기능

- 🔍 **소상공인 정보 관리**: 공공 포털 데이터 자동 수집
- 📊 **대시보드 통계**: 실시간 데이터 분석 및 시각화
- 🔐 **자동 동기화**: 예약된 시간에 맞춰 자동 데이터 업데이트
- 👤 **인증 시스템**: 관리자 로그인 및 카카오 소셜 로그인
- 📋 **알림 시스템**: Slack을 통한 중요한 이벤트 알림

## 기술 스택

- **프레임워크**: Next.js 14.2.15 (App Router)
- **언어**: TypeScript 5.6.3 (strict mode)
- **데이터베이스**: PostgreSQL + Prisma ORM 7.3.0
- **상태 관리**: TanStack Query 5.90.19
- **스타일링**: Tailwind CSS 3.4.13
- **인증**: NextAuth.js 5.0.0-beta.30
- **로깅**: Pino 10.2.1
- **배포**: Vercel

## 시작하기

### 1. 환경 설정

```bash
# 1. 저장소 복제
git clone https://github.com/your-username/small-business-tracker.git
cd small-business-tracker

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 필요한 변수들을 설정하세요

# 4. 데이터베이스 마이그레이션
npx prisma migrate dev
npx prisma generate

# 5. 개발 서버 시작
npm run dev
```

### 2. 관리자 계정 설정

```bash
# 관리자 계정 생성
npm run prisma:seed

# 로그인
# 기본 이메일: admin@example.com
# 기본 비밀번호: admin123
```

### 3. API 접근

인증이 필요한 API 엔드포인트는 JWT 토큰이 필요합니다.

```bash
# 로그인 후 JWT 토큰 발급
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'

# 토큰으로 API 호출
curl -X GET http://localhost:3000/api/businesses \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 주요 API

### 소상공인 관리
- `GET /api/businesses` - 소상공인 목록 조회 (페이징 및 검색)
- `POST /api/businesses` - 소상공인 정보 대량 등록
- `GET /api/businesses/[id]` - 특정 소상공인 상세 정보
- `PUT /api/businesses/[id]` - 소상공인 정보 수정
- `DELETE /api/businesses/[id]` - 소상공인 정보 삭제

### 동기화 관리
- `GET /api/sync/status` - 동기화 상태 조회
- `POST /api/sync` - 수동 동기화 실행
- `GET /api/dashboard/stats` - 대시보드 통계

### 인증 관리
- `POST /api/auth/signin` - 로그인 (카카오 OAuth 포함)
- `POST /api/auth/signout` - 로그아웃
- `GET /api/auth/me` - 현재 인증된 사용자 정보

## 프로젝트 구조

```
small-business-tracker/
├── app/                    # Next.js App Router 페이지
│   ├── api/               # API 라우트
│   ├── auth/              # 인증 관련 API
│   ├── businesses/         # 소상공인 API
│   ├── dashboard/          # 대시보드 API
│   ├── sync/              # 동기화 API
│   └── webhook/           # 웹훅 API
│   components/           # React 컴포넌트
│   │   ├── business/       # 비즈니스 관련 컴포넌트
│   │   └── ui/           # 범용 UI 컴포넌트
│   └── lib/               # 비즈니스 로직
│       ├── hooks/          # React 커스텀 훅
│       ├── repositories/     # 데이터베이스 액세스
│       ├── services/        # 외부 API 통신
│       ├── utils/          # 공통 유틸리티
│       └── logger/         # 로깅 설정
├── prisma/               # Prisma 스키마 및 마이그레이션
│   ├── schema.prisma      # 데이터베이스 스키마 정의
│   ├── migrations/        # 데이터베이스 마이그레이션 파일
│   └── seed.ts           # 초기 데이터 생성 스크립트
├── docs/                 # 프로젝트 문서
├── __tests__/            # 테스트 유틸리티
└── public/              # 정적 파일
```

## 개발 가이드

자세한 개발 가이드는 [docs/COMPONENT_GUIDE.md](docs/COMPONENT_GUIDE.md)와 [docs/API.md](docs/API.md)를 참조하세요.

## 주요 기능 상세 설명

### 🔍 소상공인 정보 관리
- 공공 데이터 포털 API를 통해 소상공인 정보 자동 수집
- 검색, 필터링, 정렬 기능 제공
- 3단계 업종 코드 분류 시스템
- 주소, 연�처, 업종 정보 관리

### 📊 대시보드 통계
- 실시간 통계 데이터 시각화
- 상태별 소상공인 현황 모니터링
- 동기화 성공/실패 통계 추적

### 🔐 자동 동기화
- 예약된 시간에 맞춰 자동 데이터 동기화
- 동기화 상태 실시간 모니터링
- 오류 발생 시 Slack 알림 전송

### 👤 인증 시스템
- 관리자 전용 인증 페이지
- 카카오 소셜 로그인 통합
- JWT 기반 세션 관리
- 권한별 접근 제어

## 배포

### Vercel 자동 배포
- Git push 시 자동 배포 트리거
- 프리뷰 배포 환경 제공
- 성능 최적화 이미지 자동 적용

### 환경 변수
필수 환경 변수들의 목록은 `.env.example` 파일을 참조하세요.

## 라이선스

- [MIT License](LICENSE)
- [개발 가이드](docs/DEVELOPMENT.md)
- [API 문서](docs/API.md)
- [컴포넌트 가이드](docs/COMPONENT_GUIDE.md)

## 기여

이 프로젝트는 다음 오픈소스 프로젝트에서 영감을 받았습니다:
- [Next.js Best Practices](https://github.com/vercel/next.js)
- [Modern React Development Patterns](https://kentcdodds.com/)
- [Clean Code](https://clean-code-developer.com/)
- [Tailwind CSS](https://tailwindcss.com/)
