import Navbar from '@/components/Navbar';

const endpoints = [
  {
    group: '소상공인',
    items: [
      { method: 'GET', path: '/api/businesses', params: 'search, status, recordStatus, businessCode, page, limit', desc: '소상공인 목록 조회 (페이지네이션, 검색, 필터)' },
      { method: 'POST', path: '/api/businesses', body: 'CreateBusinessInput[]', desc: '소상공인 대량 생성' },
      { method: 'GET', path: '/api/businesses/[id]', desc: '소상공인 상세 조회' },
      { method: 'PUT', path: '/api/businesses/[id]', body: 'Partial<CreateBusinessInput>', desc: '소상공인 정보 수정' },
      { method: 'DELETE', path: '/api/businesses/[id]', desc: '소상공인 삭제' },
    ],
  },
  {
    group: '대시보드 · 동기화',
    items: [
      { method: 'GET', path: '/api/dashboard/stats', desc: '대시보드 통계 (전체/영업중/휴업/폐업 수)' },
      { method: 'POST', path: '/api/sync', desc: '공공데이터포털 수동 동기화 트리거' },
      { method: 'GET', path: '/api/sync/status', desc: '동기화 상태 조회' },
    ],
  },
  {
    group: '광고 카피 생성',
    items: [
      { method: 'GET', path: '/api/ad', params: 'page, limit, userId, status', desc: '광고 캠페인 목록 조회' },
      { method: 'POST', path: '/api/ad', body: '{ industry, location, target, goal, strengths, keywords, tone }', desc: 'AI 광고 카피 생성 (3단계 필터링)' },
      { method: 'GET', path: '/api/ad/stats', params: 'userId', desc: '광고 통계 및 캐시/rate-limit 상태' },
    ],
  },
  {
    group: '서울시 인허가',
    items: [
      { method: 'GET', path: '/api/seoul-permits', params: 'search, trdStateNm, serviceCode, page, limit', desc: '서울시 인허가 정보 목록 조회' },
      { method: 'POST', path: '/api/seoul-permits', body: '{ serviceCode, perPage }', desc: '서울시 API에서 인허가 데이터 동기화' },
      { method: 'GET', path: '/api/seoul-permits/[id]', desc: '인허가 상세 조회' },
    ],
  },
  {
    group: '인증',
    items: [
      { method: 'POST', path: '/api/auth/signin', body: '{ email, password }', desc: '관리자 로그인 (Credentials)' },
      { method: 'POST', path: '/api/auth/signout', desc: '로그아웃' },
      { method: 'GET', path: '/api/auth/me', desc: '현재 로그인 사용자 정보' },
      { method: 'ALL', path: '/api/auth/[...nextauth]', desc: 'NextAuth v5 핸들러' },
    ],
  },
  {
    group: '노트',
    items: [
      { method: 'GET', path: '/api/notes', desc: '노트 목록 조회' },
      { method: 'POST', path: '/api/notes', body: '{ businessId, title, content }', desc: '노트 생성' },
      { method: 'GET', path: '/api/notes/deleted', desc: '삭제된 노트 목록 (소프트 삭제)' },
      { method: 'PUT', path: '/api/notes/[id]', body: '{ title, content }', desc: '노트 수정' },
      { method: 'DELETE', path: '/api/notes/[id]', desc: '노트 소프트 삭제' },
      { method: 'POST', path: '/api/notes/[id]/restore', desc: '노트 복원' },
      { method: 'DELETE', path: '/api/notes/[id]/permanent', desc: '노트 영구 삭제' },
    ],
  },
  {
    group: '텔레그램',
    items: [
      { method: 'POST', path: '/api/telegram/webhook', desc: '텔레그램 봇 웹훅 수신' },
      { method: 'POST', path: '/api/telegram/sync', desc: '텔레그램 설정 동기화' },
    ],
  },
  {
    group: 'AI · 유틸리티',
    items: [
      { method: 'POST', path: '/api/genie/analyze', desc: '지니 AI 분석 요청' },
      { method: 'GET', path: '/api/ai/test', desc: 'AI 서비스 연결 테스트' },
      { method: 'POST', path: '/api/ollama/chat', body: '{ message }', desc: 'Ollama 채팅' },
      { method: 'POST', path: '/api/ollama/generate', body: '{ prompt }', desc: 'Ollama 텍스트 생성' },
      { method: 'GET', path: '/api/ollama/test', desc: 'Ollama 연결 테스트' },
      { method: 'POST', path: '/api/errors', body: '{ message, stack, componentStack }', desc: '프론트엔드 에러 로깅' },
      { method: 'POST', path: '/api/webhook/sync', desc: '외부 웹훅 동기화 트리거' },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  ALL: 'bg-gray-100 text-gray-700',
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">API 문서</h1>
          <p className="mt-2 text-gray-600">
            Small Business Tracker API 엔드포인트 목록입니다.
            모든 API는 <code className="rounded bg-gray-200 px-1.5 py-0.5 text-sm font-mono">/api/</code> 기본 경로를 사용합니다.
          </p>
        </div>

        <div className="space-y-8">
          {endpoints.map((group) => (
            <div key={group.group} className="rounded-2xl border border-gray-100 bg-white shadow-md">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">{group.group}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-20">메서드</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">경로</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">파라미터 / Body</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">설명</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.items.map((ep, i) => (
                      <tr key={i} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-3.5">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${methodColors[ep.method] || 'bg-gray-100 text-gray-700'}`}>
                            {ep.method}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <code className="text-sm font-mono text-indigo-600">{ep.path}</code>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-500">
                          {ep.params && <span className="text-xs">쿼리: {ep.params}</span>}
                          {ep.body && (
                            <span className="text-xs">
                              {ep.params && <br />}Body: <code className="rounded bg-gray-100 px-1 text-xs">{ep.body}</code>
                            </span>
                          )}
                          {!ep.params && !ep.body && <span className="text-xs text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-700">{ep.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">공통 사항</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"></span>
              <span><strong>인증:</strong> 대부분의 API는 NextAuth v5 JWT 세션 인증 필요. <code className="rounded bg-gray-100 px-1 text-xs">/api/auth/[...nextauth]</code> 참조</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"></span>
              <span><strong>에러 응답:</strong> <code className="rounded bg-gray-100 px-1 text-xs">{'{ "error": "한국어 에러 메시지" }'}</code> 형식, HTTP 상태 코드와 함께 반환</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"></span>
              <span><strong>페이지네이션:</strong> <code className="rounded bg-gray-100 px-1 text-xs">page</code>(기본 1)와 <code className="rounded bg-gray-100 px-1 text-xs">limit</code>(기본 20) 쿼리 파라미터 사용</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"></span>
              <span><strong>로깅:</strong> 모든 API는 Pino 로거를 통해 요청/응답 로깅 (<code className="rounded bg-gray-100 px-1 text-xs">apiLogger</code>)</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
