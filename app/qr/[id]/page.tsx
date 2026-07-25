'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { QrCode, ExternalLink, Loader2, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';

interface QrCodeData {
  id: string;
  storeId: string;
  type: string;
  targetUrl: string;
  label: string | null;
  scanCount: number;
  createdAt: string;
}

export default function QrCodeLandingPage({ params }: { params: { id: string } }) {
  const [qrData, setQrData] = useState<QrCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const track = async () => {
      try {
        const res = await fetch(`/api/qrcodes/${params.id}/scan`, { method: 'POST' });
        if (!res.ok) throw new Error('Scan tracking failed');
        const json = await res.json();
        setQrData(prev => prev ? { ...prev, scanCount: json.data.scanCount } : null);
        setScanned(true);
      } catch {
      }
    };
    track();
  }, [params.id]);

  useEffect(() => {
    const fetchQr = async () => {
      try {
        const allRes = await fetch('/api/qrcodes');
        const json = await allRes.json();
        const found = json.data.find((q: QrCodeData) => q.id === params.id);
        if (found) {
          setQrData(found);
        } else {
          setError('QR 코드를 찾을 수 없습니다.');
        }
      } catch {
        setError('정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchQr();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">QR 코드를 찾을 수 없습니다</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          {scanned && (
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
              <CheckCircle size={14} />
              스캔 완료
            </div>
          )}

          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50">
            <QrCode size={40} className="text-indigo-600" />
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {qrData?.label || '스토어 페이지'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            총 <span className="font-semibold text-indigo-600">{qrData?.scanCount || 0}</span>회 스캔됨
          </p>

          <Link
            href={qrData?.targetUrl || '/'}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-700"
          >
            <ExternalLink size={16} />
            페이지 방문하기
          </Link>

          {qrData && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <Link
                href="/ad/performance"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <BarChart3 size={14} />
                광고 성과 보기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}