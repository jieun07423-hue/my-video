'use client';

interface SchedulerStatusCardProps {
  schedulerStatus: {
    running: boolean;
  };
}

export function SchedulerStatusCard({ schedulerStatus }: SchedulerStatusCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        스케줄러 상태
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">실행 중</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            schedulerStatus.running
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {schedulerStatus.running ? '실행 중' : '중지'}
          </span>
        </div>
      </div>
    </div>
  );
}
