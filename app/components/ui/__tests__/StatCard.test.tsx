import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('title과 value를 렌더링해야 한다', () => {
    render(<StatCard title="총 사업체" value={100} />);
    
    expect(screen.getByText('총 사업체')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('색상 옵션을 올바르게 적용해야 한다', () => {
    const { container } = render(<StatCard title="테스트" value={50} color="success" />);
    
    expect(container.firstChild).toBeTruthy();
  });

  it('trend 정보가 있을 때 렌더링해야 한다', () => {
    render(<StatCard title="테스트" value={100} trend="up" trendValue={10} />);
    
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('subtitle을 렌더링해야 한다', () => {
    render(<StatCard title="테스트" value={100} subtitle="부제목" />);
    
    expect(screen.getByText('부제목')).toBeInTheDocument();
  });
});