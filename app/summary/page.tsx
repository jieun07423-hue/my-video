'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useStore } from '@/lib/store-context';
import {
  Sun, TrendingUp, Users, ShoppingBag, QrCode, Star,
  ArrowRight, ChevronRight, Calendar, Clock, Bell
} from 'lucide-react';

interface SummaryData {
  todayVisits: number;
  todayRevenue: number;
  revenueChange: number;
  totalCustomers: number;
  totalMenus: number;
  soldOutMenus: number;
  birthdayCustomers: number;
  totalScans: number;
  activeCampaigns: number;
  recentOrders: number;
}

export default function SummaryPage() {
  const { currentStore } = useStore();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;
    setLoading(true);
    const storeId = currentStore.id;
    const fetchAll = async () => {
      try {
        const [custRes, menuRes, qrRes, adRes, summaryRes] = await Promise.all([
          fetch(`/api/customers?storeId=${storeId}`),
          fetch(`/api/menus?storeId=${storeId}`),
          fetch('/api/qrcodes'),
          fetch('/api/ad'),
          fetch(`/api/summary?storeId=${storeId}`),
        ]);

        const customers = custRes.ok ? (await custRes.json()).data || [] : [];
        const menus = menuRes.ok ? (await menuRes.json()).data || [] : [];
        const qrCodes = qrRes.ok ? (await qrRes.json()).data || [] : [];
        const campaigns = adRes.ok ? (await adRes.json()).items || [] : [];
        const summary = summaryRes.ok ? (await summaryRes.json()).data || {} : {};

        const todayStr = new Date().toDateString();
        const todayVisits = customers.filter((c: { lastVisit: string }) =>
          new Date(c.lastVisit).toDateString() === todayStr
        ).length;

        const isBirthdayThisWeek = (b: string | null): boolean => {
          if (!b) return false;
          const today = new Date();
          const bd = new Date(b);
          const diff = (bd.getMonth() - today.getMonth()) * 30 + (bd.getDate() - today.getDate());
          return diff >= 0 && diff <= 7;
        };

        setData({
          todayVisits,
          todayRevenue: summary.todayRevenue ?? 0,
          revenueChange: summary.revenueChange ?? 0,
          totalCustomers: customers.length,
          totalMenus: menus.length,
          soldOutMenus: menus.filter((m: { isAvailable: boolean }) => !m.isAvailable).length,
          birthdayCustomers: customers.filter((c: { birthday: string | null }) => isBirthdayThisWeek(c.birthday)).length,
          totalScans: qrCodes.reduce((s: number, q: { scanCount: number }) => s + (q.scanCount || 0), 0),
          activeCampaigns: campaigns.filter((c: { status: string }) => c.status === 'generating').length,
          recentOrders: summary.recentOrders ?? 0,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStore?.id]);

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()} (${['일', '월', '화', '수', '목', '금', '토'][today.getDay()]})`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-white shadow-md" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Calendar size={14} />
            <span>{dateStr}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            <Sun size={28} className="inline mr-2 text-amber-500" />
            오늘의 요약
          </h1>
          <p className="mt-1 text-gray-600">사업장 운영 현황을 한눈에 확인하세요.</p>
        </div>

        {data && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                icon={<TrendingUp size={20} className="text-green-600" />}
                label="오늘 매출"
                value={`₩${data.todayRevenue.toLocaleString()}`}
                sub={data.revenueChange >= 0 ? `+${data.revenueChange}%` : `${data.revenueChange}%`}
                subColor={data.revenueChange >= 0 ? 'text-green-600' : 'text-red-500'}
                bg="bg-green-50"
              />
              <SummaryCard
                icon={<Users size={20} className="text-indigo-600" />}
                label="오늘 방문"
                value={`${data.todayVisits}명`}
                sub={`전체 ${data.totalCustomers}명`}
                bg="bg-indigo-50"
              />
              <SummaryCard
                icon={<ShoppingBag size={20} className="text-amber-600" />}
                label="메뉴 현황"
                value={`${data.totalMenus - data.soldOutMenus}/${data.totalMenus}`}
                sub={data.soldOutMenus > 0 ? `품절 ${data.soldOutMenus}개` : '전체 판매 중'}
                subColor={data.soldOutMenus > 0 ? 'text-red-500' : 'text-green-600'}
                bg="bg-amber-50"
              />
              <SummaryCard
                icon={<QrCode size={20} className="text-rose-600" />}
                label="QR 스캔"
                value={`${data.totalScans}회`}
                sub={`광고 ${data.activeCampaigns}건 진행 중`}
                bg="bg-rose-50"
              />
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {data.birthdayCustomers > 0 && (
                <Link href="/crm"
                  className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50 p-4 transition-all hover:shadow-md">
                  <div>
                    <span className="text-sm font-medium text-rose-700">🎂 생일 고객</span>
                    <p className="text-xl font-bold text-rose-800">{data.birthdayCustomers}명</p>
                  </div>
                  <ArrowRight size={18} className="text-rose-400" />
                </Link>
              )}
              {data.soldOutMenus > 0 && (
                <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <div>
                    <span className="text-sm font-medium text-amber-700">⚠️ 품절 메뉴</span>
                    <p className="text-xl font-bold text-amber-800">{data.soldOutMenus}개</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div>
                  <span className="text-sm font-medium text-gray-700">📦 최근 주문</span>
                  <p className="text-xl font-bold text-gray-900">{data.recentOrders}건</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">빠른 메뉴</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickLink href="/crm" icon={<Star size={16} />} label="단골 관리" desc="고객 방문 기록" />
                <QuickLink href="/ad" icon={<TrendingUp size={16} />} label="광고 생성" desc="AI 광고 카피" />
                <QuickLink href="/ad/performance" icon={<QrCode size={16} />} label="성과 분석" desc="QR/광고 성과" />
                <QuickLink href="/dashboard" icon={<Clock size={16} />} label="전체 대시보드" desc="상세 통계" />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  icon, label, value, sub, subColor = 'text-gray-500', bg = 'bg-gray-50'
}: {
  icon: React.ReactNode; label: string; value: string; sub: string; subColor?: string; bg?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-100 ${bg} p-5 shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-medium text-gray-600">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className={`mt-1 text-xs ${subColor}`}>{sub}</p>
    </div>
  );
}

function QuickLink({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link href={href}
      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 transition-all hover:border-indigo-200 hover:shadow-sm group">
      <div className="text-indigo-600">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400" />
    </Link>
  );
}