import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SchedulerStatusCard } from '../SchedulerStatusCard';

describe('SchedulerStatusCard', () => {
  it('실행 중일 때 올바른 상태와 색상이 표시되어야 한다', () => {
    render(<SchedulerStatusCard schedulerStatus={{ running: true }} />);
    
    expect(screen.getByText('스케줄러 상태')).toBeInTheDocument();
    const statusBadge = screen.getAllByText('실행 중')[1];
    expect(statusBadge).toHaveClass('bg-green-100');
  });

  it('중지 상태일 때 올바른 상태와 색상이 표시되어야 한다', () => {
    render(<SchedulerStatusCard schedulerStatus={{ running: false }} />);
    
    expect(screen.getByText('중지')).toBeInTheDocument();
    expect(screen.getByText('중지').closest('span')).toHaveClass('bg-gray-100');
  });
});
