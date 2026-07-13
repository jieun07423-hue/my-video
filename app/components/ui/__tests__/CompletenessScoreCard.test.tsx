import { describe, it, expect } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CompletenessScoreCard } from '../CompletenessScoreCard';

describe('CompletenessScoreCard', () => {
  const defaultProps = {
    bizesId: '1234567890',
    totalScore: 85,
    grade: 'B' as const,
    fieldScores: [
      { field: 'name', label: '사업체명', weight: 15, isPresent: true, score: 15 },
      { field: 'roadNameAddress', label: '도로명주소', weight: 12, isPresent: true, score: 12 },
      { field: 'phone', label: '전화번호', weight: 10, isPresent: false, score: 0 },
      { field: 'latitude', label: '위도', weight: 5, isPresent: true, score: 5 },
    ],
    missingFields: ['phone'],
  };

  it('완성도 점수와 등급을 렌더링해야 한다', () => {
    render(<CompletenessScoreCard {...defaultProps} />);

    expect(screen.getByText('데이터 완성도')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText(/B등급/)).toBeInTheDocument();
  });

  it('bizesId를 표시해야 한다', () => {
    render(<CompletenessScoreCard {...defaultProps} />);

    expect(screen.getByText('1234567890')).toBeInTheDocument();
  });

  it('존재하는 필드는 초록색으로 표시해야 한다', () => {
    render(<CompletenessScoreCard {...defaultProps} />);

    expect(screen.getByText('사업체명')).toBeInTheDocument();
    expect(screen.getByText('도로명주소')).toBeInTheDocument();
  });

  it('누락된 필드는 빨간색으로 표시해야 한다', () => {
    render(<CompletenessScoreCard {...defaultProps} />);

    expect(screen.getAllByText('전화번호')[0]).toBeInTheDocument();
    expect(screen.getByText('누락')).toBeInTheDocument();
  });

  it('보완 필요 필드 태그를 표시해야 한다', () => {
    render(<CompletenessScoreCard {...defaultProps} />);

    expect(screen.getByText('보완 필요 필드')).toBeInTheDocument();
  });

  it('A등급은 초록색 스타일을 적용해야 한다', () => {
    render(<CompletenessScoreCard {...defaultProps} grade="A" totalScore={95} missingFields={[]} />);

    expect(screen.getByText(/A등급/)).toBeInTheDocument();
  });

  it('F등급은 빨간색 스타일을 적용해야 한다', () => {
    render(<CompletenessScoreCard {...defaultProps} grade="F" totalScore={30} missingFields={['name', 'phone']} />);

    expect(screen.getByText(/F등급/)).toBeInTheDocument();
  });
});
