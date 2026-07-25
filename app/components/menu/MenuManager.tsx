'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, EyeOff, Eye, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface MenuItem {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  price: number | string;
  category: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
}

interface MenuManagerProps {
  storeId: string;
}

export default function MenuManager({ storeId }: MenuManagerProps) {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', isAvailable: true });

  const fetchMenus = async () => {
    try {
      const res = await fetch(`/api/menus?storeId=${storeId}`);
      const json = await res.json();
      if (json.success) setMenus(json.data);
    } catch {
      setError('메뉴를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenus(); }, [storeId]);

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category: '', isAvailable: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/menus/${editingId}` : '/api/menus';
      const method = editingId ? 'PUT' : 'POST';
      const body = JSON.stringify({ storeId, ...form, price: Number(form.price) });
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body });
      if (res.ok) {
        resetForm();
        fetchMenus();
      }
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (menu: MenuItem) => {
    await fetch(`/api/menus/${menu.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !menu.isAvailable }),
    });
    fetchMenus();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/menus/${id}`, { method: 'DELETE' });
    fetchMenus();
  };

  const startEdit = (menu: MenuItem) => {
    setForm({
      name: menu.name,
      description: menu.description || '',
      price: String(menu.price),
      category: menu.category || '',
      isAvailable: menu.isAvailable,
    });
    setEditingId(menu.id);
    setShowForm(true);
  };

  if (loading) return <div className="py-8 text-center text-sm text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">메뉴 관리 ({menus.length})</h3>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={14} /> 추가
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {showForm && (
        <div className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">메뉴명 *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">가격 *</label>
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">설명</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">카테고리</label>
              <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                placeholder="예: 메인, 음료"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isAvailable}
                  onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600" />
                <span className="text-sm text-gray-700">판매 중</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {editingId ? '수정' : '추가'}
            </button>
            <button onClick={resetForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100">
              취소
            </button>
          </div>
        </div>
      )}

      {menus.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">등록된 메뉴가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {menus.map(menu => (
            <div key={menu.id} className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all ${menu.isAvailable ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${menu.isAvailable ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                    {menu.name}
                  </span>
                  {menu.category && (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-600">{menu.category}</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm font-semibold text-indigo-600">
                  {Number(menu.price).toLocaleString()}원
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleToggleAvailability(menu)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
                  title={menu.isAvailable ? '품절 처리' : '판매 재개'}>
                  {menu.isAvailable ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => startEdit(menu)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-indigo-600 transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(menu.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-600 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}