'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Store, Check } from 'lucide-react';
import { useStore } from '@/lib/store-context';

/**
 * 활성 스토어를 선택하는 전역 드롭다운.
 * StoreProvider가 로드한 스토어 목록 중 하나를 현재 스토어로 설정한다.
 */
export default function StoreSelect() {
  const { stores, currentStore, loading, selectStore } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (loading) {
    return (
      <span
        className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm text-gray-300"
        style={{ background: 'rgba(74, 144, 217, 0.1)' }}
      >
        <Store className="h-4 w-4 mr-1.5" /> 로딩…
      </span>
    );
  }

  if (stores.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        style={{ background: 'rgba(74, 144, 217, 0.1)', color: '#e0e0f0' }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Store className="h-4 w-4" />
        <span className="max-w-[10rem] truncate">{currentStore?.name ?? '스토어 선택'}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl border shadow-xl z-50 overflow-hidden"
          style={{ background: '#1b1b36', borderColor: '#2d2d4a' }}
          role="listbox"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#a0a0b0' }}>
            스토어 선택
          </div>
          {stores.map((store) => {
            const selected = store.id === currentStore?.id;
            return (
              <button
                key={store.id}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  selectStore(store.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                style={{ color: selected ? '#4a90d9' : '#e0e0f0' }}
              >
                <span className="truncate">{store.name}</span>
                {selected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
