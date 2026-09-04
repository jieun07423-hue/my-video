'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { Menu, X } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import StoreSelect from '@/components/StoreSelect';

export default function Navbar({ children }: { children?: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md" style={{ background: 'rgba(26, 26, 46, 0.9)', borderColor: '#2d2d4a', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
      {children && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2">
          {children}
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between">
          <Link 
            href="/" 
            className="group flex items-center space-x-3 transition-transform duration-200 hover:scale-105"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-lg blur-sm opacity-70 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-r from-indigo-500 to-violet-500 text-white p-2 rounded-lg shadow-md">
                🏪
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-white">
                광고 카피 생성기
              </h1>
              <p className="text-xs" style={{ color: '#a0a0b0' }}>AI Powered Ad Generator</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-white">
                광고 생성기
              </h1>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <NavLink href="/">홈</NavLink>
            <NavLink href="/summary">📋 오늘</NavLink>
            <NavLink href="/dashboard">대시보드</NavLink>
            <NavLink href="/menu/store_1">🍽️ 메뉴</NavLink>
            <NavLink href="/menu/manager">⚙️ 메뉴관리</NavLink>
            <NavLink href="/crm">⭐ 단골</NavLink>
            <NavLink href="/businesses">소상공인 목록</NavLink>
            <NavLink href="/seoul-permits">서울 인허가</NavLink>
            <NavLink href="/new">신규 등록</NavLink>
            <NavLink href="/genie">🧞 지니</NavLink>
            <NavLink href="/admin">어드민</NavLink>
            <NavLink href="/notes/deleted">삭제된 노트</NavLink>
            <div className="ml-2 flex items-center gap-2">
              <StoreSelect />
              <NotificationBell />
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="relative inline-flex items-center justify-center rounded-lg p-2 shadow-sm transition-all duration-200"
              style={{ background: 'rgba(74, 144, 217, 0.1)', color: '#a0a0b0' }}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>


        <div
          className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-4 space-y-1 border-t" style={{ borderColor: '#2d2d4a' }}>
            <div className="px-4 pb-2">
              <StoreSelect />
            </div>
            <MobileNavLink href="/" onClick={() => setIsMobileMenuOpen(false)}>
              홈
            </MobileNavLink>
            <MobileNavLink href="/summary" onClick={() => setIsMobileMenuOpen(false)}>
              📋 오늘
            </MobileNavLink>
            <MobileNavLink href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
              대시보드
            </MobileNavLink>
            <MobileNavLink href="/menu/store_1" onClick={() => setIsMobileMenuOpen(false)}>
              🍽️ 메뉴
            </MobileNavLink>
            <MobileNavLink href="/menu/manager" onClick={() => setIsMobileMenuOpen(false)}>
              ⚙️ 메뉴관리
            </MobileNavLink>
            <MobileNavLink href="/crm" onClick={() => setIsMobileMenuOpen(false)}>
              ⭐ 단골
            </MobileNavLink>
            <MobileNavLink href="/businesses" onClick={() => setIsMobileMenuOpen(false)}>
              소상공인 목록
            </MobileNavLink>
            <MobileNavLink href="/seoul-permits" onClick={() => setIsMobileMenuOpen(false)}>
              서울 인허가
            </MobileNavLink>
            <MobileNavLink href="/new" onClick={() => setIsMobileMenuOpen(false)}>
              신규 등록
            </MobileNavLink>
            <MobileNavLink href="/genie" onClick={() => setIsMobileMenuOpen(false)}>
              🧞 지니
            </MobileNavLink>
            <MobileNavLink href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
              어드민
            </MobileNavLink>
            <MobileNavLink href="/notes/deleted" onClick={() => setIsMobileMenuOpen(false)}>
              삭제된 노트
            </MobileNavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="relative group px-4 py-2 text-sm font-medium transition-all duration-200"
      style={{ color: '#a0a0b0' }}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-200" style={{ background: 'rgba(74, 144, 217, 0.1)' }}></div>
      <div className="absolute bottom-0 left-1/2 w-0 h-0.5 group-hover:w-full group-hover:left-0 transition-all duration-300" style={{ background: '#4a90d9' }}></div>
    </Link>
  );
}

function MobileNavLink({ 
  href, 
  children, 
  onClick 
}: { 
  href: string; 
  children: ReactNode; 
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-3 text-base font-medium rounded-lg transition-all duration-200"
      style={{ color: '#a0a0b0' }}
    >
      <div className="flex items-center justify-between">
        <span>{children}</span>
      </div>
    </Link>
  );
}
