# n8n 통합 가이드

이 문서는 Small Business Tracker 프로젝트와 n8n 워크플로우 자동화 도구를 통합하는 방법을 설명합니다.

## 개요

n8n을 통해 데이터 동기화 완료 후 다양한 후처리 워크플로우를 자동화할 수 있습니다. 예를 들어:
- CRM 시스템에 고객 정보 동기화
- 이메일 마케팅 도구에 구독자 추가  
- 데이터 분석 플랫폼에 데이터 전송
- 조건부 알림 발송 (신규 사업자 수에 따라 다른 액션)

## 아키텍처

```
[공공데이터포털] → [Sync Worker] → [DB] 
                                    ↓
                           [Slack 알림] ←─────┐
                                    ↓         │
                           [n8n 웹훅 호출]    │
                                    ↓         │
                             [n8n 워크플로우] ←─ [웹훅 트리거 (선택)]
                                    ↓
                 [CRM/이메일/분석/조건부 처리 등]
```

## 설정 방법

### 1. 환경 변수 설정

`.env.example` 파일에 다음 변수들을 추가하고 `.env` 파일에 실제 값을 설정합니다:

```env
# n8n Integration (Optional)
N8N_WEBHOOK_URL="https://your-n8n-instance.com/webhook/small-business-sync"
N8N_WEBHOOK_SECRET="your-n8n-webhook-secret"
```

| 변수 | 설명 | 필수 여부 |
|------|------|-----------|
| `N8N_WEBHOOK_URL` | n8n 워크플로우 웹훅 URL | O |
| `N8N_WEBHOOK_SECRET` | 웹훅 보안을 위한 비밀 토큰 (선택사항) | X |

### 2. 알림 함수에 n8n 연동 추가

`app/lib/notifications/slack.ts` 파일에 `notifyN8nWorkflow` 함수가 추가되어 있습니다. 기존 알림 함수에서 이 함수를 호출하도록 수정할 수 있습니다.

예시: `notifySyncComplete` 함수 수정
```typescript
export async function notifySyncComplete(stats: SyncStats, duration: number) {
  // 기존 Slack 알림 코드...
  
  // n8n 워크플로우 트리거
  await notifyN8nWorkflow({
    event: 'sync_complete',
    stats,
    duration,
  });
}
```

## n8n 워크플로우 설정

### 트리거 구성
1. n8n에서 새 워크플로우 생성
2. "Webhook" 노드를 트리거로 추가
3. 경로 설정: `/webhook/small-business-sync`
4. HTTP Method: POST
5. (선택사항) 인증: 헤더에서 `X-N8N-Secret` 검증

### 데이터 구조
n8n 워크플로우에서 다음과 같은 데이터 구조를 수신합니다:

```json
{
  "source": "small-business-tracker",
  "timestamp": "2026-04-04T10:30:00.000Z",
  "event": "sync_complete",
  "stats": {
    "totalFetched": 1500,
    "totalSynced": 1450,
    "newRecords": 50,
    "updatedRecords": 1400,
    "errors": 0
  },
  "duration": 45000
}
```

### 활용 예시

#### 예시 1: CRM 시스템 동기화
- 신규 사업자 정보를 Salesforce 또는 HubSpot에 추가
- 기존 사업자 정보 업데이트

#### 예시 2: 이메일 마케팅
- 신규 등록된 사업자에게 환영 이메일 발송
- 월간 통계 보고서 뉴스레터 발송

#### 예시 3: 데이터 분석
- Google Sheets 또는 Airtable에 데이터 백업
- 대시보드 도구에 데이터 공급 (Metabase, Superset 등)

#### 예시 4: 조건부 알림
- 신규 사업자 수가 특정 임계값을 초과할 때 관리자에게 추가 알림
- 오류율이 높아질 때 시스템 점검 알림

## 보안 고려사항

### 인증
- n8n → 이 앱: 기존 웹훅 엔드포인트의 `WEBHOOK_SECRET` 사용
- 이 앱 → n8n: 헤더에 `X-N8N-Secret` 토큰 전달 (권장)

### 데이터 보호
- 민감한 사업자 정보는 최소한만 전송 필요시
- 실제 운영 환경에서는 PII(개인 식별 정보)를 마스킹하거나 익명화 고려

## 문제 해결

### 자주 발생하는 문제

1. **웹훅 연결 실패**
   - n8n 인스턴스가 접근 가능한지 확인 (방화벽, 네트워크 설정)
   - URL이 정확한지 확인 (https://, 포트 등)

2. **인증 오류**
   - `N8N_WEBHOOK_SECRET`이 설정되어 있다면 동일한 값이 헤더에 전달되는지 확인
   - 헤더 이름이 정확한지 확인 (`X-N8N-Secret`)

3. **데이터 형식 오류**
   - 수신된 데이터 구조를 콘솔 로그로 먼저 확인
   - JSON 파싱 오류가 발생하지 않는지 확인

### 로그 확인
- 이 앱: `notificationLogger`를 통해 n8n 호출 성공/실패 로그 기록
- n8n: 워크플로우 실행 로그에서 수신 데이터 및 처리 과정 확인

## 테스트 방법

1. 환경 변수 설정 후 앱 재시작
2. 수동 동기화 트리거 (`POST /api/sync` 또는 웹훅 엔드포인트)
3. 알림 발생 시 n8n 워크플로우가 트리거되는지 확인
4. n8n에서 수신한 데이터 구조 확인
5. 후속 워크플로우 단계들이 정상 작동하는지 검증

## 확장 방법

### 추가 알림 유형
다른 알림 함수에도 n8n 연동을 추가할 수 있습니다:
- `notifyNewBusiness`: 신규 사업자 등록 시 특정 처리
- `notifySyncError`: 오류 발생 시 escalation 워크플로우 트리거
- `notifySyncStart`: 동기화 시작 전 준비 작업 트리거

### 커스텀 데이터 전송
특정 워크플로우에서는 다른 데이터를 전송해야 할 경우:
```typescript
await notifyN8nWorkflow({
  event: 'business_updated',
  businessId: '12345',
  changes: {
    name: '새로운 상호명',
    status: 'active'
  },
  timestamp: new Date().toISOString()
});
```

## 참고 자료

- n8n 공식 문서: https://docs.n8n.io/
- n8n 웹훅 트리거: https://docs.n8n.io/nodes/base/base100/#webhook
- n8n HTTP Request 노드: https://docs.n8n.io/nodes/base/httpRequest/