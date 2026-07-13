import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SearchClaimRequestsOptions, ClaimRequestStatus } from '@/lib/repositories/claim-request.repository';

interface ClaimRequest {
  id: string;
  businessId: string;
  requesterName: string;
  requesterContact: string;
  requesterNote: string | null;
  status: ClaimRequestStatus;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  business: {
    id: string;
    name: string;
    bizesId: string;
    roadNameAddress: string | null;
    businessName: string | null;
  };
}

interface ClaimRequestSearchResult {
  items: ClaimRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ClaimStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

async function fetchClaimRequests(options: SearchClaimRequestsOptions): Promise<ClaimRequestSearchResult> {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.status) params.set('status', options.status);
  if (options.search) params.set('search', options.search);

  const res = await fetch(`/api/admin/claims?${params.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '조회 실패');
  return json.data;
}

export function useClaimRequests(options: SearchClaimRequestsOptions = {}) {
  return useQuery({
    queryKey: ['claim-requests', options],
    queryFn: () => fetchClaimRequests(options),
    staleTime: 30 * 1000,
  });
}

export function useClaimRequestById(id: string) {
  return useQuery({
    queryKey: ['claim-request', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/claims/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '조회 실패');
      return json.data as ClaimRequest;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useClaimRequestStats() {
  return useQuery({
    queryKey: ['claim-request-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/claims?limit=1');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '조회 실패');
      return json.data as ClaimRequestSearchResult;
    },
    select: (data) => ({
      total: data.total,
      pending: data.items.filter((i: ClaimRequest) => i.status === 'pending').length,
      approved: data.items.filter((i: ClaimRequest) => i.status === 'approved').length,
      rejected: data.items.filter((i: ClaimRequest) => i.status === 'rejected').length,
    }),
    staleTime: 30 * 1000,
  });
}

export function useCreateClaimRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      businessId: string;
      requesterName: string;
      requesterContact: string;
      requesterNote?: string;
    }) => {
      const res = await fetch('/api/admin/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '생성 실패');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-requests'] });
      queryClient.invalidateQueries({ queryKey: ['claim-request-stats'] });
    },
  });
}

export function useUpdateClaimRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      adminNote,
      reviewedBy,
    }: {
      id: string;
      action: 'approve' | 'reject';
      adminNote?: string;
      reviewedBy: string;
    }) => {
      const res = await fetch(`/api/admin/claims/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNote, reviewedBy }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '처리 실패');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-requests'] });
      queryClient.invalidateQueries({ queryKey: ['claim-request-stats'] });
    },
  });
}
