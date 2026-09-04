'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface StoreOption {
  id: string;
  name: string;
  slug: string;
  businessType?: string | null;
}

interface StoreContextValue {
  stores: StoreOption[];
  currentStore: StoreOption | null;
  loading: boolean;
  refresh: () => Promise<void>;
  selectStore: (storeId: string) => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const STORAGE_KEY = 'currentStoreId';

/**
 * 활성 스토어 목록을 불러오고, 사용자가 선택한 스토어를 전역으로 관리하는 Context.
 * 선택값은 localStorage에 유지되어 새로고침 후에도 유지된다.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [currentStore, setCurrentStore] = useState<StoreOption | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch('/api/stores');
      const json = res.ok ? await res.json() : { data: [] };
      const list: StoreOption[] = json.data || [];
      setStores(list);

      const savedId = localStorage.getItem(STORAGE_KEY);
      const saved = list.find((s) => s.id === savedId) || null;
      setCurrentStore(saved || list[0] || null);
    } catch {
      setStores([]);
      setCurrentStore(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectStore = (storeId: string) => {
    const selected = stores.find((s) => s.id === storeId) || null;
    setCurrentStore(selected);
    if (selected) {
      localStorage.setItem(STORAGE_KEY, selected.id);
    }
  };

  return (
    <StoreContext.Provider value={{ stores, currentStore, loading, refresh, selectStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore는 StoreProvider 내부에서만 사용할 수 있습니다.');
  }
  return ctx;
}
