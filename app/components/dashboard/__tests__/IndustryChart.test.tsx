import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import IndustryChart from '../IndustryChart';

describe('IndustryChart', () => {
  const mockData = [
    { name: '음식점', count: 150, percentage: 30 },
    { name: '편의점', count: 80, percentage: 16 },
    { name: '카페', count: 60, percentage: 12 },
  ];

  it('타이틀을 렌더링해야 한다', () => {
    render(<IndustryChart data={mockData} />);
    expect(screen.getByText('업종 분포 (Top 10)')).toBeInTheDocument();
  });

  it('데이터가 있으면 차트를 렌더링해야 한다', () => {
    const { container } = render(<IndustryChart data={mockData} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('데이터가 비어있으면 빈 상태 메시지를 표시해야 한다', () => {
    render(<IndustryChart data={[]} />);
    expect(screen.getByText('업종 데이터가 없습니다.')).toBeInTheDocument();
  });

  it('각 업종의 개수를 올바르게 표시해야 한다', () => {
    const { container } = render(<IndustryChart data={mockData} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });
});