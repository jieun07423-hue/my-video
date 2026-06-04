import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ManualSyncCard } from '../ManualSyncCard';
import { windowUtils } from '../../../lib/utils/window';


describe('ManualSyncCard', () => {
  beforeEach(() => {
    cleanup();
    
    jest.spyOn(windowUtils, 'reloadPage').mockImplementation(() => {});

    global.fetch = jest.fn();
    global.alert = jest.fn();
    jest.clearAllMocks();
  })





;

  it('동기화 시작 버튼이 렌더링되어야 한다', () => {
    render(<ManualSyncCard />);
    expect(screen.getByRole('button', { name: '동기화 시작' })).toBeInTheDocument();
  });

  it('버튼 클릭 시 /api/sync로 POST 요청을 보내야 한다', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true }),
    });

    render(<ManualSyncCard />);
    fireEvent.click(screen.getByRole('button', { name: '동기화 시작' }));

    expect(global.fetch).toHaveBeenCalledWith('/api/sync', {
      method: 'POST',
    });
  });

  it('동기화 성공 시 알림을 띄우고 페이지를 새로고침해야 한다', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true }),
    });

    render(<ManualSyncCard />);
    fireEvent.click(screen.getByRole('button', { name: '동기화 시작' }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('동기화가 시작되었습니다.');
      expect(windowUtils.reloadPage).toHaveBeenCalled();
    });
  });

  it('동기화 실패 시 실패 메시지를 알림으로 띄워야 한다', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: false, message: 'API 서버 오류' }),
    });

    render(<ManualSyncCard />);
    fireEvent.click(screen.getByRole('button', { name: '동기화 시작' }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('동기화 실패: API 서버 오류');
    });
  });
});
