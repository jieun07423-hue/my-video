import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { renderWithProviders } from '../../../__tests__/test-utils';
import { ErrorBoundary, ErrorFallback } from '../ErrorBoundary';
import React from 'react';

const ProblemComponent = ({ shouldError }: { shouldError: boolean }) => {
  if (shouldError) {
    throw new Error('Test Error');
  }
  return <div>Normal Component</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  it('에러가 없을 때는 자식 컴포넌트를 정상적으로 렌더링해야 한다', () => {
    renderWithProviders(
      <ErrorBoundary>
        <ProblemComponent shouldError={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal Component')).toBeInTheDocument();
  });

  it('에러 발생 시 기본 에러 UI를 표시해야 한다', () => {
    renderWithProviders(
      <ErrorBoundary>
        <ProblemComponent shouldError={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('알 수 없는 오류가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByText('서비스 이용에 불편을 드려 죄송합니다')).toBeInTheDocument();
  });

  it('커스텀 fallback이 제공되면 해당 UI를 표시해야 한다', () => {
    renderWithProviders(
      <ErrorBoundary fallback={<div>Custom Fallback UI</div>}>
        <ProblemComponent shouldError={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom Fallback UI')).toBeInTheDocument();
  });

  it('다시 시도 버튼 클릭 시 에러 상태가 초기화되어야 한다', async () => {
    let shouldError = true;
    const TestWrapper = () => (
      <ErrorBoundary>
        <ProblemComponent shouldError={shouldError} />
      </ErrorBoundary>
    );

    renderWithProviders(<TestWrapper />);
    
    expect(screen.getByText('알 수 없는 오류가 발생했습니다')).toBeInTheDocument();
    
    shouldError = false;
    const resetButton = screen.getByRole('button', { name: /다시 시도/i });
    fireEvent.click(resetButton);
  });

  it('onError 콜백이 제공되면 에러 발생 시 호출되어야 한다', () => {
    const onErrorMock = jest.fn();
    renderWithProviders(
      <ErrorBoundary onError={onErrorMock}>
        <ProblemComponent shouldError={true} />
      </ErrorBoundary>
    );
    expect(onErrorMock).toHaveBeenCalled();
  });
});

describe('ErrorFallback', () => {
  afterEach(() => {
    cleanup();
  });

  it('에러 메시지와 다시 시도 버튼을 정상적으로 렌더링해야 한다', async () => {
    const mockError = new Error('Fallback Error');
    const resetMock = jest.fn();
    
    renderWithProviders(<ErrorFallback error={mockError} resetError={resetMock} />);
    
    expect(screen.getByText('문제가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByText('Fallback Error')).toBeInTheDocument();
    
    const button = screen.getByRole('button', { name: /다시 시도/i });
    fireEvent.click(button);
    expect(resetMock).toHaveBeenCalled();
  });
});
