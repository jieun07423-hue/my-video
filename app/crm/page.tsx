'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Users, Phone, Calendar, Clock, Star, TrendingUp, Search, Plus, UserPlus } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  storeId: string;
  visitCount: number;
  totalSpent: number;
  lastVisit: string;
  notes: string;
  birthday: string | null;
  createdAt: string;
}

const STORE_ID = 'store_1';

function isBirthdayThisWeek(birthday: string | null): boolean {
  if (!birthday) return false;
  const today = new Date();
  const bd = new Date(birthday);
  const diff = (bd.getMonth() - today.getMonth()) * 30 + (bd.getDate() - today.getDate());
  return diff >= 0 && diff <= 7;
}

export default function CrmPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', notes: '', birthday: '' });

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/customers?storeId=${STORE_ID}`);
      const json = await res.json();
      if (json.success) setCustomers(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.phone) return;
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: STORE_ID, ...form, birthday: form.birthday || null }),
    });
    setForm({ name: '', phone: '', notes: '', birthday: '' });
    setShowForm(false);
    fetchCustomers();
  };

  const totalVisits = customers.reduce((s, c) => s + c.visitCount, 0);
  const vipCount = customers.filter(c => c.visitCount >= 10).length;
  const birthdayThisWeek = customers.filter(c => isBirthdayThisWeek(c.birthday)).length;
  const filtered = customers.filter(c =>
    c.name.includes(search) || c.phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">단골 관리</h1>
            <p className="mt-1 text-gray-600">고객 방문 기록 및 관리</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <UserPlus size={16} /> 고객 등록
          </button>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Users size={16} /> 전체 고객</div>
            <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><TrendingUp size={16} /> 총 방문</div>
            <p className="text-2xl font-bold text-gray-900">{totalVisits}회</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Star size={16} /> VIP (10회+)
            </div>
            <p className="text-2xl font-bold text-amber-600">{vipCount}명</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Calendar size={16} /> 생일 예정</div>
            <p className="text-2xl font-bold text-rose-600">{birthdayThisWeek}명</p>
          </div>
        </div>

        {showForm && (
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">새 고객 등록</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="이름 *" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="연락처 *" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <input value={form.birthday} onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))}
                placeholder="생년월일 (선택)" type="date" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <div className="flex gap-2">
                <button onClick={handleAdd}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">등록</button>
                <button onClick={() => setShowForm(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="고객 이름 또는 연락처 검색..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 shadow-sm" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-md" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-md">
            <Users size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">등록된 고객이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(customer => (
              <div key={customer.id}
                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-white text-lg
                    ${customer.visitCount >= 10 ? 'bg-amber-500' : customer.visitCount >= 5 ? 'bg-indigo-500' : 'bg-gray-400'}`}>
                    {customer.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                      {customer.visitCount >= 10 && <Star size={14} className="text-amber-500" />}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Phone size={12} /> {customer.phone}</span>
                      <span className="flex items-center gap-1"><TrendingUp size={12} /> {customer.visitCount}회 방문</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {new Date(customer.lastVisit).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {customer.notes && <p className="mt-1 text-xs text-gray-400">{customer.notes}</p>}
                  </div>
                </div>
                {isBirthdayThisWeek(customer.birthday) && (
                  <div className="shrink-0 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600">
                    🎂 생일
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}