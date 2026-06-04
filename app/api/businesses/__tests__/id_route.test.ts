import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET, PUT, DELETE } from '../[id]/route';
import { NextRequest } from 'next/server';
import { businessRepository } from '@/lib/repositories/business.repository';


jest.mock('@/lib/repositories/business.repository', () => ({
  businessRepository: {
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Business ID API Routes', () => {
  const mockId = 'test-id-123';
  const mockBusiness = {
    id: mockId,
    name: '테스트 소상공인',
    bizesId: 'BIZ123',
    status: 'active',
    recordStatus: 'synced',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/businesses/[id]', () => {
    it('존재하는 ID인 경우 소상공인 정보를 반환해야 한다', async () => {
      jest.spyOn(businessRepository, 'getById').mockResolvedValue(mockBusiness);

      const req = {
        nextUrl: new URL(`http://localhost/api/businesses/${mockId}`),
      } as any;
      const res = await GET(req, { params: { id: mockId } });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockBusiness);
      expect(businessRepository.getById).toHaveBeenCalledWith(mockId);
    });

    it('존재하지 않는 ID인 경우 404 에러를 반환해야 한다', async () => {
      jest.spyOn(businessRepository, 'getById').mockResolvedValue(null);

      const req = {
        nextUrl: new URL(`http://localhost/api/businesses/${mockId}`),
      } as any;
      const res = await GET(req, { params: { id: mockId } });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('존재하지 않는 소상공인입니다');
    });

    it('서버 오류 발생 시 500 에러를 반환해야 한다', async () => {
      jest.spyOn(businessRepository, 'getById').mockRejectedValue(new Error('DB Error'));

      const req = {
        nextUrl: new URL(`http://localhost/api/businesses/${mockId}`),
      } as any;
      const res = await GET(req, { params: { id: mockId } });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('DB Error');
    });
  });

  describe('PUT /api/businesses/[id]', () => {
    const updateData = { name: '수정된 이름' };

    it('정상적인 요청인 경우 수정된 정보를 반환해야 한다', async () => {
      const updatedBusiness = { ...mockBusiness, ...updateData };
      jest.spyOn(businessRepository, 'update').mockResolvedValue(updatedBusiness);

      const req = {
        nextUrl: new URL(`http://localhost/api/businesses/${mockId}`),
        json: async () => updateData,
      } as any;
      const res = await PUT(req, { params: { id: mockId } });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(updatedBusiness);
      expect(businessRepository.update).toHaveBeenCalledWith(mockId, updateData);
    });

    it('존재하지 않는 ID인 경우 400 에러를 반환해야 한다', async () => {
      jest.spyOn(businessRepository, 'update').mockRejectedValue(new Error('Record not found'));

      const req = {
        nextUrl: new URL(`http://localhost/api/businesses/${mockId}`),
        json: async () => updateData,
      } as any;
      const res = await PUT(req, { params: { id: mockId } });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Record not found');
    });

    it('잘못된 JSON 요청인 경우 400 에러를 반환해야 한다', async () => {
      const req = {
        nextUrl: new URL(`http://localhost/api/businesses/${mockId}`),
        json: async () => { throw new Error('Invalid JSON'); },
      } as any;
      const res = await PUT(req, { params: { id: mockId } });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON');
    });
  });

  describe('DELETE /api/businesses/[id]', () => {
    it('정상적인 요청인 경우 삭제 성공 메시지를 반환해야 한다', async () => {
      jest.spyOn(businessRepository, 'delete').mockResolvedValue({ id: mockId });

      const req = {
        nextUrl: new URL(`http://localhost/api/businesses/${mockId}`),
      } as any;
      const res = await DELETE(req, { params: { id: mockId } });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('삭제 성공');
      expect(data.id).toBe(mockId);
      expect(businessRepository.delete).toHaveBeenCalledWith(mockId);
    });

    it('존재하지 않는 ID인 경우 400 에러를 반환해야 한다', async () => {
      jest.spyOn(businessRepository, 'delete').mockRejectedValue(new Error('Record not found'));

      const req = {
        nextUrl: new URL(`http://localhost/api/businesses/${mockId}`),
      } as any;
      const res = await DELETE(req, { params: { id: mockId } });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Record not found');
    });
  });
});
