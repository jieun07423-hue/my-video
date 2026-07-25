'use client';

import Navbar from '@/components/Navbar';
import dynamic from 'next/dynamic';

const MenuManager = dynamic(
  () => import('@/components/menu/MenuManager'),
  { ssr: false }
);

export default function MenuManagerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">메뉴 관리</h1>
          <p className="mt-1 text-sm text-gray-600">메뉴를 추가/수정하고 품절 상태를 관리하세요.</p>
        </div>
        <MenuManager storeId="default" />
      </main>
    </div>
  );
}