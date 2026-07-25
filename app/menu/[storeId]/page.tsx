'use client';

import { useEffect, useState } from 'react';
import { Store, UtensilsCrossed, Coffee, Beef, Pizza, IceCream, Wine, Loader2, ShoppingBag } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  category: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
}

interface StoreInfo {
  id: string;
  name: string;
  businessType: string | null;
  logoUrl: string | null;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '메인': <Beef size={18} />,
  '사이드': <UtensilsCrossed size={18} />,
  '음료': <Coffee size={18} />,
  '디저트': <IceCream size={18} />,
  '주류': <Wine size={18} />,
  '피자': <Pizza size={18} />,
};

const categoryOrder = ['메인', '인기', '음료', '사이드', '디저트', '주류', '기타'];

function groupByCategory(items: MenuItem[]): Record<string, MenuItem[]> {
  const groups: Record<string, MenuItem[]> = {};
  for (const item of items) {
    const cat = item.category || '기타';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}

export default function DigitalMenuPage({ params }: { params: { storeId: string } }) {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes] = await Promise.all([
          fetch(`/api/menus?storeId=${params.storeId}`),
        ]);
        if (menuRes.ok) {
          const json = await menuRes.json();
          setMenus(json.data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.storeId]);

  const availableMenus = menus.filter(m => m.isAvailable);
  const grouped = groupByCategory(availableMenus);
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => (categoryOrder.indexOf(a) !== -1 ? categoryOrder.indexOf(a) : 99)
      - (categoryOrder.indexOf(b) !== -1 ? categoryOrder.indexOf(b) : 99)
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-indigo-600 to-indigo-800 px-6 py-12 text-center text-white">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
          <Store size={32} />
        </div>
        <h1 className="text-2xl font-bold">메뉴판</h1>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {availableMenus.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">현재 준비 중인 메뉴가 없습니다.</p>
          </div>
        ) : (
          sortedCategories.map(category => (
            <div key={category} className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                {CATEGORY_ICONS[category] || <UtensilsCrossed size={18} className="text-indigo-600" />}
                <h2 className="text-lg font-bold text-gray-900">{category}</h2>
              </div>
              <div className="space-y-3">
                {grouped[category].map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    {item.imageUrl && (
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <span className="shrink-0 font-bold text-indigo-600">
                          {Number(item.price).toLocaleString()}원
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <div className="border-t border-gray-100 pt-6 pb-12 text-center">
          <p className="text-xs text-gray-400">
            스캔하여 본 메뉴판 · {new Date().toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>
    </div>
  );
}