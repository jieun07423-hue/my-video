import { describe, it, expect, vi, beforeEach, afterEach } from '@jest/globals';
import { render, screen, cleanup } from '@testing-library/react';
import { SyncStatusCard } from '../SyncStatusCard';

describe('SyncStatusCard', () => {
  const mockSyncStatus = {
    syncStatus: 'success' as const,
    lastSyncedAt: '2026-04-29T10:00:00Z',
    errorMessage: null,
  };

  afterEach(() => {
    cleanup();
  });

  it('기본 정보와 성공 상태가 올바르게 렌더링되어야 한다', () => {
    render(<SyncStatusCard syncStatus={mockSyncStatus} />);
    
    expect(screen.getByText('동기화 상태')).toBeInTheDocument();
    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText(/마지막 동기화/)).toBeInTheDocument();
  });

  it('idle 상태일 때 올바른 색상 클래스가 적용되어야 한다', () => {
    render(<SyncStatusCard syncStatus={{ ...mockSyncStatus, syncStatus: 'idle' }} />);
    const statusBadge = screen.getByTestId('sync-status-badge');
    expect(statusBadge).toHaveClass('bg-gray-100');
  });

  it('running 상태일 때 올바른 색상 클래스가 적용되어야 한다', () => {
    render(<SyncStatusCard syncStatus={{ ...mockSyncStatus, syncStatus: 'running' }} />);
    const statusBadge = screen.getByTestId('sync-status-badge');
    expect(statusBadge).toHaveClass('bg-blue-100');
  });

  it('success 상태일 때 올바른 색 correct 색상 클래스가 적용되어야 한다', () => {
    render(<SyncStatusCard syncStatus={{ ...mockSyncStatus, syncStatus: 'success' }} />);
    const statusBadge = screen.getByTestId('sync-status-badge');
    expect(statusBadge).toHaveClass('bg-green-100');
  });

  it('failed 상태일 때 올바른 색상 클래스가 적용되어야 한다', () => {
    render(<SyncStatusCard syncStatus={{ ...mockSyncStatus, syncStatus: 'failed' }} />);
    const statusBadge = screen.getByTestId('sync-status-badge');
    expect(statusBadge).toHaveClass('bg-red-100');
  });

  it('에러 메시지가 있을 때 올바르게 표시되어야 한다', () => {
    const errorStatus = {
      ...mockSyncStatus,
      syncStatus: 'failed' as const,
      errorMessage: '네트워크 연결 오류',
    };
    render(<SyncStatusCard syncStatus={errorStatus} />);
    
    expect(screen.getByText(/에러: 네트워크 연결 오류/)).toBeInTheDocument();
  });
});
