import Navbar from '../components/Navbar';
import { StatCard } from '../components/ui/StatCard';
import { SyncStatusCard } from '../components/ui/SyncStatusCard';
import { SchedulerStatusCard } from '../components/ui/SchedulerStatusCard';
import { ManualSyncCard } from '../components/ui/ManualSyncCard';
import { createApiUrl } from '../lib/constants';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            어드민 대시보드
          </h1>
          <p className="text-gray-600">
            시스템 관리 및 데이터 동기화
          </p>
        </div>

        <AdminDashboard />
      </main>
    </div>
  );
}

async function AdminDashboard() {
  const [statsRes, syncStateRes] = await Promise.all([
    fetch(createApiUrl('/api/dashboard/stats'), { cache: 'no-store' }),
    fetch(createApiUrl('/api/sync/status'), { cache: 'no-store' })
  ]);

  if (!statsRes.ok || !syncStateRes.ok) {
    throw new Error('데이터를 불러오는데 실패했습니다.');
  }

  const [statsData, syncStateData] = await Promise.all([
    statsRes.json(),
    syncStateRes.json()
  ]);

  const stats = statsData.data;
  const syncState = syncStateData.data;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <StatCard title="전체 소상공인" value={stats.total || 0} icon="🏪" />
      <StatCard title="신규 등록" value={stats.newRecords || 0} icon="🆕" />
      <StatCard title="영업 중" value={stats.active || 0} icon="✅" />
      <StatCard title="오늘 신규" value={stats.newToday || 0} icon="📅" />
      
      <SyncStatusCard syncState={{
        syncStatus: syncState?.syncStatus || 'idle',
        lastSyncedAt: syncState?.lastSyncedAt,
        errorMessage: syncState?.errorMessage
      }} />
      
      <ManualSyncCard />
    </div>
  );
}
