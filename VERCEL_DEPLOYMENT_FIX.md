# Vercel 배포 해결 가이드

## 🚨 현재 상태
- **에러**: 404 - DEPLOYMENT_NOT_FOUND
- **원인**: Vercel에 프로젝트가 연동되지 않음
- **빌드**: 정상 동작 (static export 완료)

## 🛠️ 해결 방안

### 방안 1: Vercel 대시보드에서 직접 프로젝트 생성 (권장)

#### 1단계: 새 프로젝트 생성
1. Vercel 대시보드 접속: https://vercel.com/dashboard
2. **"Add New..."** → **"Project"** 클릭
3. **Import Git Repository**:
   - **Git Provider**: GitHub 선택
   - **Repository**: `kwpark0047/opencode260124` 선택
   - **Framework**: Next.js (자동 감지)
4. **프로젝트 설정**:
   ```
   ✅ Project Name: small-business-tracker
   ✅ Root Directory: / (기본값)
   ✅ Build Command: npm run build
   ✅ Output Directory: out (수정 필요!)
   ✅ Node Version: 18.x
   ```

#### 2단계: 빌드 설정 수정
Vercel에서 **Output Directory**를 `out`으로 변경:
- 현재 `.next`로 설정되어 있을 수 있음
- Static export는 `out/` 디렉토리 사용

#### 3단계: 환경변수 설정
```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
NEXTAUTH_SECRET=...
```

### 방안 2: GitHub 재연동

#### GitHub 통합 재설정
1. Vercel 대시보드 → Settings → Git Integrations
2. **GitHub 연동 해제 후 다시 연결**
3. **포크된 저장소**가 아닌 **원본 저장소** 연결 확인

### 방안 3: 도메인/DNS 확인

#### 도메인 설정 확인
1. Vercel 대시보드 → Domains
2. `small-business-tracker.vercel.app` 도메인 확인
3. DNS 설정이 올바른지 확인

---

## ✅ 성공 확인 체크리스트

### 배포 성공 후 확인
- [ ] Vercel 대시보드에서 빌드 성공 (초록색)
- [ ] https://small-business-tracker.vercel.app 접속 가능
- [ ] 메인페이지 정상 렌더링
- [ ] 네비게이션 링크 동작
- [ ] 소상공인 목록 페이지 동작
- [ ] 동적 라우트 (/businesses/[id]) 동작

### 테스트 할 URL
```
메인: https://small-business-tracker.vercel.app
목록: https://small-business-tracker.vercel.app/businesses
상세: https://small-business-tracker.vercel.app/businesses/1
```

---

## 🚀 즉시 실행할 작업

1. **Vercel 대시보드 접속**
2. **새 프로젝트 생성** (GitHub 연동)
3. **Output Directory를 `out`으로 설정**
4. **환경변수 추가**
5. **배포 실행**
6. **URL 테스트**

---

## 📞 문제 발생 시

### Vercel 지원
- **대시보드**: https://vercel.com/support
- **문서**: https://vercel.com/docs

### 대안 해결책
- GitHub Pages로 배포 전환
- Netlify로 배포 전환
- Vercel Team 계정 사용

이 가이드를 따라 Vercel 프로젝트를 새로 생성하면 배포 문제가 해결될 것입니다.