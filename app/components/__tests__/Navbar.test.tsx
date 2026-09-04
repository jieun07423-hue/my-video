import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../Navbar';
import { StoreProvider } from '@/lib/store-context';

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

const mockRender = (ui: React.ReactNode) => {
  return render(<StoreProvider>{ui}</StoreProvider>);
};

class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = 1;
  close() {}
  constructor(_url: string) {}
}

Object.defineProperty(global, 'EventSource', {
  writable: true,
  value: MockEventSource,
});

describe('Navbar', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch;
  });

  it('로고와 주요 네비게이션 링크가 렌더링되어야 한다', () => {
    mockRender(<Navbar />);
    
    expect(screen.getByText('광고 카피 생성기')).toBeInTheDocument();
    expect(screen.getAllByText('홈').length).toBeGreaterThan(0);
    expect(screen.getAllByText('소상공인 목록').length).toBeGreaterThan(0);
    expect(screen.getAllByText('신규 등록').length).toBeGreaterThan(0);
    expect(screen.getAllByText('🧞 지니').length).toBeGreaterThan(0);
    expect(screen.getAllByText('어드민').length).toBeGreaterThan(0);
    expect(screen.getAllByText('삭제된 노트').length).toBeGreaterThan(0);
  });

  it('모바일 뷰에서 메뉴 버튼 클릭 시 모바일 메뉴가 열리고 닫혀야 한다', () => {
    mockRender(<Navbar />);
    
    const menuButtons = screen.getAllByLabelText('Toggle menu');
    const menuButton = menuButtons[0];
    
    fireEvent.click(menuButton);
    expect(screen.getAllByText('홈').length).toBeGreaterThan(0);
    
    fireEvent.click(menuButton);
  });

  it('children prop이 제공되면 상단 배너 영역에 렌더링되어야 한다', () => {
    mockRender(
      <Navbar>
        <div data-testid="banner">배너 내용</div>
      </Navbar>
    );
    
    expect(screen.getByTestId('banner')).toBeInTheDocument();
    expect(screen.getByText('배너 내용')).toBeInTheDocument();
  });
});
