'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { StatCard } from '@/components/ui/StatCard';
import {
  BarChart3,
  RefreshCw,
  Building2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  Clock,
  Shield,
  Zap,
  ExternalLink,
  Search,
  Edit,
  GitBranch,
  LineChart,
  CheckCircle,
  Settings,
  Target,
  Mail,
  Webhook,
  Cpu,
} from 'lucide-react';

interface QualityMetrics {
  totalBusinesses: number;
  averageCompletenessScore: number;
  duplicateRate: number;
  staleDataRate: number;
  criticalIssuesCount: number;
  overallHealth: 'healthy' | 'warning' | 'critical';
}

interface QualityAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface TrendAnalysis {
  overallTrend: 'improving' | 'declining' | 'stable';
  completenessTrend: 'improving' | 'declining' | 'stable';
  duplicateTrend: 'improving' | 'declining' | 'stable';
}

interface BatchStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
}

interface AnomalyResult {
  totalBusinesses: number;
  anomaliesDetected: number;
  anomalyRate: number;
  riskLevel: string;
}

interface CorrectionResult {
  totalBusinesses: number;
  totalSuggestions: number;
  applied: number;
  skipped: number;
  failed: number;
}

interface LineageResult {
  totalChanges: number;
  averageChangesPerBusiness: number;
  mostActiveBusinesses: { businessId: string; changes: number }[];
}

interface GovernanceResult {
  businessId: string;
  totalRules: number;
  complianceRate: number;
  status: string;
}

function HealthIndicator({ health }: { health: string }) {
  const config = {
    healthy: { color: 'text-green-600', bg: 'bg-green-50', label: '양호', icon: '✓' },
    warning: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: '주의', icon: '!' },
    critical: { color: 'text-red-600', bg: 'bg-red-50', label: '위험', icon: '✗' },
  }[health] || { color: 'text-gray-600', bg: 'bg-gray-50', label: '알 수 없음', icon: '?' };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.bg} ${config.color}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

function TrendIndicator({ trend }: { trend: string }) {
  const config = {
    improving: { color: 'text-green-600', icon: TrendingUp, label: '개선' },
    declining: { color: 'text-red-600', icon: TrendingDown, label: '하락' },
    stable: { color: 'text-gray-600', icon: Activity, label: '안정' },
  }[trend] || { color: 'text-gray-600', icon: Activity, label: '알 수 없음' };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.color}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
}

export default function QualityDashboardPage() {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [trends, setTrends] = useState<TrendAnalysis | null>(null);
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResult | null>(null);
  const [corrections, setCorrections] = useState<CorrectionResult | null>(null);
  const [lineage, setLineage] = useState<LineageResult | null>(null);
  const [governance, setGovernance] = useState<GovernanceResult | null>(null);
  const [rulesEngineStats, setRulesEngineStats] = useState<any>(null);
  const [checkStats, setCheckStats] = useState<any>(null);
  const [scoreStats, setScoreStats] = useState<any>(null);
  const [integrationStats, setIntegrationStats] = useState<any>(null);
  const [notificationStats, setNotificationStats] = useState<any>(null);
  const [aiAnalysisStats, setAiAnalysisStats] = useState<any>(null);
  const [predictionStats, setPredictionStats] = useState<any>(null);
  const [remediationStats, setRemediationStats] = useState<any>(null);
  const [slaStats, setSlaStats] = useState<any>(null);
  const [costStats, setCostStats] = useState<any>(null);
  const [correlationStats, setCorrelationStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [monitoringRes, alertsRes, trendsRes, batchRes, anomalyRes, correctionRes, lineageRes, governanceRes, rulesRes, checkRes, scoreRes, integrationRes, notificationRes, aiAnalysisRes, predictionRes, remediationRes, slaRes, costRes, correlationRes] = await Promise.all([
        fetch('/api/data-quality/monitoring'),
        fetch('/api/data-quality/monitoring?action=unacknowledged'),
        fetch('/api/data-quality/trends?action=report&periodDays=30'),
        fetch('/api/data-quality/batch?action=stats'),
        fetch('/api/data-quality/anomalies'),
        fetch('/api/data-quality/corrections'),
        fetch('/api/data-quality/lineage?action=stats'),
        fetch('/api/data-quality/governance?action=report'),
        fetch('/api/data-quality/rules?action=stats'),
        fetch('/api/data-quality/check?action=stats'),
        fetch('/api/data-quality/score?action=stats'),
        fetch('/api/data-quality/integration?action=stats'),
        fetch('/api/data-quality/notifications?action=stats'),
        fetch('/api/data-quality/ai-analysis?action=stats'),
        fetch('/api/data-quality/prediction?action=stats'),
        fetch('/api/data-quality/remediation?action=stats'),
        fetch('/api/data-quality/sla?action=stats'),
        fetch('/api/data-quality/cost?action=stats'),
        fetch('/api/data-quality/correlation?action=stats'),
      ]);

      if (monitoringRes.ok) {
        const monitoringData = await monitoringRes.json();
        setMetrics(monitoringData.metrics);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts);
      }

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setTrends({
          overallTrend: trendsData.overallTrend,
          completenessTrend: trendsData.metrics?.[0]?.trend || 'stable',
          duplicateTrend: trendsData.metrics?.[1]?.trend || 'stable',
        });
      }

      if (batchRes.ok) {
        const batchData = await batchRes.json();
        setBatchStats(batchData);
      }

      if (anomalyRes.ok) {
        const anomalyData = await anomalyRes.json();
        setAnomalies({
          totalBusinesses: anomalyData.totalBusinesses,
          anomaliesDetected: anomalyData.anomaliesDetected,
          anomalyRate: anomalyData.anomalyRate,
          riskLevel: anomalyData.riskLevel || 'low',
        });
      }

      if (correctionRes.ok) {
        const correctionData = await correctionRes.json();
        setCorrections({
          totalBusinesses: correctionData.totalBusinesses,
          totalSuggestions: correctionData.totalSuggestions,
          applied: correctionData.applied,
          skipped: correctionData.skipped,
          failed: correctionData.failed,
        });
      }

      if (lineageRes.ok) {
        const lineageData = await lineageRes.json();
        setLineage({
          totalChanges: lineageData.totalChanges,
          averageChangesPerBusiness: lineageData.averageChangesPerBusiness,
          mostActiveBusinesses: lineageData.mostActiveBusinesses || [],
        });
      }

      if (governanceRes.ok) {
        const governanceData = await governanceRes.json();
        setGovernance({
          businessId: governanceData.businessId,
          totalRules: governanceData.totalRules,
          complianceRate: governanceData.complianceRate || 0,
          status: governanceData.status || 'unknown',
        });
      }

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRulesEngineStats(rulesData);
      }

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        setCheckStats(checkData);
      }

      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        setScoreStats(scoreData);
      }

      if (integrationRes.ok) {
        const integrationData = await integrationRes.json();
        setIntegrationStats(integrationData);
      }

      if (notificationRes.ok) {
        const notificationData = await notificationRes.json();
        setNotificationStats(notificationData);
      }

      if (aiAnalysisRes.ok) {
        const aiData = await aiAnalysisRes.json();
        setAiAnalysisStats(aiData);
      }

      if (predictionRes.ok) {
        const predData = await predictionRes.json();
        setPredictionStats(predData);
      }

      if (remediationRes.ok) {
        const remData = await remediationRes.json();
        setRemediationStats(remData);
      }

      if (slaRes.ok) {
        const slaData = await slaRes.json();
        setSlaStats(slaData);
      }

      if (costRes.ok) {
        const costData = await costRes.json();
        setCostStats(costData);
      }

      if (correlationRes.ok) {
        const corrData = await correlationRes.json();
        setCorrelationStats(corrData);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">데이터 품질 대시보드</h1>
            <p className="mt-1 text-gray-600">실시간 데이터 품질 모니터링 및 분석</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/api/data-quality/monitoring"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
            >
              <BarChart3 size={16} />
              API 문서
              <ExternalLink size={14} />
            </Link>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {loading && !metrics ? (
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
            {/* 건강 상태 */}
            <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Shield size={20} className="text-indigo-600" />
                    전체 데이터 품질 상태
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">현재 시스템의 데이터 품질 건강 상태</p>
                </div>
                <HealthIndicator health={metrics?.overallHealth || 'healthy'} />
              </div>
            </div>

            {/* 핵심 메트릭 */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Activity size={20} className="text-indigo-600" />
                  핵심 품질 지표
                </div>
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="평균 완성도"
                  value={metrics?.averageCompletenessScore || 0}
                  color="blue"
                  icon="📊"
                  subtitle="전체 사업체 평균"
                  delay={100}
                />
                <StatCard
                  title="중복률"
                  value={metrics?.duplicateRate || 0}
                  color="yellow"
                  icon="🔄"
                  subtitle="중복 의심 비율"
                  delay={200}
                />
                <StatCard
                  title="오래된 데이터"
                  value={metrics?.staleDataRate || 0}
                  color="amber"
                  icon="⏰"
                  subtitle="업데이트 필요 비율"
                  delay={300}
                />
                <StatCard
                  title="심각한 이슈"
                  value={metrics?.criticalIssuesCount || 0}
                  color="red"
                  icon="⚠️"
                  subtitle="즉시 수정 필요"
                  delay={400}
                />
              </div>
            </div>

            {/* 트렌드 분석 */}
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <TrendingUp size={18} className="text-indigo-600" />
                  트렌드 분석
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                    <span className="text-sm text-gray-600">전체 트렌드</span>
                    <TrendIndicator trend={trends?.overallTrend || 'stable'} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                    <span className="text-sm text-gray-600">완성도 트렌드</span>
                    <TrendIndicator trend={trends?.completenessTrend || 'stable'} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                    <span className="text-sm text-gray-600">중복 트렌드</span>
                    <TrendIndicator trend={trends?.duplicateTrend || 'stable'} />
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/api/data-quality/trends?action=report"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    상세 리포트 보기
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>

              {/* 알림 현황 */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Bell size={18} className="text-indigo-600" />
                  알림 현황
                </h2>
                {alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className={`rounded-xl px-4 py-3 ${
                          alert.severity === 'critical'
                            ? 'bg-red-50 border border-red-200'
                            : alert.severity === 'high'
                            ? 'bg-orange-50 border border-orange-200'
                            : 'bg-gray-50'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">확인되지 않은 알림이 없습니다.</p>
                )}
                <div className="mt-4">
                  <Link
                    href="/api/data-quality/monitoring?action=alerts"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    모든 알림 보기
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* 배치 처리 현황 */}
            <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Zap size={18} className="text-indigo-600" />
                배치 처리 현황
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-sm text-gray-600">전체 작업</p>
                  <p className="text-2xl font-bold text-gray-900">{batchStats?.totalJobs || 0}</p>
                </div>
                <div className="rounded-xl bg-blue-50 px-4 py-3">
                  <p className="text-sm text-blue-600">대기 중</p>
                  <p className="text-2xl font-bold text-blue-900">{batchStats?.pendingJobs || 0}</p>
                </div>
                <div className="rounded-xl bg-green-50 px-4 py-3">
                  <p className="text-sm text-green-600">완료</p>
                  <p className="text-2xl font-bold text-green-900">{batchStats?.completedJobs || 0}</p>
                </div>
                <div className="rounded-xl bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">실패</p>
                  <p className="text-2xl font-bold text-red-900">{batchStats?.failedJobs || 0}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  href="/api/data-quality/batch?action=jobs"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  배치 작업 관리
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>

            {/* 5단계 고도화 기능 */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-indigo-600" />
                  5단계 고도화 기능
                </div>
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* 이상 탐지 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <Search size={18} className="text-red-600" />
                    <h3 className="font-semibold text-gray-900">이상 탐지</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">탐지된 이상</span>
                      <span className="font-bold text-red-600">{anomalies?.anomaliesDetected || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">이상 비율</span>
                      <span className="font-bold text-gray-900">{(anomalies?.anomalyRate || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">위험 수준</span>
                      <span className={`font-bold ${anomalies?.riskLevel === 'critical' ? 'text-red-600' : anomalies?.riskLevel === 'high' ? 'text-orange-600' : anomalies?.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                        {anomalies?.riskLevel === 'critical' ? '위험' : anomalies?.riskLevel === 'high' ? '높음' : anomalies?.riskLevel === 'medium' ? '보통' : '낮음'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/anomalies"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      상세 보기
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* 데이터 보정 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <Edit size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">데이터 보정</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">보정 제안</span>
                      <span className="font-bold text-blue-600">{corrections?.totalSuggestions || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">적용됨</span>
                      <span className="font-bold text-green-600">{corrections?.applied || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">건너뜀</span>
                      <span className="font-bold text-yellow-600">{corrections?.skipped || 0}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/corrections"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      상세 보기
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* 데이터 리니지 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <GitBranch size={18} className="text-purple-600" />
                    <h3 className="font-semibold text-gray-900">데이터 리니지</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 변경</span>
                      <span className="font-bold text-purple-600">{lineage?.totalChanges || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">평균 변경 횟수</span>
                      <span className="font-bold text-gray-900">{(lineage?.averageChangesPerBusiness || 0).toFixed(2)}회/사업체</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">가장 활발한 사업체</span>
                      <span className="font-bold text-gray-900">{lineage?.mostActiveBusinesses?.length || 0}개</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/lineage"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      상세 보기
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* 거버넌스 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle size={18} className="text-green-600" />
                    <h3 className="font-semibold text-gray-900">품질 거버넌스</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 규칙</span>
                      <span className="font-bold text-green-600">{governance?.totalRules || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">준수율</span>
                      <span className="font-bold text-gray-900">{(governance?.complianceRate || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">상태</span>
                      <span className={`font-bold ${governance?.status === 'compliant' ? 'text-green-600' : governance?.status === 'non-compliant' ? 'text-red-600' : 'text-yellow-600'}`}>
                        {governance?.status === 'compliant' ? '준수' : governance?.status === 'non-compliant' ? '미준수' : '부분 준수'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/governance?action=report"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      상세 보기
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* 6단계 고도화 기능 */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Cpu size={20} className="text-indigo-600" />
                  6단계 고도화 기능
                </div>
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* 규칙 엔진 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <Settings size={18} className="text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">규칙 기반 검증</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 검증</span>
                      <span className="font-bold text-indigo-600">{rulesEngineStats?.totalValidations || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">성공률</span>
                      <span className="font-bold text-green-600">{((rulesEngineStats?.successRate || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">활성 규칙</span>
                      <span className="font-bold text-gray-900">{rulesEngineStats?.activeRules || 0}개</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/rules?action=rules"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      규칙 관리
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* 실시간 검증 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <Target size={18} className="text-cyan-600" />
                    <h3 className="font-semibold text-gray-900">실시간 품질 검증</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 검증</span>
                      <span className="font-bold text-cyan-600">{checkStats?.totalChecks || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">평균 점수</span>
                      <span className="font-bold text-gray-900">{(checkStats?.averageScore || 0).toFixed(1)}점</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">통과율</span>
                      <span className="font-bold text-green-600">{((checkStats?.passRate || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/check?action=stats"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      검증 이력
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* 품질 점수 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <BarChart3 size={18} className="text-amber-600" />
                    <h3 className="font-semibold text-gray-900">품질 점수 시스템</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 점수</span>
                      <span className="font-bold text-amber-600">{scoreStats?.totalScores || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">평균 점수</span>
                      <span className="font-bold text-gray-900">{(scoreStats?.averageScore || 0).toFixed(1)}점</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">등급 분포</span>
                      <span className="font-bold text-gray-900">{Object.keys(scoreStats?.gradeDistribution || {}).length}등급</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/score?action=stats"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      점수 상세
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* 외부 연동 & 알림 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <Webhook size={18} className="text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">연동 & 알림</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">연동 이벤트</span>
                      <span className="font-bold text-emerald-600">{integrationStats?.totalEvents || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">연동 성공률</span>
                      <span className="font-bold text-green-600">{((integrationStats?.successRate || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전송 알림</span>
                      <span className="font-bold text-gray-900">{notificationStats?.sentCount || 0}건</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/integration?action=stats"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      연동 관리
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* 7단계 고도화 기능 */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Cpu size={20} className="text-indigo-600" />
                  7단계 고도화 기능
                </div>
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* AI 기반 분석 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <Cpu size={18} className="text-violet-600" />
                    <h3 className="font-semibold text-gray-900">AI 기반 분석</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 분석</span>
                      <span className="font-bold text-violet-600">{aiAnalysisStats?.totalAnalyses || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">평균 점수</span>
                      <span className="font-bold text-gray-900">{(aiAnalysisStats?.averageScore || 0).toFixed(1)}점</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">제공자</span>
                      <span className="font-bold text-gray-900">{aiAnalysisStats?.providerDistribution ? Object.keys(aiAnalysisStats.providerDistribution).length : 0}개</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/ai-analysis?action=stats"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      분석 상세
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* 품질 예측 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <LineChart size={18} className="text-cyan-600" />
                    <h3 className="font-semibold text-gray-900">품질 예측</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 예측</span>
                      <span className="font-bold text-cyan-600">{predictionStats?.totalPredictions || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">평균 신뢰도</span>
                      <span className="font-bold text-gray-900">{((predictionStats?.averageConfidence || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">고위험 지표</span>
                      <span className="font-bold text-red-600">{predictionStats?.riskDistribution?.high || 0}개</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/prediction?action=stats"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      예측 상세
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* 자동 치료 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <Zap size={18} className="text-amber-600" />
                    <h3 className="font-semibold text-gray-900">자동 치료 워크플로우</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 실행</span>
                      <span className="font-bold text-amber-600">{remediationStats?.totalExecutions || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">성공률</span>
                      <span className="font-bold text-green-600">{((remediationStats?.successRate || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">활성 워크플로우</span>
                      <span className="font-bold text-gray-900">{remediationStats?.workflowFrequency ? Object.keys(remediationStats.workflowFrequency).length : 0}개</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/remediation?action=stats"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      치료 관리
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* SLA 관리 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <Target size={18} className="text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">SLA 관리</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">활성 SLA</span>
                      <span className="font-bold text-emerald-600">{slaStats?.totalDefinitions || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 준수율</span>
                      <span className="font-bold text-gray-900">{((slaStats?.overallCompliance || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">위반 SLA</span>
                      <span className="font-bold text-red-600">{slaStats?.breachedSLAs?.length || 0}개</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/sla?action=definitions"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      SLA 관리
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* 비용 분석 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <BarChart3 size={18} className="text-rose-600" />
                    <h3 className="font-semibold text-gray-900">품질 비용 분석</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 비용</span>
                      <span className="font-bold text-rose-600">{(costStats?.totalCost || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 항목</span>
                      <span className="font-bold text-gray-900">{costStats?.totalEntries || 0}건</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">평균 비용</span>
                      <span className="font-bold text-gray-900">{(costStats?.averageCostPerEntry || 0).toLocaleString()}원</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/cost?action=stats"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      비용 리포트
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* 상관 분석 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                  <div className="mb-3 flex items-center gap-2">
                    <GitBranch size={18} className="text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">상관 분석</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">전체 분석</span>
                      <span className="font-bold text-indigo-600">{correlationStats?.totalAnalyses || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">발견된 쌍</span>
                      <span className="font-bold text-gray-900">{correlationStats?.totalPairsFound || 0}개</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-600">평균 상관계수</span>
                      <span className="font-bold text-gray-900">{(correlationStats?.averageCorrelation || 0).toFixed(3)}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/api/data-quality/correlation?action=stats"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      분석 상세
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* 빠른 링크 */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <BarChart3 size={18} className="text-indigo-600" />
                데이터 품질 도구
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { href: '/api/data-quality/validate', label: '사업자 검증', desc: '실시간 검증 API', icon: '🔍' },
                  { href: '/api/data-quality/completeness?action=report', label: '완성도 리포트', desc: '전체 완성도 분석', icon: '📊' },
                  { href: '/api/data-quality/duplicates', label: '중복 탐지', desc: '스마트 중복 검사', icon: '🔄' },
                  { href: '/api/data-quality/anomalies?action=report', label: '이상 탐지 리포트', desc: 'ML 기반 이상 분석', icon: '🕵️' },
                  { href: '/api/data-quality/corrections', label: '데이터 보정', desc: '자동 데이터 보정', icon: '✏️' },
                  { href: '/api/data-quality/lineage?action=report', label: '리니지 리포트', desc: '데이터 변경 이력', icon: '🔗' },
                  { href: '/api/data-quality/analytics?action=executive', label: 'Executive 리포트', desc: '경영진 리포트', icon: '📈' },
                  { href: '/api/data-quality/governance?action=report', label: '거버넌스 리포트', desc: '품질 거버넌스 현황', icon: '✅' },
                  { href: '/api/data-quality/rules?action=rules', label: '규칙 엔진', desc: '설정 가능한 검증 규칙', icon: '⚙️' },
                  { href: '/api/data-quality/check?action=stats', label: '실시간 검증 통계', desc: '실시간 품질 검증 현황', icon: '🎯' },
                  { href: '/api/data-quality/score?action=stats', label: '품질 점수 통계', desc: '다차원 품질 점수 분석', icon: '🏅' },
                  { href: '/api/data-quality/reports?action=history', label: '자동화 리포트', desc: '주기적 품질 리포트', icon: '📋' },
                  { href: '/api/data-quality/integration?action=config', label: '외부 시스템 연동', desc: 'Slack/Email/Webhook 연동', icon: '🔗' },
                  { href: '/api/data-quality/notifications?action=stats', label: '알림 서비스', desc: '품질 알림 관리', icon: '🔔' },
                  { href: '/api/data-quality/ai-analysis?action=stats', label: 'AI 분석', desc: 'Gemini/Ollama AI 기반 분석', icon: '🤖' },
                  { href: '/api/data-quality/prediction?action=stats', label: '품질 예측', desc: '이동평균/지수평활/선형회귀', icon: '📈' },
                  { href: '/api/data-quality/remediation?action=workflows', label: '자동 치료', desc: '워크플로우 자동 실행', icon: '⚡' },
                  { href: '/api/data-quality/sla?action=definitions', label: 'SLA 관리', desc: '서비스 수준 협약 추적', icon: '🎯' },
                  { href: '/api/data-quality/cost?action=report', label: '비용 분석', desc: '예방/탐지/수정/실패 비용', icon: '💰' },
                  { href: '/api/data-quality/correlation?action=history', label: '상관 분석', desc: '교차 시스템 상관관계 분석', icon: '🔗' },
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
