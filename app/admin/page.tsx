'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Navbar from '../components/Navbar'
import { createApiUrl } from '../lib/constants'

const DynamicStatCard = dynamic(() => import('../components/ui/StatCard').then(m => ({ default: m.StatCard })), { ssr: false })
const DynamicSyncStatusCard = dynamic(() => import('../components/ui/SyncStatusCard').then(m => ({ default: m.SyncStatusCard })), { ssr: false })
const DynamicManualSyncCard = dynamic(() => import('../components/ui/ManualSyncCard').then(m => ({ default: m.ManualSyncCard })), { ssr: false })

export default function AdminPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data?.user?.email) {
          setUserEmail(data.user.email)
        }
      })
      .catch(() => {})
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">
            {userEmail ?? '사용자'}님으로 로그인됨
          </span>
          <button
            onClick={handleSignOut}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            로그아웃
          </button>
        </div>
      </Navbar>
      
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

function AdminDashboard() {
  const [stats, setStats] = useState<{
    total: number
    newRecords: number
    active: number
    newToday: number
  } | null>(null)
  const [syncState, setSyncState] = useState<{
    syncStatus: string
    lastSyncedAt: string | null
    errorMessage: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, syncStateRes] = await Promise.all([
          fetch(createApiUrl('/api/dashboard/stats'), { cache: 'no-store' }),
          fetch(createApiUrl('/api/sync/status'), { cache: 'no-store' })
        ])

        if (!statsRes.ok || !syncStateRes.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.')
        }

        const [statsData, syncStateData] = await Promise.all([
          statsRes.json(),
          syncStateRes.json()
        ])

        setStats(statsData.data)
        setSyncState(syncStateData.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="text-gray-500">데이터 로딩 중...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <DynamicStatCard title="전체 소상공인" value={stats?.total || 0} icon="🏪" />
      <DynamicStatCard title="신규 등록" value={stats?.newRecords || 0} icon="🆕" />
      <DynamicStatCard title="영업 중" value={stats?.active || 0} icon="✅" />
      <DynamicStatCard title="오늘 신규" value={stats?.newToday || 0} icon="📅" />
      
      <DynamicSyncStatusCard syncStatus={{
        syncStatus: syncState?.syncStatus || 'idle',
        lastSyncedAt: syncState?.lastSyncedAt || null,
        errorMessage: syncState?.errorMessage || null
      }} />
      
      <DynamicManualSyncCard />
    </div>
  );
}
