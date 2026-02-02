'use client';

import { useState, useCallback } from 'react';
import { useBusinesses } from '@/app/lib/hooks/useBusinesses';
import { useBusinessStats } from '@/app/lib/hooks/useBusinesses';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { StatCard } from '@/app/components/ui/StatCard';
import { BusinessTableRow } from '@/app/components/business/BusinessTableRow';

interface SearchParams {
  search?: string;
  status?: 'pending' | 'active' | 'inactive' | 'dissolved' | 'pending_renewal';
  recordStatus?: 'new' | 'synced' | 'verified';
  businessCode?: string;
  page?: number;
  limit?: number;
}

function BusinessTable({ businesses }: { businesses: any[] }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              상호명
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              주소
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              업종
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              상태
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              등록일
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              상세
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {businesses.map((business) => (
            <BusinessTableRow key={business.id} business={business} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BusinessesPage() {
  const [searchParams, setSearchParams] = useState<SearchParams>({ page: 1, limit: 20 });

  const { data: businessesData, isLoading, error } = useBusinesses(searchParams);
  const { data: statsData } = useBusinessStats();

  const handleSearch = useCallback(() => {
    setSearchParams({ ...searchParams, page: 1 });
  }, [searchParams]);

  const businesses = businessesData?.items || [];
  const stats = statsData || {
    total: 0,
    newToday: 0,
    newRecords: 0,
    active: 0,
    inactive: 0,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">로딩 중...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-lg text-red-600">오류가 발생했습니다</div>
            <div className="text-sm text-gray-500 mt-2">{String(error)}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            소상공인 목록
          </h1>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="전체 소상공인" value={stats.total} color="blue" />
          <StatCard title="오늘 신규" value={stats.newToday} color="green" />
          <StatCard title="신규 등록" value={stats.newRecords} color="yellow" />
          <StatCard title="영업 중" value={stats.active} color="purple" />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                검색
              </label>
              <input
                type="text"
                value={searchParams.search || ''}
                onChange={(e) => setSearchParams({ ...searchParams, search: e.target.value })}
                placeholder="상호명, 주소, 업종"
                className="w-full rounded-md border-gray-300 px-4 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                영업 상태
              </label>
              <select
                value={searchParams.status || ''}
                onChange={(e) => setSearchParams({ ...searchParams, status: e.target.value as any })}
                className="w-full rounded-md border-gray-300 px-4 py-2 text-sm"
              >
                <option value="">전체</option>
                <option value="pending">대기</option>
                <option value="active">영업중</option>
                <option value="inactive">휴업</option>
                <option value="dissolved">폐업</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                레코드 상태
              </label>
              <select
                value={searchParams.recordStatus || ''}
                onChange={(e) => setSearchParams({ ...searchParams, recordStatus: e.target.value as any })}
                className="w-full rounded-md border-gray-300 px-4 py-2 text-sm"
              >
                <option value="">전체</option>
                <option value="new">신규</option>
                <option value="synced">동기화됨</option>
                <option value="verified">검증됨</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                검색
              </button>
            </div>
          </div>
        </form>

        {businesses.length === 0 ? (
          <div className="py-12 text-center text-gray-600">
            검색 결과가 없습니다.
          </div>
        ) : (
          <>
            <BusinessTable businesses={businesses} />

            {businessesData && businessesData.totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <div className="flex gap-2">
                  {Array.from({ length: businessesData.totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setSearchParams({ ...searchParams, page: i + 1 })}
                      className={`px-4 py-2 rounded ${
                        businessesData.page === i + 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
