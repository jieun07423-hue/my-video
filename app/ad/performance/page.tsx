'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { QrCode, ExternalLink, TrendingUp, Eye, MousePointerClick, ChevronRight, BarChart3 } from 'lucide-react';

interface QrCodeStat {
  id: string;
  type: string;
  label: string | null;
  targetUrl: string;
  scanCount: number;
  createdAt: string;
}

interface CampaignStat {
  id: string;
  industry: string;
  location: string;
  status: string;
  totalCopies: number;
  selectedCount: number;
  createdAt: string;
}

export default function AdPerformancePage() {
  const [qrCodes, setQrCodes] = useState<QrCodeStat[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/qrcodes').then(r => r.json()),
      fetch('/api/ad').then(r => r.json()),
    ]).then(([qrRes, adRes]) => {
      if (qrRes.success) setQrCodes(qrRes.data);
      if (adRes.items) setCampaigns(adRes.items);
    }).finally(() => setLoading(false));
  }, []);

  const totalScans = qrCodes.reduce((sum, q) => sum + q.scanCount, 0);
  const totalCampaigns = campaigns.length;
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">광고 성과</h1>
          <p className="mt-1 text-gray-600">QR 코드 스캔 및 캠페인 성과 분석</p>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-2xl bg-white p-6 shadow-md">
                <div className="h-4 w-20 rounded bg-gray-200 mb-3" />
                <div className="h-8 w-16 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-xl bg-indigo-50 p-2.5">
                    <QrCode size={20} className="text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">QR 코드</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{qrCodes.length}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-xl bg-green-50 p-2.5">
                    <Eye size={20} className="text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">총 스캔 수</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalScans.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-xl bg-amber-50 p-2.5">
                    <TrendingUp size={20} className="text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">완료 캠페인</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{completedCampaigns}/{totalCampaigns}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <QrCode size={18} className="text-indigo-600" />
                  QR 코드 목록
                </h2>
                {qrCodes.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">생성된 QR 코드가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {qrCodes.map(qr => (
                      <div key={qr.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{qr.label || '라벨 없음'}</p>
                          <p className="text-xs text-gray-500">{qr.type} · {qr.scanCount}회 스캔</p>
                        </div>
                        <Link
                          href={`/qr/${qr.id}`}
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 shadow-sm border border-gray-200 hover:bg-indigo-50 transition-colors"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <BarChart3 size={18} className="text-indigo-600" />
                  캠페인 목록
                </h2>
                {campaigns.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">생성된 캠페인이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {campaigns.slice(0, 10).map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.industry} · {c.location}</p>
                          <p className="text-xs text-gray-500">
                            {c.status === 'completed' ? '✅ 완료' : c.status === 'generating' ? '🔄 생성중' : '⏳ 대기'}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}