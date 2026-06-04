'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Calendar,
  Hash,
  User,
  Store,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface SeoulPermitDetail {
  id: string;
  manageNo: string;
  bplcNm: string;
  bpNm: string | null;
  bizcnd: string | null;
  locplcd: string | null;
  rdnWhladdr: string | null;
  siteTel: string | null;
  apvPermYmd: string | null;
  apvCancelYmd: string | null;
  trdStateGbn: string | null;
  trdStateNm: string | null;
  dtlStateGbn: string | null;
  dtlStateNm: string | null;
  dcbyYmd: string | null;
  sitePostNo: string | null;
  xCoord: number | null;
  yCoord: number | null;
  serviceCode: string;
  createdAt: string;
  updatedAt: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">-</span>;

  const isClosed = status === '폐업';
  const isPending = status === '취소' || status === '반려';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
        isClosed
          ? 'bg-red-50 text-red-700'
          : isPending
          ? 'bg-amber-50 text-amber-700'
          : 'bg-green-50 text-green-700'
      }`}
    >
      {isClosed ? <XCircle size={14} /> : isPending ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
      {status}
    </span>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string | null; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-gray-200 hover:shadow-sm">
      <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-sm font-medium text-gray-900 break-words">{value || '-'}</p>
      </div>
    </div>
  );
}

export default function SeoulPermitDetailPage() {
  const params = useParams();
  const [item, setItem] = useState<SeoulPermitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!params.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/seoul-permits/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('해당 정보를 찾을 수 없습니다.');
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }
        const data = await res.json();
        setItem(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [params.id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/seoul-permits"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800"
        >
          <ArrowLeft size={16} />
          인허가 목록으로
        </Link>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="text-xl font-semibold text-red-700">{error}</h2>
            <Link
              href="/seoul-permits"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeft size={16} />
              목록으로 돌아가기
            </Link>
          </div>
        )}

        {item && (
          <>
            {/* 헤더 */}
            <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{item.bplcNm}</h1>
                    <StatusBadge status={item.trdStateNm} />
                  </div>
                  {item.bpNm && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">사업자:</span> {item.bpNm}
                    </p>
                  )}
                  {item.bizcnd && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">업종:</span> {item.bizcnd}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    관리번호: {item.manageNo} | 서비스: {item.serviceCode}
                  </p>
                </div>
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="mb-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">기본 정보</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="사업장명" value={item.bplcNm} icon={<Building2 size={18} />} />
                <InfoRow label="사업자명" value={item.bpNm} icon={<User size={18} />} />
                <InfoRow label="업종" value={item.bizcnd} icon={<Store size={18} />} />
                <InfoRow label="관리번호" value={item.manageNo} icon={<Hash size={18} />} />
              </div>
            </div>

            {/* 주소/연락처 */}
            <div className="mb-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">주소 및 연락처</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="도로명주소" value={item.rdnWhladdr} icon={<MapPin size={18} />} />
                <InfoRow label="소재지" value={item.locplcd} icon={<MapPin size={18} />} />
                <InfoRow label="전화번호" value={item.siteTel} icon={<Phone size={18} />} />
                <InfoRow label="우편번호" value={item.sitePostNo} icon={<Hash size={18} />} />
              </div>
            </div>

            {/* 인허가 정보 */}
            <div className="mb-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">인허가 정보</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="인허가일자" value={formatDate(item.apvPermYmd)} icon={<Calendar size={18} />} />
                <InfoRow label="인허가취소일자" value={formatDate(item.apvCancelYmd)} icon={<Calendar size={18} />} />
                <InfoRow label="영업상태" value={item.trdStateNm || item.trdStateGbn} icon={<CheckCircle size={18} />} />
                <InfoRow label="상세상태" value={item.dtlStateNm || item.dtlStateGbn} icon={<AlertCircle size={18} />} />
                <InfoRow label="폐업일자" value={formatDate(item.dcbyYmd)} icon={<XCircle size={18} />} />
              </div>
            </div>

            {/* 좌표 정보 */}
            {(item.xCoord || item.yCoord) && (
              <div className="mb-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">좌표 정보</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow label="X 좌표" value={item.xCoord?.toString() || null} icon={<MapPin size={18} />} />
                  <InfoRow label="Y 좌표" value={item.yCoord?.toString() || null} icon={<MapPin size={18} />} />
                </div>
              </div>
            )}

            {/* 메타 정보 */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="grid gap-4 text-xs text-gray-500 sm:grid-cols-2">
                <div>등록일: {new Date(item.createdAt).toLocaleString('ko-KR')}</div>
                <div>수정일: {new Date(item.updatedAt).toLocaleString('ko-KR')}</div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
