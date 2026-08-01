'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/core/Card';
import { Button } from '@/components/ui/core/Button';
import { Badge, StatusBadge } from '@/components/ui/core/Badge';
import { StatCard } from '@/components/ui/StatCard';
import TrendChart from '@/components/dashboard/TrendChart';
import IndustryChart from '@/components/dashboard/IndustryChart';
import { Progress } from '@/components/ui/core/Progress';
import Navbar from '@/components/Navbar';
import {
  Building2,
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
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
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">대시보드</h1>
              <Badge variant="success" size="sm">실시간</Badge>
            </div>
            <p className="mt-1 text-gray-600 dark:text-gray-400">소상공인 정보 종합 현황 및 실시간 모니터링</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" leftIcon={<Search />} className="hidden sm:inline-flex">
              검색
            </Button>
            <Button variant="ghost" size="sm" leftIcon={<Bell />} />
            <Button variant="ghost" size="sm" leftIcon={<Settings />} />
            <Button
              onClick={fetchData}
              disabled={loading}
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            >
              새로고침
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Download size={16} />}>
              리포트 다운로드
            </Button>
          </div>
        </div>

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
            {/* 메인 통계 카드 */}
            <section className="mb-8" aria-label="소상공인 현황">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-2">
                    <Building2 size={20} className="text-primary-600 dark:text-primary-400" />
                    소상공인 현황
                  </div>
                </h2>
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight size={14} />}>
                  상세 보기
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statsCards.map((card, index) => (
                  <StatCard key={card.title} {...card} />
                ))}
              </div>
            </section>

            {/* 메트릭스 카드 */}
            {metrics && (
              <section className="mb-8" aria-label="시스템 메트릭">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <Zap size={20} className="text-warning-600 dark:text-warning-400" />
                      시스템 메트릭
                    </div>
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard 
                    title="동기화 성공률" 
                    value={`${metrics.syncSuccessRate}%`} 
                    color="success" 
                    icon={<Database className="w-5 h-5" />}
                    trend="up"
                    trendValue={2.3}
                    subtitle="목표 95% 달성"
                    delay={100}
                  />
                  <StatCard 
                    title="평균 응답 시간" 
                    value={`${metrics.avgResponseTime}ms`} 
                    color="info" 
                    icon={<Zap className="w-5 h-5" />}
                    trend="down"
                    trendValue={15}
                    subtitle="목표 500ms 이내"
                    delay={200}
                  />
                  <StatCard 
                    title="데이터 품질 점수" 
                    value={`${metrics.dataQualityScore}/100`} 
                    color="primary" 
                    icon={<Shield className="w-5 h-5" />}
                    trend="up"
                    trendValue={5}
                    subtitle="전월 대비 5점 상승"
                    delay={300}
                  />
                  <StatCard 
                    title="활성 사용자" 
                    value={metrics.activeUsers} 
                    color="warning" 
                    icon={<Users className="w-5 h-5" />}
                    trend="up"
                    trendValue={120}
                    subtitle="일일 활성 사용자"
                    delay={400}
                  />
                </div>
              </section>
            )}

            {/* 트렌드 차트 */}
            {trends && (
              <section className="mb-8" aria-label="트렌드 분석">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={20} className="text-primary-600 dark:text-primary-400" />
                      트렌드 분석
                    </div>
                  </h2>
                  <select className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="week">최근 7일</option>
                    <option value="month">최근 30일</option>
                    <option value="quarter">최근 90일</option>
                  </select>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <TrendChart title="일일 방문자 수" data={trends.weeklyVisitors} color="#6366f1" height={300} />
                  <TrendChart title="일일 가입자 수" data={trends.weeklySignups} color="#22c55e" height={300} />
                  <TrendChart title="광고 캠페인 추이" data={trends.campaignTrends} color="#a855f7" height={300} />
                  <TrendChart title="월별 매출 추이" data={trends.monthlyRevenue} format="currency" color="#f97316" height={300} />
                </div>
                <div className="mt-6">
                  <IndustryChart data={trends.industryDistribution} />
                </div>
              </section>
            )}

            {/* 동기화 상태 & 광고 통계 */}
            <section className="mb-8" aria-label="동기화 및 광고 현황">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 동기화 상태 */}
                <Card variant="elevated">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                          <RefreshCw size={18} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base">데이터 동기화 상태</CardTitle>
                          <CardDescription>공공데이터포털 연동 현황</CardDescription>
                        </div>
                      </div>
                      <Link href="/admin" className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center gap-1">
                        관리 페이지
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {syncState ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-sm text-gray-600 dark:text-gray-400">동기화 상태</span>
                          <SyncStatusIndicator status={syncState.syncStatus} animated />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-sm text-gray-600 dark:text-gray-400">마지막 동기화</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(syncState.lastSyncedAt)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-sm text-gray-600 dark:text-gray-400">누적 동기화</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{syncState.totalSynced.toLocaleString()}건</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-sm text-gray-600 dark:text-gray-400">신규 발견</span>
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{syncState.newRecordsCount.toLocaleString()}건</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-sm text-gray-600 dark:text-gray-400">성공률</span>
                          <span className="text-sm font-medium text-success-600 dark:text-success-400">
                            {syncState.syncCount > 0 ? ((syncState.totalSynced / syncState.syncCount) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        {syncState.errorMessage && (
                          <div className="rounded-xl border border-error-200 bg-error-50 dark:bg-error-900/20 p-3">
                            <p className="flex items-center gap-1.5 text-sm text-error-700 dark:text-error-300">
                              <AlertCircle size={14} />
                              {syncState.errorMessage}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">동기화 상태를 불러올 수 없습니다.</p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="primary" size="sm" fullWidth leftIcon={<RefreshCw size={14} />}>
                      수동 동기화 실행
                    </Button>
                  </CardFooter>
                </Card>

                {/* 광고 캠페인 통계 */}
                <Card variant="elevated">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-warning-100 dark:bg-warning-900/30">
                          <TrendingUp size={18} className="text-warning-600 dark:text-warning-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base">광고 캠페인 현황</CardTitle>
                          <CardDescription>AI 광고 생성 현황</CardDescription>
                        </div>
                      </div>
                      <Link href="/ad" className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center gap-1">
                        광고 생성
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {adStats ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-sm text-gray-600 dark:text-gray-400">전체 캠페인</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{adStats.campaigns.total}개</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <StatusBadge status="success" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">완료</span>
                            </div>
                            <span className="text-sm font-medium text-success-600 dark:text-success-400">{adStats.campaigns.completed}개</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <StatusBadge status="processing" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">생성 중</span>
                            </div>
                            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{adStats.campaigns.generating}개</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <StatusBadge status="failed" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">실패</span>
                            </div>
                            <span className="text-sm font-medium text-error-600 dark:text-error-400">{adStats.campaigns.failed}개</span>
                          </div>
                        </div>
                        {adStats.cache && (
                          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              캐시: {adStats.cache.keys}개 키 / {adStats.cache.size} 크기
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">광고 데이터를 불러올 수 없습니다.</p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="primary" size="sm" fullWidth leftIcon={<Zap size={14} />}>
                      광고 생성하기
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </section>

            {/* 빠른 메뉴 & 시스템 상태 */}
            <section className="mb-8" aria-label="빠른 메뉴">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card variant="elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-secondary-100 dark:bg-secondary-800">
                          <BarChart3 size={18} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <CardTitle className="text-base">빠른 메뉴</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { href: '/businesses', label: '소상공인 목록', desc: '전체 소상공인 조회', icon: Building2, color: 'primary' },
                        { href: '/seoul-permits', label: '서울 인허가', desc: '서울시 인허가 정보', icon: Shield, color: 'success' },
                        { href: '/ad', label: '광고 생성', desc: 'AI 광고 카피 생성', icon: Zap, color: 'warning' },
                        { href: '/new', label: '신규 등록', desc: '신규 소상공인 확인', icon: Users, color: 'info' },
                      ].map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="group relative rounded-xl border border-gray-100 dark:border-gray-800 p-4 transition-all hover:border-primary-200 dark:hover:border-primary-800 hover:shadow-md"
                        >
                          <div className={`absolute top-3 right-3 p-2 rounded-xl bg-${link.color}-100 dark:bg-${link.color}-900/30`}>
                            <link.icon className={`w-5 h-5 text-${link.color}-600 dark:text-${link.color}-400`} />
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">{link.label}</h3>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{link.desc}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="elevated" className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-success-100 dark:bg-success-900/30">
                          <CheckCircle size={18} className="text-success-600 dark:text-success-400" />
                        </div>
                        <CardTitle className="text-base">시스템 상태</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={95} max={100} size="sm" showLabel variant="success" className="w-32" />
                        <span className="text-xs font-medium text-success-600 dark:text-success-400">95%</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
{[
                        { label: '데이터베이스 연결', status: 'success' as const, detail: '정상 연결됨' },
                        { label: 'Redis 캐시', status: 'success' as const, detail: '히트율 87%' },
                        { label: '공공데이터포털 API', status: 'success' as const, detail: '응답 시간 243ms' },
                        { label: '이메일 발송 서비스', status: 'pending' as const, detail: '일부 지연 발생' },
                        { label: '슬랙 알림', status: 'success' as const, detail: '정상 작동' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center gap-3">
                            <StatusBadge status={item.status} />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{item.detail}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* 최근 활동 & 알림 */}
            <section className="mb-8" aria-label="최근 활동">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card variant="elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                          <Clock size={18} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <CardTitle className="text-base">최근 동기화 이력</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {[
                        { time: '2분 전', action: '공공데이터포털 동기화', status: 'success' as const, count: '1,234건' },
                        { time: '1시간 전', action: '데이터 품질 검사', status: 'success' as const, count: '98.7%' },
                        { time: '3시간 전', action: '중복 데이터 병합', status: 'success' as const, count: '23건 병합' },
                        { time: '6시간 전', action: '스케줄 동기화', status: 'success' as const, count: '5,678건' },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                              <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.action}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{item.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.count}</span>
                            <StatusBadge status={item.status} className="ml-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-warning-100 dark:bg-warning-900/30">
                          <Bell size={18} className="text-warning-600 dark:text-warning-400" />
                        </div>
                        <CardTitle className="text-base">알림 및 경고</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {[
                        { type: 'warning', title: '이메일 발송 지연', message: '일부 이메일 발송이 지연되고 있습니다.', time: '10분 전' },
                        { type: 'info', title: '신규 데이터 업데이트', message: '공공데이터포털에서 234건의 신규 데이터가 업데이트되었습니다.', time: '1시간 전' },
                        { type: 'success', title: '동기화 완료', message: '오전 06:00 예약 동기화가 성공적으로 완료되었습니다.', time: '6시간 전' },
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' : item.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                            {item.type === 'warning' && <AlertCircle size={14} className="text-yellow-600 dark:text-yellow-400" />}
                            {item.type === 'success' && <CheckCircle size={14} className="text-green-600 dark:text-green-400" />}
                            {item.type === 'info' && <Info size={14} className="text-blue-600 dark:text-blue-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{item.message}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}