'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/core/Card';
import { Button } from '@/components/ui/core/Button';
import { Badge, StatusBadge } from '@/components/ui/core/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { DesignMDMetricsBanner } from '@/components/design-md/DesignMDMetricsBanner';
import TrendChart from '@/components/dashboard/TrendChart';
import IndustryChart from '@/components/dashboard/IndustryChart';
import { Progress } from '@/components/ui/core/Progress';
import Navbar from '@/components/Navbar';
import {
  Building2,
  Plus,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  BarChart3,
  Clock,
  Database,
  Zap,
  Users,
  Target,
  Shield,
  ChevronRight,
  Filter,
  Download,
  Settings,
  Bell,
  Search,
  Info,
  CheckCircle,
} from 'lucide-react';

interface BusinessStats {
  total: number;
  active: number;
  inactive: number;
  dissolved: number;
}

interface SyncState {
  syncStatus: 'idle' | 'running' | 'success' | 'failed';
  dataSource: string;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  syncCount: number;
  totalSynced: number;
  newRecordsCount: number;
}

interface TrendData {
  weeklyVisitors: { date: string; value: number; label: string }[];
  weeklySignups: { date: string; value: number; label: string }[];
  campaignTrends: { date: string; value: number; label: string }[];
  industryDistribution: { name: string; count: number; percentage: number }[];
  monthlyRevenue: { date: string; value: number; label: string }[];
  monthlySales: { date: string; value: number; label: string }[];
  monthlyActive: { date: string; value: number; label: string }[];
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

interface DashboardMetrics {
  syncSuccessRate: number;
  avgResponseTime: number;
  dataQualityScore: number;
  activeUsers: number;
}

const statusConfig: Record<SyncState['syncStatus'], { label: string; color: string; bg: string; icon: 'running' | 'success' | 'failed' | 'idle' }> = {
  idle: { label: '대기 중', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', icon: 'idle' },
  running: { label: '동기화 중', color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/30', icon: 'running' },
  success: { label: '성공', color: 'text-success-600 dark:text-success-400', bg: 'bg-success-50 dark:bg-success-900/30', icon: 'success' },
  failed: { label: '실패', color: 'text-error-600 dark:text-error-400', bg: 'bg-error-50 dark:bg-error-900/30', icon: 'failed' },
};

const SyncStatusIndicator = ({ status, animated = false }: { status: SyncState['syncStatus']; animated?: boolean }) => {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.bg} ${config.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${animated && status === 'running' ? 'animate-pulse' : ''} bg-current`} />
      {config.label}
    </span>
  );
};

export default function DashboardPage() {
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [adStats, setAdStats] = useState<AdStats | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, syncRes, adRes, trendsRes, metricsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/sync/status'),
        fetch('/api/ad/stats'),
        fetch('/api/dashboard/trends'),
        fetch('/api/dashboard/metrics?type=dashboard'),
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

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setTrends(trendsData.data);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.data);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const statsCards = [
    { 
      title: '전체 업소', 
      value: businessStats?.total || 0, 
      color: 'primary' as const, 
      icon: <Building2 className="w-5 h-5" />,
      trend: 'up' as const,
      trendValue: 12,
      subtitle: '전월 대비 12% 증가',
      delay: 100,
    },
    { 
      title: '영업 중', 
      value: businessStats?.active || 0, 
      color: 'success' as const, 
      icon: <Target className="w-5 h-5" />,
      trend: 'up' as const,
      trendValue: 8,
      subtitle: '활성 비율 87%',
      delay: 200,
    },
    { 
      title: '휴업', 
      value: businessStats?.inactive || 0, 
      color: 'warning' as const, 
      icon: <Clock className="w-5 h-5" />,
      trend: 'down' as const,
      trendValue: 5,
      subtitle: '휴업 비율 8%',
      delay: 300,
    },
    { 
      title: '폐업', 
      value: businessStats?.dissolved || 0, 
      color: 'error' as const, 
      icon: <Shield className="w-5 h-5" />,
      trend: 'neutral' as const,
      trendValue: 0,
      subtitle: '폐업 비율 5%',
      delay: 400,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ==========================================================================
         헤더 프레임 - 대시보드 타이틀 및 소개
         ========================================================================== */}
      <header className="bg-[var(--canvas)] border-b border-hairline-strong mb-8">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-extrabold leading-none tracking-widest text-[var(--ink)]">
            대시보드
          </h1>
          <p className="text-[var(--mute)] text-sm mt-2">
            실시간 비즈니스 상태 한눈에 보기
          </p>
        </div>
      </header>

      {/* ==========================================================================
         메인 컨텐츠 프레임 - 메트릭스, 통계, 트렌드
         ========================================================================== */}
      <main className="max-w-7xl mx-auto">

        {/* DESIGN.md 스타일 메트릭스 배너 */}
        {metrics && <DesignMDMetricsBanner metrics={metrics} />}

        {/* 통계 카드 섹션 */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((card, index) => (
            <StatCard key={card.title} {...card} />
          ))}
        </section>

        {/* 트렌드 차트 섹션 */}
        {trends && (
          <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2" aria-label="트렌드 분석">
            <div>
              <TrendChart title="일일 방문자 수" data={trends.weeklyVisitors} color="#6366f1" height={300} />
            </div>
            <div>
              <TrendChart title="일일 가입자 수" data={trends.weeklySignups} color="#22c55e" height={300} />
            </div>
            <div>
              <TrendChart title="주간 매출 추이" data={trends.monthlySales} color="#eab308" height={300} />
            </div>
            <div>
              <TrendChart title="월간 활성 비즈니스" data={trends.monthlyActive} color="#f97316" height={300} />
            </div>
          </section>
        )}

        {/* 오류 상태 */}
        {error && (
          <div className="mb-6 rounded-xl border border-error-200 bg-error-50 dark:bg-error-900/20 p-4">
            <div className="flex items-center gap-2 text-error-700 dark:text-error-300">
              <AlertCircle size={18} />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="ghost" size="xs" onClick={fetchData} className="ml-auto">
                다시 시도
              </Button>
            </div>
          </div>
        )}

        {loading && !businessStats ? (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} variant="elevated" className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-3"></div>
                    <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} variant="elevated" className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-4"></div>
                    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ==========================================================================
               사이드바 프레임 - 빠른 메뉴, 필터, 인사이트
               ========================================================================== */}
            <aside className="lg:col-span-2 bg-[var(--canvas)] rounded-none p-6 mb-8">
              <h2 className="text-lg font-bold text-[var(--ink)] mb-4">빠른 메뉴</h2>
              <div className="space-y-4">
                <Link href="/businesses" className="group relative rounded-xl border border-gray-100 dark:border-gray-800 p-4 transition-all hover:border-primary-200 dark:hover:border-primary-800">
                  <div className="absolute top-3 right-3 p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                    <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      소상공인 목록
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">전체 소상공인 조회</p>
                  </div>
                </Link>
                <Link href="/businesses/create" className="group relative rounded-xl border border-gray-100 dark:border-gray-800 p-4 transition-all hover:border-primary-200 dark:hover:border-primary-800">
                  <div className="absolute top-3 right-3 p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                    <Plus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      새로운 사업체 등록
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">새로운 소상공인 등록</p>
                  </div>
                </Link>
                <Link href="/sync" className="group relative rounded-xl border border-gray-100 dark:border-gray-800 p-4 transition-all hover:border-primary-200 dark:hover:border-primary-800">
                  <div className="absolute top-3 right-3 p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                    <RefreshCw className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      데이터 동기화
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">공공데이터포털 동기화</p>
                  </div>
                </Link>
                <Link href="/settings" className="group relative rounded-xl border border-gray-100 dark:border-gray-800 p-4 transition-all hover:border-primary-200 dark:hover:border-primary-800">
                  <div className="absolute top-3 right-3 p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                    <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      설정
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">시스템 설정</p>
                  </div>
                </Link>
              </div>
            </aside>

            {/* 푸터 프레임 - 저작권, 버전, 액션 버튼 */}
            <footer className="mt-8 border-t border-hairline-strong pt-8 text-[var(--mute)] text-xs">
              <div className="max-w-7xl mx-auto">
                <p>
                2026 소상공인 정보 트래커 | 데이터 갱신: {lastRefreshed ? formatDate(lastRefreshed) : 'N/A'}
                </p>
                <nav className="mt-4 flex flex-wrap gap-4">
                  <a href="/admin" className="hover:text-primary-600 dark:hover:text-primary-400">관리자 페이지</a>
                  <a href="/help" className="hover:text-gray-400 dark:hover:text-gray-500">도움말</a>
                  <a href="/api/dashboard/stats/download" className="hover:text-primary-600 dark:hover:text-primary-400">데이터 다운로드</a>
                </nav>
                <p className="mt-2 text-xs">© 2026 소상공인 트래커. All rights reserved.</p>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}