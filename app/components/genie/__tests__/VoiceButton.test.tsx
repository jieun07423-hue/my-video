import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { renderWithProviders } from '../../../../__tests__/test-utils';
import { VoiceButton, SpeakButton } from '../VoiceButton';

describe('VoiceButton', () => {
  const defaultProps = {
    isListening: false,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('기본 상태에서 버튼이 렌더링되어야 한다', () => {
    renderWithProviders(<VoiceButton {...defaultProps} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('isListening이 true일 때 빨간색 배경이 적용되어야 한다', () => {
    renderWithProviders(<VoiceButton {...defaultProps} isListening={true} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-500');
  });

  it('isSpeaking이 true일 때 스타일이 유지되어야 한다', () => {
    renderWithProviders(<VoiceButton {...defaultProps} isSpeaking={true} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('클릭 시 onToggle 콜백이 호출되어야 한다', () => {
    renderWithProviders(<VoiceButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('disabled 상태일 때 버튼이 비활성화되어야 한다', () => {
    renderWithProviders(<VoiceButton {...defaultProps} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('SpeakButton', () => {
  const defaultProps = {
    onClick: jest.fn(),
    isSpeaking: false,
  };

  afterEach(() => {
    cleanup();
  });

  it('기본 상태에서 버튼이 렌더링되어야 한다', () => {
    renderWithProviders(<SpeakButton {...defaultProps} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('isSpeaking이 true일 때 보라색 배경이 적용되어야 한다', () => {
    renderWithProviders(<SpeakButton {...defaultProps} isSpeaking={true} />);
    expect(screen.getByRole('button')).toHaveClass('bg-purple-500');
  });

  it('클릭 시 onClick 콜백이 호출되어야 한다', () => {
    renderWithProviders(<SpeakButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onClick).toHaveBeenCalled();
  });
});
