import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { GenieChat, ChatMessage } from '../GenieChat';

describe('GenieChat', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: '안녕하세요!',
      timestamp: new Date('2024-01-01T10:00:00'),
    },
    {
      id: '2',
      role: 'assistant',
      content: '안녕하세요! 무엇을 도와드릴까요?',
      timestamp: new Date('2024-01-01T10:01:00'),
    },
  ];

  beforeEach(() => {
    cleanup();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('메시지가 없을 때 환영 화면이 렌더링되어야 한다', async () => {
    render(<GenieChat messages={[]} />);
    
    await waitFor(() => {
      expect(screen.getByText('안녕하세요! 🧞')).toBeInTheDocument();
      expect(screen.getByText(/무엇을 도와드릴까요\?/)).toBeInTheDocument();
    });
  });

  it('메시지가 있을 때 채팅 버블들이 렌더링되어야 한다', async () => {
    render(<GenieChat messages={mockMessages} />);
    
    await waitFor(() => {
      expect(screen.getByText('안녕하세요!')).toBeInTheDocument();
      expect(screen.getByText('안녕하세요! 무엇을 도와드릴까요?')).toBeInTheDocument();
    });
  });

  it('사용자 메시지는 우측에, 어시스턴트 메시지는 좌측에 배치되어야 한다', async () => {
    const { container } = render(<GenieChat messages={mockMessages} />);
    
    await waitFor(() => {
      const bubbles = container.querySelectorAll('.flex.gap-3');
      expect(bubbles[0]).toHaveClass('flex-row-reverse');
      expect(bubbles[1]).toHaveClass('flex-row');
    });
  });

  it('어시스턴트 메시지의 복사 버튼 클릭 시 clipboard.writeText가 호출되어야 한다', async () => {
    render(<GenieChat messages={mockMessages} />);
    
    await waitFor(() => {
      const copyButtons = screen.getAllByTitle('복사');
      fireEvent.click(copyButtons[0]);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('안녕하세요! 무엇을 도와드릴까요?');
  });

  it('어시스턴트 메시지의 말하기 버튼 클릭 시 onSpeak 핸들러가 호출되어야 한다', async () => {
    const onSpeak = jest.fn();
    render(<GenieChat messages={mockMessages} onSpeak={onSpeak} />);
    
    await waitFor(() => {
      const assistantBubble = screen.getByText('안녕하세요! 무엇을 도와드릴까요?').closest('div');
      const speakButton = assistantBubble?.querySelector('button:not([title="복사"])');
      if (speakButton) fireEvent.click(speakButton);
    });

    expect(onSpeak).toHaveBeenCalledWith('안녕하세요! 무엇을 도와드릴까요?');
  });

  it('onRegenerate가 제공되면 다시생성 버튼이 렌더링되고 클릭 시 핸들러가 호출되어야 한다', async () => {
    const onRegenerate = jest.fn();
    render(<GenieChat messages={mockMessages} onRegenerate={onRegenerate} />);
    
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: '다시생성' });
      fireEvent.click(btn);
    });

    expect(onRegenerate).toHaveBeenCalled();
  });

  it('onClear가 제공되면 초기화 버튼이 렌더링되고 클릭 시 핸들러가 호출되어야 한다', async () => {
    const onClear = jest.fn();
    render(<GenieChat messages={mockMessages} onClear={onClear} />);
    
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: '초기화' });
      fireEvent.click(btn);
    });

    expect(onClear).toHaveBeenCalled();
  });
});
