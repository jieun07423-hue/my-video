# Small Business Tracker 컴포넌트 개발 가이드

## 개요

이 가이드는 Small Business Tracker 프로젝트의 컴포넌트 개발을 위한 표준화된 방법론과 베스트 프랙티스를 제공합니다.

## 컴포넌트 아키텍처

### 디렉토리 구조
```
app/
├── components/           # 재사용 가능한 UI 컴포넌트
│   ├── business/        # 비즈니스 관련 컴포넌트
│   └── ui/            # 범용 UI 컴포넌트
├── lib/                # 비즈니스 로직 및 유틸리티
│   ├── hooks/          # React 커스텀 훅
│   ├── repositories/     # 데이터베이스 액세스 레이어
│   ├── services/        # 외부 API 통신
│   └── utils/          # 공통 유틸리티 함수
└── types/              # TypeScript 타입 정의
```

## 개발 원칙

### 컴포넌트 작성 가이드

#### 1. 컴포넌트 구조

**✅ 좋은 예시:**
```tsx
interface StatCardProps {
  title: string;
  value: number;
  color?: 'blue' | 'green' | 'yellow';
  icon?: string;
}

export function StatCard({ title, value, color = 'blue', icon }: StatCardProps) {
  return (
    <div className={clsx('card', `card-${color}`)}>
      <h3>{title}</h3>
      <p>{value.toLocaleString()}</p>
      {icon && <span className="icon">{icon}</span>}
    </div>
  )
}
```

**❌ 나쁜 예시:**
```tsx
// 이렇게 하지 마세요
export function BadCard() {
  return (
    <div className="card-blue card-green card-yellow">
      <h3>카드</h3>
    </div>
  )
}
```

#### 2. 재사용 가능한 컴포넌트

- **기본 단위 책임**: 하나의 기능만 담당
- **Props 인터페이스**: TypeScript 인터페이스로 명확히 정의
- **조건부 렌더링**: 복잡한 로직은 컴포넌트 외부로 분리

**✅ 좋은 예시:**
```tsx
// 올바른 조건부 렌더링
const BusinessStatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    active: { color: 'green', label: '영업중' },
    inactive: { color: 'red', label: '휴업' },
    pending: { color: 'yellow', label: '대기' }
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <Badge color={config.color} text={config.label} />
  )
}
```

#### 3. 상태 관리

- **로컬 상태 최소화**: `useState` 훅 사용
- **상태 끌어올림**: prop drilling 방지, Context 또는 Zustand 사용
- **사이드 이팩트**: 상태 변경 함수는 `handle` 접두사 사용

**✅ 좋은 예시:**
```tsx
interface StatusState {
  isLoading: boolean
  data: null | Business[]
  error: string | null
}

function useBusinesses() {
  const [state, setState] = useState<StatusState>({
    isLoading: false,
    data: null,
    error: null
  })

  const fetchBusinesses = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const data = await businessRepository.search({})
      setState({ isLoading: false, data, error: null })
    } catch (error) {
      setState({ isLoading: false, data: null, error: error.message })
    }
  }

  return {
    ...state,
    fetchBusinesses,
    refetch: fetchBusinesses
  }
}
```

#### 4. 이벤트 처리

- **이벤트 핸들러 사용**: `onClick`, `onChange` 등
- **폼 제어**: `useForm` 훅이나 커스텀 상태 사용
- **이벤트 위임**: 가능한 경우, 부모에게 위임

**✅ 좋은 예시:**
```tsx
export function SearchForm({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    onSearch(query)
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색어를 입력하세요"
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? '검색 중...' : '검색'}
      </button>
    </form>
  )
}
```

### UI 디자인 가이드

#### 1. 스타일링 시스템

- **CSS 변수 사용**: Tailwind CSS 구성
- **일관된 디자인**: theme.ts 파일에 정의
- **다크 모드**: 시스템 설정과 연동

**✅ 좋은 예시:**
```tsx
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
        },
        success: {
          50: '#10b981',
          500: '#059669',
        }
      }
    }
  }
}

// 컴포넌트에서 사용
<div className="bg-primary-500 text-white px-4 py-2 rounded">
  성공
</div>
```

#### 2. 반응형 디자인

- **모바일 우선**: 모바일, 태블릿, 데스크톱 순서
- **브레이크포인트**: 명확한 브레이크포인트 사용
- **유연성 레이아웃**: 일관된 애니메이션과 트랜지션

#### 3. 접근성

- **WCAG 2.1 준수**: 색상 대비, 키보드 내비게이션
- **Semantic HTML**: 의미론적 마크업 사용
- **ARIA 레이블**: 적절한 레이블 제공
- **이미지 최적화**: 적절한 크기와 포맷

### 성능 최적화

#### 1. 렌더링 최적화

- **React.memo**: 순수 컴포넌트 메모이제이션
- **useMemo**: 비용 많은 계산 결과 캐싱
- **Code Splitting**: Next.js 동적 임포트
- **이미지 최적화**: lazy loading, 적절한 포맷

**✅ 좋은 예시:**
```tsx
import { memo } from 'react'

export const BusinessCard = memo(({ business }: { business: Business }) => {
  return (
    <div className="business-card">
      <h3>{business.name}</h3>
      <p>{business.address}</p>
    </div>
  )
})

export default BusinessCard
```

#### 2. 데이터 페칭 최적화

- **API 응답 최소화**: 필요한 필드만 요청
- **페이지네이션**: Prisma의 `cursor` 기반 페이징
- **이미지 지연 로딩**: Next.js Image 최적화

## 테스트 가이드

### 1. 컴포넌트 테스트

#### 테스트 유틸리티
- **RTL (React Testing Library)**: DOM 테스트
- **Mock**: MSW 또는 Jest mocks 사용
- **Test-Driven Development**: 테스트 작성 후 구현

**✅ 좋은 예시:**
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BusinessCard } from './BusinessCard'

describe('BusinessCard', () => {
  it('renders business information correctly', () => {
    const mockBusiness = {
      id: '1',
      name: '테스트 사업체',
      address: '서울시 강남구'
    }

    render(<BusinessCard business={mockBusiness} />)
    
    expect(screen.getByText('테스트 사업체')).toBeInTheDocument()
    expect(screen.getByText('서울시 강남구')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    render(<BusinessCard business={mockBusiness} onClick={handleClick} />)
    
    fireEvent.click(screen.getByRole('button'))
    
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledWith(mockBusiness.id)
    })
  })
})
```

#### 2. 훅 테스트

#### 테스트 유틸리티
- **renderHook**: 커스텀 훅 테스트
- **Mock Repository**: 외부 의존성 Mock 처리
- **상태 테스트**: 다양한 상태 조합 테스트

**✅ 좋은 예시:**
```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { businessRepository } from '../lib/repositories/business.repository'

jest.mock('../lib/repositories/business.repository')

describe('useBusinesses', () => {
  it('fetches businesses successfully', async () => {
    const mockBusinesses = [
      { id: '1', name: '사업체1' },
      { id: '2', name: '사업체2' }
    ]
    
    jest.mocked(businessRepository.search).mockResolvedValue({
      items: mockBusinesses,
      total: 2,
      page: 1,
      limit: 20
    })

    const { result } = renderHook(() => useBusinesses())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data).toEqual(mockBusinesses)
    })
  })
})
```

#### 3. API 테스트

#### MSW 설정
- **Mock Service Worker**: API 응답 Mock
- **테스트 시나리오**: 일관된 API 시나리오 작성

## 배포 가이드

### 1. 빌드 최적화

#### 번들 분석
- **Webpack Bundle Analyzer**: `npx @next/analyze`
- **다이나믹 모드**: Node.js 최적화
- **Tree Shaking**: 사용하지 않는 import 제거

#### 2. 프로덕션 배포

#### Vercel 설정
- **환경 변수**: Vercel 대시보드에 설정
- **빌드 최적화**: 자동 이미지 최적화
- **도메인 설정**: 커스텀 도메인 연결

### 3. 환경 관리

#### 개발/스테이징/프로덕션
- **`.env.local`**: 로컬 환경 변수
- **Next.js 환경 설정**: NODE_ENV 기반 설정 분기

## 코드 품질

### 1. 리뷰팅 도구

#### ESLint 규칙
- **필수 플러그인**: `eslint-plugin-react`, `eslint-plugin-react-hooks`
- **자동 수정**: VS Code ESLint 확장프로그램 설정

#### 2. 코드 컨벤션

#### Prettier 설정
- **일관된 코드 포맷**: Prettier 설정 파일
- **EditorConfig**: VS Code 설정
- **Git hooks**: 커밋 시 자동 포맷

### 3. 타입 안정성

#### TypeScript 설정
- **strict mode 활성화**: 엄격한 타입 검사
- **경고 무시**: 의도 있는 경고는 주석으로 처리

## 협업 도구

### 1. VS Code 익스텐션

#### 추천 익스텐션
- **ES7+ React Snippets**: React 코드 스니펫
- **Prettier**: 코드 포맷터
- **Tailwind CSS IntelliSense**: CSS 클래스 자동완성
- **GitLens**: Git 기록 표시

#### 2. 브라우저 도구
- **React Developer Tools**: 디버깅 툴바
- **Postman**: API 테스트
- **Lighthouse**: 성능 분석

## 기여 팁

### 1. 일반 개발
- **컴포넌트 라이브러리**: 복잡한 로직은 라이브러리로
- **일관된 코드 스타일**: 프로젝트의 스타일 일관성 유지
- **성능 측정**: 렌더링, 렌더링 최소화
- **보안**: 항상 보안 고려

### 2. React 관련
- **Hooks 규칙**: Hooks 규칙 준수
- **Keys 설정**: `key` prop은 안정적이어야 함
- **부수 효과**: 불필요한 리랜더링 방지

### 3. Next.js 관련
- **Static Generation**: `getStaticProps` 최적화
- **이미지 최적화**: `next/image`, `next-optimize-plugin`
- **Middleware**: 보안 및 인증 미들웨어 활용