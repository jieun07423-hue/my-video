'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Check, ChevronLeft, ChevronRight, QrCode, Store, Utensils, Building2, Loader2 } from 'lucide-react';

interface Business {
  id: string;
  bizesId: string;
  name: string;
  roadNameAddress: string | null;
  lotNumberAddress: string | null;
  businessName: string | null;
  status: string;
  recordStatus: string;
  createdAt: string;
}

interface MenuItem {
  name: string;
  price: string;
  category: string;
}

interface StoreForm {
  name: string;
  slug: string;
  ownerId: string;
  businessType: string;
  phoneNumber: string;
  address: string;
}

const STEPS = [
  { id: 'select', label: '업소 선택', icon: Building2 },
  { id: 'configure', label: '스토어 설정', icon: Store },
  { id: 'menu', label: '메뉴 등록', icon: Utensils },
  { id: 'complete', label: '완료', icon: QrCode },
];

export default function StoreOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [storeForm, setStoreForm] = useState<StoreForm>({
    name: '', slug: '', ownerId: 'default', businessType: '', phoneNumber: '', address: '',
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newMenuItem, setNewMenuItem] = useState<MenuItem>({ name: '', price: '', category: '' });
  const [submitting, setSubmitting] = useState(false);
  const [createdStore, setCreatedStore] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/businesses?recordStatus=new&limit=50')
      .then(res => {
        if (!res.ok) throw new Error('목록을 불러오는데 실패했습니다.');
        return res.json();
      })
      .then(data => setBusinesses(data.items || []))
      .catch(err => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectBusiness = (b: Business) => {
    setSelectedBusiness(b);
    setStoreForm({
      name: b.name,
      slug: b.name.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase().slice(0, 30) || `store-${b.bizesId}`,
      ownerId: 'default',
      businessType: b.businessName || '',
      phoneNumber: '',
      address: b.roadNameAddress || b.lotNumberAddress || '',
    });
  };

  const handleAddMenuItem = () => {
    if (!newMenuItem.name || !newMenuItem.price) return;
    setMenuItems(prev => [...prev, { ...newMenuItem }]);
    setNewMenuItem({ name: '', price: '', category: '' });
  };

  const handleRemoveMenuItem = (index: number) => {
    setMenuItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '스토어 생성에 실패했습니다.');
      setCreatedStore(json.data);
      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!selectedBusiness;
      case 1: return storeForm.name.trim().length > 0 && storeForm.slug.trim().length > 0;
      case 2: return true;
      default: return true;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">스토어 온보딩</h1>
          <p className="mt-1 text-sm text-gray-500">새로운 스토어를 설정하고 메뉴를 등록하세요.</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = currentStep >= idx;
              const isCurrent = currentStep === idx;
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                        isActive
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-gray-300 bg-white text-gray-400'
                      } ${isCurrent ? 'ring-2 ring-indigo-200 ring-offset-2' : ''}`}
                    >
                      {isActive && currentStep > idx ? (
                        <Check size={16} />
                      ) : (
                        <StepIcon size={16} />
                      )}
                    </div>
                    <span className={`mt-1.5 text-xs font-medium ${
                      isActive ? 'text-indigo-600' : 'text-gray-400'
                    }`}>{step.label}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`mx-2 mt-[-1.5rem] h-0.5 w-12 sm:w-20 ${
                      currentStep > idx ? 'bg-indigo-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 0: 업소 선택 */}
        {currentStep === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">온보딩할 업소를 선택하세요</h2>
            {fetchError ? (
              <p className="text-sm text-red-500">{fetchError}</p>
            ) : businesses.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">신규 등록된 업소가 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">데이터 동기화 후 다시 시도해주세요.</p>
              </div>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {businesses.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBusiness(b)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedBusiness?.id === b.id
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{b.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {b.roadNameAddress || b.lotNumberAddress || '주소 없음'}
                        </p>
                      </div>
                      {b.businessName && (
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {b.businessName}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: 스토어 설정 */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">스토어 정보 입력</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">스토어 이름 *</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={e => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="스토어 이름"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">슬러그 *</label>
                <input
                  type="text"
                  value={storeForm.slug}
                  onChange={e => setStoreForm(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="store-name"
                />
                <p className="mt-1 text-xs text-gray-400">URL에 사용될 고유 식별자입니다.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">업종</label>
                <input
                  type="text"
                  value={storeForm.businessType}
                  onChange={e => setStoreForm(prev => ({ ...prev, businessType: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="예: 한식, 카페, 편의점"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">전화번호</label>
                  <input
                    type="text"
                    value={storeForm.phoneNumber}
                    onChange={e => setStoreForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="02-0000-0000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">주소</label>
                  <input
                    type="text"
                    value={storeForm.address}
                    onChange={e => setStoreForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="서울시 강남구 ..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 메뉴 등록 */}
        {currentStep === 2 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">메뉴 등록 (선택사항)</h2>
            
            {/* Add menu form */}
            <div className="mb-6 flex flex-wrap items-end gap-2 rounded-xl bg-gray-50 p-4">
              <div className="flex-1 min-w-[120px]">
                <label className="mb-1 block text-xs font-medium text-gray-600">메뉴명</label>
                <input
                  type="text"
                  value={newMenuItem.name}
                  onChange={e => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="아메리카노"
                />
              </div>
              <div className="w-24">
                <label className="mb-1 block text-xs font-medium text-gray-600">가격</label>
                <input
                  type="text"
                  value={newMenuItem.price}
                  onChange={e => setNewMenuItem(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="3000"
                />
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="mb-1 block text-xs font-medium text-gray-600">카테고리</label>
                <input
                  type="text"
                  value={newMenuItem.category}
                  onChange={e => setNewMenuItem(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="커피"
                />
              </div>
              <button
                onClick={handleAddMenuItem}
                disabled={!newMenuItem.name || !newMenuItem.price}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                추가
              </button>
            </div>

            {/* Menu list */}
            {menuItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">등록된 메뉴가 없습니다. 저장 후 메뉴 관리 페이지에서 추가할 수 있습니다.</p>
            ) : (
              <div className="space-y-2">
                {menuItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.category && `${item.category} · `}{Number(item.price).toLocaleString()}원</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMenuItem(idx)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: 완료 */}
        {currentStep === 3 && createdStore && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">스토어 생성 완료!</h2>
            <p className="text-gray-500 mb-6">
              <strong className="text-gray-900">{createdStore.name}</strong> 스토어가 성공적으로 생성되었습니다.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href={`/menu/${createdStore.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700"
              >
                <Utensils size={16} />
                메뉴 관리하기
              </a>
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                홈으로 가기
              </a>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Navigation */}
        {currentStep < 3 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} /> 이전
            </button>

            {currentStep < 2 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                다음 <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? '생성 중...' : '스토어 생성'}
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
