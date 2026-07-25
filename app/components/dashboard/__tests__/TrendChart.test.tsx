import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import TrendChart from '../TrendChart';

describe('TrendChart', () => {
  const mockData = [
    { date: '2026-06-01', value: 10, label: '6/1' },
    { date: '2026-06-08', value: 20, label: '6/8' },
    { date: '2026-06-15', value: 15, label: '6/15' },
  ];

  it('타이틀을 렌더링해야 한다', () => {
    render(<TrendChart title="주간 방문자" data={mockData} />);
    expect(screen.getByText('주간 방문자')).toBeInTheDocument();
  });

  it('기본 높이로 렌더링되어야 한다', () => {
    const { container } = render(<TrendChart title="테스트" data={mockData} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('커스텀 컬러를 적용해야 한다', () => {
    const { container } = render(
      <TrendChart title="테스트" data={mockData} color="#ff0000" />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('데이터가 비어있어도 렌더링되어야 한다', () => {
    const { container } = render(<TrendChart title="빈 차트" data={[]} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });
});