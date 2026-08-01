'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { StatCard } from '@/components/ui/StatCard';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface SeoulPermit {
  id: string;
  manageNo: string;
  bplcNm: string;
  bpNm: string | null;
  bizcnd: string | null;
  locplcd: string | null;
  rdnWhladdr: string | null;
  siteTel: string | null;
  apvPermYmd: string | null;
  apvCancelYmd: string | null;
  trdStateGbn: string | null;
  trdStateNm: string | null;
  dtlStateGbn: string | null;
  dtlStateNm: string | null;
  dcbyYmd: string | null;
  serviceCode: string;
  createdAt: string;
}

interface SearchParams {
  search?: string;
  trdStateNm?: string;
  page: number;
  limit: number;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">-</span>;

  const isClosed = status === '폐업';
  const isPending = status === '취소' || status === '반려';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        isClosed
          ? 'bg-red-50 text-red-700'
          : isPending
          ? 'bg-amber-50 text-amber-700'
          : 'bg-green-50 text-green-700'
      }`}
    >
      {isClosed ? <XCircle size={12} /> : isPending ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
      {status}
    </span>
  );
}

export default function SeoulPermitsPage() {
  const [items, setItems] = useState<SeoulPermit[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total: number; active: number; closed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    search: '',
    trdStateNm: '',
    page: 1,
    limit: 20,
  });
  const [searchInput, setSearchInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchParams.search) params.set('search', searchParams.search);
      if (searchParams.trdStateNm) params.set('trdStateNm', searchParams.trdStateNm);
      params.set('page', String(searchParams.page));
      params.set('limit', String(searchParams.limit));

      const res = await fetch(`/api/seoul-permits?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다.');

      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(() => {
    setSearchParams((prev) => ({ ...prev, search: searchInput, page: 1 }));
  }, [searchInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
  );

  const totalPages = Math.ceil(total / searchParams.limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">서울시 인허가 정보</h1>
          <p className="text-gray-600">
            서울시 공공데이터 openAPI 기반 인허가 업소 정보를 조회합니다.
          </p>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="mb-8 grid gap-6 sm:grid-cols-3">
            <StatCard title="전체 업소" value={stats.total} color="primary" icon="🏪" delay={100} />
            <StatCard title="영업 중" value={stats.active} color="success" icon="✅" delay={200} />
            <StatCard title="폐업" value={stats.closed} color="error" icon="📋" delay={300} />
          </div>
        )}

        {/* 검색 필터 */}
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
          <div className="mb-6 flex items-center">
            <Filter className="mr-2 h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">검색 필터</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">검색어</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="사업장명, 주소 검색"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">영업 상태</label>
              <select
                value={searchParams.trdStateNm}
                onChange={(e) =>
                  setSearchParams((prev) => ({ ...prev, trdStateNm: e.target.value, page: 1 }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">전체 상태</option>
                <option value="영업">영업</option>
                <option value="폐업">폐업</option>
                <option value="취소">취소</option>
                <option value="반려">반려</option>
              </select>
            </div>

            <div className="flex items-end space-x-2">
              <button
                onClick={handleSearch}
                className="flex flex-1 items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-lg transition-all hover:bg-indigo-700"
              >
                <Search className="h-4 w-4" />
                <span>검색</span>
              </button>
            </div>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 결과 */}
        {!error && (
          <>
            {items.length === 0 && !loading ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center shadow-md">
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">검색 결과가 없습니다</h3>
                <p className="text-gray-500">다른 검색 조건으로 시도해보세요.</p>
              </div>
            ) : (
              <>
                {/* 테이블 */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-gray-100 bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4" />
                              <span>사업장명</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                            업종
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4" />
                              <span>주소</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4" />
                              <span>연락처</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                            영업 상태
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>인허가일</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loading
                          ? Array.from({ length: 5 }).map((_, i) => (
                              <tr key={i} className="animate-pulse">
                                <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-gray-200"></div></td>
                                <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-gray-200"></div></td>
                                <td className="px-6 py-4"><div className="h-4 w-48 rounded bg-gray-200"></div></td>
                                <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-200"></div></td>
                                <td className="px-6 py-4"><div className="h-6 w-16 rounded-full bg-gray-200"></div></td>
                                <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-200"></div></td>
                              </tr>
                            ))
                          : items.map((permit) => (
                              <tr key={permit.id} className="transition-colors hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <div>
                                    <Link
                                      href={`/seoul-permits/${permit.id}`}
                                      className="font-medium text-indigo-600 hover:text-indigo-800"
                                    >
                                      {permit.bplcNm}
                                    </Link>
                                    {permit.bpNm && (
                                      <p className="mt-0.5 text-xs text-gray-500">{permit.bpNm}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  {permit.bizcnd || '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {permit.rdnWhladdr || permit.locplcd || '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  {permit.siteTel || '-'}
                                </td>
                                <td className="px-6 py-4">
                                  <StatusBadge status={permit.trdStateNm} />
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {formatDate(permit.apvPermYmd)}
                                </td>
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      전체 <span className="font-semibold">{total.toLocaleString()}</span>개 중
                      페이지 {(searchParams.page - 1) * searchParams.limit + 1}-
                      {Math.min(searchParams.page * searchParams.limit, total)}
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setSearchParams((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                        }
                        disabled={searchParams.page <= 1}
                        className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        이전
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const start = Math.max(1, Math.min(searchParams.page - 2, totalPages - 4));
                        const page = start + i;
                        if (page > totalPages) return null;
                        return (
                          <button
                            key={page}
                            onClick={() => setSearchParams((prev) => ({ ...prev, page }))}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition-all ${
                              page === searchParams.page
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() =>
                          setSearchParams((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))
                        }
                        disabled={searchParams.page >= totalPages}
                        className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        다음
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
