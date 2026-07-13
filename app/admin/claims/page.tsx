'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/app/components/Navbar';

interface BusinessRef {
  id: string;
  name: string;
  bizesId: string;
  roadNameAddress: string | null;
  businessName: string | null;
}

interface ClaimRequest {
  id: string;
  businessId: string;
  requesterName: string;
  requesterContact: string;
  requesterNote: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  business: BusinessRef;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '거절',
  cancelled: '취소',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const TABS = [
  { key: '', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '거절' },
];

export default function ClaimsAdminPage() {
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal state
  const [modalClaim, setModalClaim] = useState<ClaimRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab) params.set('status', activeTab);
      if (searchTerm) params.set('search', searchTerm);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/admin/claims?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setClaims(json.data.items);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
      } else {
        setError(json.error);
      }
    } catch {
      setError('데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, page]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClaims();
  };

  const handleApprove = async (claim: ClaimRequest) => {
    setModalClaim(claim);
    setAdminNote('');
  };

  const handleReject = async (claim: ClaimRequest) => {
    setModalClaim(claim);
    setAdminNote('');
  };

  const confirmAction = async (action: 'approve' | 'reject') => {
    if (!modalClaim) return;
    if (action === 'reject' && !adminNote.trim()) {
      alert('거절 사유를 입력해주세요');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/claims/${modalClaim.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          adminNote: adminNote.trim() || undefined,
          reviewedBy: 'admin',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setModalClaim(null);
        setAdminNote('');
        fetchClaims();
      } else {
        alert(json.error);
      }
    } catch {
      alert('처리 중 오류가 발생했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">승인 요청 관리</h1>
        <p className="text-gray-600">
          사업체 소유권 승인 요청을 검토하고 처리합니다. 총 {total}건
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="요청자명, 연락처 검색..."
          className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          검색
        </button>
      </form>

      {/* Loading */}
      {loading && claims.length === 0 && (
        <div className="py-12 text-center text-gray-500">데이터 로딩 중...</div>
      )}

      {/* Empty */}
      {!loading && claims.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">
          {activeTab ? '해당 상태의 승인 요청이 없습니다' : '승인 요청이 없습니다'}
        </div>
      )}

      {/* Claim List */}
      <div className="space-y-3">
        {claims.map((claim) => (
          <div
            key={claim.id}
            className={`rounded-lg border p-4 ${
              claim.status === 'pending' ? 'border-yellow-200 bg-white' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{claim.requesterName}</h3>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[claim.status]}`}>
                    {STATUS_LABEL[claim.status]}
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-500">{claim.requesterContact}</p>

                <div className="mt-2 rounded bg-gray-50 p-2">
                  <p className="text-sm font-medium text-gray-700">
                    대상 업체: {claim.business.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    사업자번호: {claim.business.bizesId}
                    {claim.business.roadNameAddress && ` | ${claim.business.roadNameAddress}`}
                  </p>
                </div>

                {claim.requesterNote && (
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">요청 사유:</span> {claim.requesterNote}
                  </p>
                )}

                {claim.adminNote && (
                  <p className="mt-1 text-sm text-blue-600">
                    <span className="font-medium">관리자 메모:</span> {claim.adminNote}
                  </p>
                )}

                <div className="mt-1 flex gap-4 text-xs text-gray-400">
                  <span>요청: {new Date(claim.createdAt).toLocaleString('ko-KR')}</span>
                  {claim.reviewedAt && (
                    <span>처리: {new Date(claim.reviewedAt).toLocaleString('ko-KR')}</span>
                  )}
                </div>
              </div>

              {claim.status === 'pending' && (
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => handleApprove(claim)}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(claim)}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    거절
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {total}건 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, total)}건
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              이전
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {modalClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-bold text-gray-900">
              요청 처리
            </h2>
            <p className="mb-1 text-sm text-gray-600">
              요청자: {modalClaim.requesterName}
            </p>
            <p className="mb-4 text-sm text-gray-600">
              업체: {modalClaim.business.name}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                관리자 메모
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={adminNote ? '' : '처리에 대한 메모를 입력하세요 (거절 시 필수)'}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalClaim(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => confirmAction('approve')}
                disabled={actionLoading}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? '처리 중...' : '승인'}
              </button>
              <button
                onClick={() => confirmAction('reject')}
                disabled={actionLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? '처리 중...' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
