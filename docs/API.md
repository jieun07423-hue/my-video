# Small Business Tracker API 문서

## 개요

Small Business Tracker는 공공 포털에서 소상공인 정보를 수집하고 관리하는 Next.js 14 기반 웹 애플리케이션입니다.

## 기술 스택

- **백엔드**: Next.js 14.2.15 (App Router)
- **프론트엔드**: React 18.3.1, TypeScript 5.6.3
- **데이터베이스**: PostgreSQL + Prisma ORM 7.3.0
- **상태 관리**: TanStack Query 5.90.19
- **로깅**: Pino 10.2.1
- **인증**: NextAuth.js 5.0.0-beta.30
- **알림**: Slack Webhook

## API 베이스 URL

### 개발 환경
```
http://localhost:3000/api
```

### 프로덕션 환경
```
https://your-domain.com/api
```

## 인증

### 인증 방식
1. **Credentials Provider** - 이메일/비밀번호
2. **Kakao OAuth** - 소셜 로그인

### 필요한 헤더
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### 세션 관리
- **전략**: JWT (JSON Web Token)
- **유효기간**: 24시간 (설정 가능)
- **재발급**: 자동 재발급 (만료 5분 전)

## API 엔드포인트 목록

### 소상공인 관리

#### `GET /api/businesses`
소상공인 목록 조회 (페이징 및 검색 지원)

**요청 파라미터:**
- `page` (number, 기본값: 1): 페이지 번호
- `limit` (number, 기본값: 20): 페이지당 개수
- `search` (string, 옵션): 검색어 (사업체명, 주소 등)
- `status` (string, 옵션): 상태 필터
  - `pending`: 대기
  - `active`: 활성
  - `inactive`: 비활성
  - `dissolved`: 해산
  - `pending_renewal`: 갱신 대기
- `recordStatus` (string, 옵션): 레코드 상태
  - `new`: 신규
  - `synced`: 동기화됨
  - `verified`: 검증됨
- `businessCode` (string, 옵션): 업종 코드

**응답:**
```json
{
  "items": [
    {
      "id": "string",
      "bizesId": "string",
      "name": "string",
      "roadNameAddress": "string|null",
      "lotNumberAddress": "string|null",
      "phone": "string|null",
      "latitude": "number|null",
      "longitude": "number|null",
      "businessCode": "string|null",
      "businessName": "string|null",
      "indsLclsCd": "string|null",
      "indsLclsNm": "string|null",
      "indsMclsCd": "string|null",
      "indsMclsNm": "string|null",
      "indsSclsCd": "string|null",
      "indsSclsNm": "string|null",
      "status": "pending|active|inactive|dissolved|pending_renewal",
      "recordStatus": "new|synced|verified",
      "createdAt": "string",
      "updatedAt": "string",
      "lastSyncedAt": "string|null",
      "dataSource": "string",
      "externalId": "string|null"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number",
  "totalPages": "number"
}
```

#### `POST /api/businesses`
소상공인 정보 대량 생성

**요청 본문:**
```json
[
  {
    "bizesId": "string",
    "name": "string",
    "roadNameAddress": "string|null",
    "lotNumberAddress": "string|null",
    "phone": "string|null",
    "latitude": "number|null",
    "longitude": "number|null",
    "businessCode": "string|null",
    "businessName": "string|null",
    "indsLclsCd": "string|null",
    "indsLclsNm": "string|null",
    "indsMclsCd": "string|null",
    "indsMclsNm": "string|null",
    "indsSclsCd": "string|null",
    "indsSclsNm": "string|null",
    "status": "pending|active|inactive|dissolved|pending_renewal",
    "recordStatus": "new|synced|verified",
    "dataSource": "string"
  }
]
```

**응답:**
```json
{
  "count": "number"
}
```

#### `GET /api/businesses/[id]`
특정 소상공인 정보 조회

**응답:**
```json
{
  "id": "string",
  "bizesId": "string",
  "name": "string",
  // ... 기타 필드들
}
```

### 대시보드 통계

#### `GET /api/dashboard/stats`
대시보드 통계 정보 조회

**응답:**
```json
{
  "total": "number",
  "newToday": "number",
  "newRecords": "number",
  "active": "number",
  "inactive": "number",
  "dissolved": "number",
  "pending_renewal": "number"
}
```

### 동기화 관리

#### `GET /api/sync/status`
동기화 상태 조회

**응답:**
```json
{
  "id": "string",
  "dataSource": "string",
  "lastSyncedAt": "string",
  "syncStatus": "idle|running|success|failed",
  "errorMessage": "string|null",
  "syncCount": "number",
  "totalSynced": "number",
  "newRecordsCount": "number",
  "updatedAt": "string",
  "createdAt": "string"
}
```

#### `POST /api/sync`
수동 동기화 실행

**요청 본문:**
```json
{
  "dataSource": "string"
}
```

**응답:**
```json
{
  "message": "string",
  "syncId": "string"
}
```

### 인증 관리

#### `GET /api/auth/me`
현재 인증된 사용자 정보

**응답:**
```json
{
  "user": {
    "id": "string",
    "email": "string"
  },
  "session": {}
}
```

#### `POST /api/auth/signin`
로그인 처리 (카카오 리다이렉트 포함)

**요청 본문:**
```json
{
  "email": "string",
  "password": "string"
}
```

**응답:**
```json
{
  "authUrl": "string"  // 카카오 OAuth URL
}
```

#### `POST /api/auth/signout`
로그아웃 처리

**응답:**
```json
{
  "message": "성공적으로 로그아웃되었습니다"
}
```

## 에러 응답 형식

모든 API 엔드포인트는 일관된 에러 응답 형식을 따릅니다:

```json
{
  "error": "사용자 친화 메시지",
  "details": "string|null"  // 상세한 에러 정보 (개발용)
}
```

### HTTP 상태 코드

- `200`: 성공
- `201`: 생성 성공
- `400`: 잘못된 요청
- `401`: 인증 실패
- `404`: 리소스 없음
- `500`: 서버 내부 오류

### 레이트 리밋팅

API 요청 수 제한:
- `단기 시간당`: 10,000회
- `일일 최대`: 100,000회
- `최대 페이징 크기`: 100개

### 데이터 검증

모든 요청 본문은 서버 측에서 검증됩니다:
- 필수 필드 존재 여부 확인
- 데이터 타입 검증
- SQL 인젝션 방지
- 파일 크기 제한

## 웹훅 (Webhook)

### `POST /api/webhook/sync`
외부 시스템에서 동기화 데이터를 받는 웹훅 엔드포인트

**요청 본문:**
```json
{
  "dataSource": "string",
  "businesses": [
    {
      "bizesId": "string",
      "name": "string",
      // ... 기타 필드들
    }
  ]
}
```

**응답:**
```json
{
  "message": "데이터 수신 완료",
  "processed": "number"
}
```

## 보안

### 인증
- JWT 토큰을 통한 인증
- 토큰 만료 시간 설정
- 재발급 정책 적용
- CORS 설정

### 데이터 접근
- Repository 패턴으로 데이터 접근 제어
- 직접적인 DB 접근 금지
- 인증된 사용자만 접근 권한

### 입력 검증
- 모든 사용자 입력은 서버 측 검증
- XSS 방지를 위한 이스케이프
- SQL 인젝션 방지

## 사용 예제

### 1. 소상공인 목록 조회
```bash
curl -X GET "http://localhost:3000/api/businesses?page=1&limit=10&status=active" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. 신규 소상공인 등록
```bash
curl -X POST "http://localhost:3000/api/businesses" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '[
    {
      "bizesId": "1234567890",
      "name": "새로운 사업체",
      "status": "active",
      "recordStatus": "new",
      "dataSource": "data-portal"
    }
  ]'
```

### 3. 대시보드 통계 조회
```bash
curl -X GET "http://localhost:3000/api/dashboard/stats" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 테스트

### API 테스트 자동화
- Jest를 사용한 단위 테스트
- Postman/Newman 컬렉션 제공
- API 명세에 따른 테스트 케이스 작성

### 테스트 데이터
- Mock 데이터를 활용한 테스트
- 데이터베이스 트랜잭션 격리
- 테스트 환경 구성

## 개발 가이드

### 로컬 개발 환경 설정
1. `.env.local` 파일 생성
2. 필요한 환경 변수 설정
3. `npm install` 실행
4. `npm run dev` 실행

### 코드 컨벤션
- ESLint 규칙 준수
- TypeScript strict 모드
- Git 커밋 메시지 형식
- Pull Request 템플릿 검사

### 배포 전 체크리스트
- 빌드 성공 여부 확인
- API 엔드포인트 응답 테스트
- 로그 레벨 확인