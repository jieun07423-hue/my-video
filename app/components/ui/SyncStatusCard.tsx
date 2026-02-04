'use client';

import { lucide } from 'lucide-react';

interface SyncStatusCardProps {
  syncStatus: {
    syncStatus: 'idle' | 'running' | 'success' | 'failed';
    lastSyncedAt: any;
    errorMessage: any;
  };
}

export function SyncStatusCard({ syncStatus }: SyncStatusCardProps) {
  const statusColors = {
    idle: 'bg-gray-100 text-gray-800',
    running: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        동기화 상태
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">상태</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusColors[syncStatus.syncStatus as keyof typeof statusColors] ||
            'bg-gray-100 text-gray-800'
          }`}>
            {syncStatus.syncStatus}
          </span>
        </div>
        {syncStatus.lastSyncedAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">마지막 동기화</span>
            <span className="text-sm font-medium text-gray-900">
              {new Date(syncStatus.lastSyncedAt).toLocaleString('ko-KR')}
            </span>
          </div>
        )}
        {syncStatus.errorMessage && (
          <div className="text-sm text-red-600">
            에러: {syncStatus.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
