'use client';

import { useState, useCallback, useMemo } from 'react';
import { useBusinesses } from '@/app/lib/hooks/useBusinesses';
import { useBusinessStats } from '@/app/lib/hooks/useBusinesses';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { StatCard } from '@/app/components/ui/StatCard';
import { BusinessTableRow } from '@/app/components/business/BusinessTableRow';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface SearchParams {
  search?: string;
  status?: 'pending' | 'active' | 'inactive' | 'dissolved' | 'pending_renewal';
  recordStatus?: 'new' | 'synced' | 'verified';
  businessCode?: string;
  page?: number;
  limit?: number;
}

function BusinessTable({ businesses, isLoading }: { businesses: any[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-white rounded-xl p-6 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
              <div className="w-24 h-8 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4" />
                  <span>상호명</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>주소</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                업종
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>등록일</span>
                </div>
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                상세
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {businesses.map((business, index) => (
              <BusinessTableRow 
                key={business.id} 
                business={business} 
                index={index}
                showNewBadge={business.recordStatus === 'new'}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = useMemo(() => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((page, index) => (
        <div key={index}>
          {page === '...' ? (
            <span className="px-3 py-2 text-slate-400">...</span>
          ) : (
            <button
              onClick={() => onPageChange(page as number)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                currentPage === page
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {page}
            </button>
          )}
        </div>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function BusinessesPage() {
  const [searchParams, setSearchParams] = useState<SearchParams>({ page: 1, limit: 20 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: businessesData, isLoading, error, refetch } = useBusinesses(searchParams);
  const { data: statsData } = useBusinessStats();

  const handleSearch = useCallback(() => {
    setSearchParams({ ...searchParams, page: 1 });
  }, [searchParams]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const businesses = businessesData?.items || [];
  const stats = statsData || {
    total: 0,
    newToday: 0,
    newRecords: 0,
    active: 0,
    inactive: 0,
  };

  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">오류가 발생했습니다</h2>
            <p className="text-slate-600 mb-6">{String(error)}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>다시 시도</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
                소상공인 목록
              </h1>
              <p className="text-slate-600 mt-2">전체 {stats.total.toLocaleString()}개 업체</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
              <button className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg">
                <Download className="w-4 h-4" />
                <span>내보내기</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="전체 소상공인" 
            value={stats.total} 
            color="blue"
            icon="🏪"
            trend="up"
            trendValue={stats.newToday}
            delay={100}
          />
          <StatCard 
            title="오늘 신규" 
            value={stats.newToday} 
            color="green"
            icon="🆕"
            trend="up"
            trendValue={15}
            delay={200}
          />
          <StatCard 
            title="신규 등록" 
            value={stats.newRecords} 
            color="amber"
            icon="📝"
            trend="neutral"
            trendValue={stats.newRecords}
            delay={300}
          />
          <StatCard 
            title="영업 중" 
            value={stats.active} 
            color="purple"
            icon="🏃"
            trend="up"
            trendValue={stats.active - stats.inactive}
            delay={400}
          />
        </div>

        <div className="mb-8 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center mb-6">
            <Filter className="w-5 h-5 text-slate-500 mr-2" />
            <h2 className="text-lg font-semibold text-slate-900">검색 필터</h2>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  검색어
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchParams.search || ''}
                    onChange={(e) => setSearchParams({ ...searchParams, search: e.target.value })}
                    placeholder="상호명, 주소, 업종 검색"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  영업 상태
                </label>
                <select
                  value={searchParams.status || ''}
                  onChange={(e) => setSearchParams({ ...searchParams, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">전체 상태</option>
                  <option value="pending">대기</option>
                  <option value="active">영업중</option>
                  <option value="inactive">휴업</option>
                  <option value="dissolved">폐업</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  레코드 상태
                </label>
                <select
                  value={searchParams.recordStatus || ''}
                  onChange={(e) => setSearchParams({ ...searchParams, recordStatus: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">전체 상태</option>
                  <option value="new">신규</option>
                  <option value="synced">동기화됨</option>
                  <option value="verified">검증됨</option>
                </select>
              </div>

              <div className="flex items-end space-x-2">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Search className="w-4 h-4" />
                  <span>검색</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {businesses.length === 0 && !isLoading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-6">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">검색 결과가 없습니다</h3>
            <p className="text-slate-600">다른 검색 조건으로 시도해보세요.</p>
          </div>
        ) : (
          <>
            <BusinessTable businesses={businesses} isLoading={isLoading} />
            
            {businessesData && businessesData.totalPages > 1 && (
              <Pagination
                currentPage={businessesData.page}
                totalPages={businessesData.totalPages}
                onPageChange={(page) => setSearchParams({ ...searchParams, page })}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
