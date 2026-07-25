import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import AbTestPanel from '../AbTestPanel';

describe('AbTestPanel', () => {
  const defaultProps = {
    industry: '치과',
    location: '강남',
    target: '',
    goal: '',
    strengths: '',
    keywords: [] as string[],
    toneA: '신뢰/전문',
    toneB: '친근/따뜻',
    onSelectWinner: jest.fn(),
  };

  it('타이틀과 톤 정보를 렌더링해야 한다', () => {
    render(<AbTestPanel {...defaultProps} />);
    expect(screen.getByText('AB 테스트')).toBeInTheDocument();
    expect(screen.getByText('신뢰/전문')).toBeInTheDocument();
    expect(screen.getByText('친근/따뜻')).toBeInTheDocument();
  });

  it('AB 테스트 시작 버튼이 있어야 한다', () => {
    render(<AbTestPanel {...defaultProps} />);
    expect(screen.getByText('AB 테스트 시작')).toBeInTheDocument();
  });

  it('시작 버튼 클릭 시 로딩 상태가 표시되어야 한다', () => {
    render(<AbTestPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('AB 테스트 시작'));
    expect(screen.getByText('AB 테스트 실행 중...')).toBeInTheDocument();
  });
});