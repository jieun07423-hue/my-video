'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { StatCard } from '@/components/ui/StatCard';
import { CompletenessScoreCard } from '@/components/ui/CompletenessScoreCard';
import {
  BarChart3,
  RefreshCw,
  Building2,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckSquare,
} from 'lucide-react';

interface BusinessStats {
  total: number;
  active: number;
  inactive: number;
  dissolved: number;
}

interface SyncState {
  syncStatus: string;
  dataSource: string;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  syncCount: number;
  totalSynced: number;
  newRecordsCount: number;
}

interface AdStats {
  campaigns: {
    total: number;
    completed: number;
    generating: number;
    failed: number;
  };
  cache: {
    size: number;
    keys: number;
  };
}

function SyncStatusIndicator({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    idle: { color: 'text-gray-600', bg: 'bg-gray-100', label: '대기' },
    running: { color: 'text-blue-600', bg: 'bg-blue-50', label: '동기화 중' },
    success: { color: 'text-green-600', bg: 'bg-green-50', label: '성공' },
    failed: { color: 'text-red-600', bg: 'bg-red-50', label: '실패' },
  };
  const c = config[status] || config.idle;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.bg} ${c.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'running' ? 'animate-pulse bg-blue-500' : c.color.replace('text-', 'bg-')}`} />
      {c.label}
    </span>
  );
}

export default function DashboardPage() {
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [adStats, setAdStats] = useState<AdStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, syncRes, adRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/sync/status'),
        fetch('/api/ad/stats'),
      ]);

      if (!statsRes.ok) throw new Error('통계를 불러오는데 실패했습니다.');

      const statsData = await statsRes.json();
      setBusinessStats(statsData.data);

      if (syncRes.ok) {
        const syncData = await syncRes.json();
        setSyncState(syncData.data);
      }

      if (adRes.ok) {
        const adData = await adRes.json();
        setAdStats(adData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="mt-1 text-gray-600">소상공인 정보 종합 현황</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {loading && !businessStats ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                <div className="mb-3 h-4 w-24 rounded bg-gray-200"></div>
                <div className="h-8 w-20 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 비즈니스 통계 */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-indigo-600" />
                  소상공인 현황
                </div>
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="전체 업소" value={businessStats?.total || 0} color="blue" icon="🏪" delay={100} />
                <StatCard title="영업 중" value={businessStats?.active || 0} color="green" icon="✅" delay={200} />
                <StatCard title="휴업" value={businessStats?.inactive || 0} color="amber" icon="⏸️" delay={300} />
                <StatCard title="폐업" value={businessStats?.dissolved || 0} color="red" icon="❌" delay={400} />
              </div>
            </div>

            {/* 동기화 상태 */}
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <RefreshCw size={18} className="text-indigo-600" />
                  데이터 동기화 상태
                </h2>
                {syncState ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-sm text-gray-600">상태</span>
                      <SyncStatusIndicator status={syncState.syncStatus} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-sm text-gray-600">마지막 동기화</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(syncState.lastSyncedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-sm text-gray-600">누적 동기화 건수</span>
                      <span className="text-sm font-medium text-gray-900">{syncState.totalSynced.toLocaleString()}건</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-sm text-gray-600">신규 발견 건수</span>
                      <span className="text-sm font-medium text-gray-900">{syncState.newRecordsCount.toLocaleString()}건</span>
                    </div>
                    {syncState.errorMessage && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="flex items-center gap-1.5 text-sm text-red-700">
                          <AlertCircle size={14} />
                          {syncState.errorMessage}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">동기화 상태를 불러올 수 없습니다.</p>
                )}
                <div className="mt-4">
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    관리 페이지로 이동
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>

              {/* 광고 캠페인 통계 */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <TrendingUp size={18} className="text-indigo-600" />
                  광고 캠페인 현황
                </h2>
                {adStats ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-sm text-gray-600">전체 캠페인</span>
                      <span className="text-sm font-medium text-gray-900">{adStats.campaigns.total}개</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-sm text-gray-600">완료</span>
                      <span className="text-sm font-medium text-green-600">{adStats.campaigns.completed}개</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-sm text-gray-600">생성 중</span>
                      <span className="text-sm font-medium text-blue-600">{adStats.campaigns.generating}개</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-sm text-gray-600">실패</span>
                      <span className="text-sm font-medium text-red-600">{adStats.campaigns.failed}개</span>
                    </div>
                    {adStats.cache && (
                      <div className="rounded-xl bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-500">
                          캐시: {adStats.cache.keys}개 키 / {adStats.cache.size} 크기
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">광고 데이터를 불러올 수 없습니다.</p>
                )}
                <div className="mt-4">
                  <Link
                    href="/ad"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    광고 생성 페이지로 이동
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* 데이터 품질 상태 */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Shield size={20} className="text-indigo-600" />
                  데이터 품질 현황
                </div>
              </h2>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-4 flex items-center gap-2">
                    <CheckSquare size={18} className="text-green-600" />
                    <h3 className="font-semibold text-gray-900">사업자등록번호 검증</h3>
                  </div>
                  <p className="mb-4 text-sm text-gray-600">
                    공공데이터 API를 활용한 실시간 사업자등록번호 검증
                  </p>
                  <Link
                    href="/api/data-quality/validate?bizesId=1234567890"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    검증 테스트
                    <ExternalLink size={14} />
                  </Link>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">데이터 완성도</h3>
                  </div>
                  <p className="mb-4 text-sm text-gray-600">
                    필드별 가중치 기반 데이터 완성도 점수 시스템
                  </p>
                  <Link
                    href="/api/data-quality/completeness?report=true"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    리포트 보기
                    <ExternalLink size={14} />
                  </Link>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <h3 className="font-semibold text-gray-900">중복 탐지</h3>
                  </div>
                  <p className="mb-4 text-sm text-gray-600">
                    이름+주소 유사도 기반 스마트 중복 데이터 탐지
                  </p>
                  <Link
                    href="/api/data-quality/duplicates"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    중복 검사
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* 빠른 링크 */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <BarChart3 size={18} className="text-indigo-600" />
                빠른 메뉴
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { href: '/businesses', label: '소상공인 목록', desc: '전체 소상공인 조회', icon: '🏪' },
                  { href: '/seoul-permits', label: '서울 인허가', desc: '서울시 인허가 정보', icon: '📋' },
                  { href: '/ad', label: '광고 생성', desc: 'AI 광고 카피 생성', icon: '✨' },
                  { href: '/new', label: '신규 등록', desc: '신규 소상공인 확인', icon: '🆕' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="mb-2 text-2xl">{link.icon}</div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">{link.label}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">{link.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
