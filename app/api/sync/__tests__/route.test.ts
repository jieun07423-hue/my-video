import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

describe('/api/sync API Routes', () => {
  let GET: any;
  let POST: any;
  let syncStateRepository: any;
  let addSyncJob: any;

  beforeEach(async () => {
    jest.resetModules();
    
    // Mock redis first
    jest.mock('@/lib/redis', () => ({
      __esModule: true,
      default: {
        on: jest.fn(),
        quit: jest.fn(),
      },
    }));

    // Mock repositories and queues
    jest.mock('@/lib/repositories/sync-state.repository', () => ({
      syncStateRepository: {
        getSyncState: jest.fn(),
        setRunning: jest.fn(),
        setSuccess: jest.fn(),
        setFailed: jest.fn(),
      },
    }));

    jest.mock('@/lib/queues/sync.queue', () => ({
      addSyncJob: jest.fn(),
      syncQueue: {
        add: jest.fn(),
      },
      syncQueueName: 'sync-queue',
    }));

    // Now import the route and mocks
    const route = await import('../route');
    GET = route.GET;
    POST = route.POST;
    
    const repo = await import('@/lib/repositories/sync-state.repository');
    syncStateRepository = repo.syncStateRepository;
    
    const queue = await import('@/lib/queues/sync.queue');
    addSyncJob = queue.addSyncJob;
  });

  describe('GET', () => {
    it('동기화 상태와 락 상태를 반환해야 한다', async () => {
      syncStateRepository.getSyncState.mockResolvedValue({
        lastSyncAt: new Date(),
        status: 'success',
      });
      
      const req = new NextRequest('http://localhost/api/sync');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('isLocked');
      expect(data).toHaveProperty('syncState');
    });

    it('상태가 running인 경우 isLocked가 true여야 한다', async () => {
      syncStateRepository.getSyncState.mockResolvedValue({
        lastSyncAt: new Date(),
        status: 'running',
      });
      
      const req = new NextRequest('http://localhost/api/sync');
      const res = await GET(req);
      const data = await res.json();

      expect(data.isLocked).toBe(true);
    });
  });

  describe('POST', () => {
    const validBody = {
      serviceKey: 'test-key',
      pageSize: 10,
      maxPages: 10,
      force: false,
    };

    it('정상적으로 동기화를 요청하고 202 Accepted를 반환해야 한다', async () => {
      addSyncJob.mockResolvedValue({ id: 'job-123' });

      const req = {
        json: async () => validBody,
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(202);
      expect(data.success).toBe(true);
      expect(addSyncJob).toHaveBeenCalledWith({
        serviceKey: 'test-key',
        pageSize: 10,
        maxPages: 10,
        force: false,
      });
    });

    it('serviceKey가 없는 경우 400 에러를 반환해야 한다', async () => {
      const req = {
        json: async () => ({ pageSize: 10 }),
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('serviceKey가 필요합니다');
    });

    it('큐 추가 중 서버 오류 발생 시 500 에러를 반환해야 한다', async () => {
      addSyncJob.mockRejectedValue(new Error('Redis connection failed'));

      const req = {
        json: async () => validBody,
      } as any;
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('서버 오류가 발생했습니다');
      expect(data.details).toBe('Redis connection failed');
    });
  });
});
