'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="relative bg-gradient-to-r from-slate-50 to-gray-50 shadow-lg border-b border-slate-200/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between">
          <Link 
            href="/" 
            className="group flex items-center space-x-3 transition-transform duration-200 hover:scale-105"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-r from-amber-400 to-yellow-500 text-white p-2 rounded-lg shadow-lg">
                🏪
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                소상공인 트래커
              </h1>
              <p className="text-xs text-slate-500 font-medium">Smart Business Management</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                소상공인 트래커
              </h1>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <NavLink href="/">홈</NavLink>
            <NavLink href="/businesses">소상공인 목록</NavLink>
            <NavLink href="/new">신규 등록</NavLink>
            <NavLink href="/admin">어드민</NavLink>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="relative inline-flex items-center justify-center rounded-lg bg-white p-2 text-slate-700 shadow-md hover:bg-slate-50 hover:shadow-lg transition-all duration-200"
              aria-label="Toggle menu"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-yellow-500/20 rounded-lg blur-sm"></div>
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 relative z-10" />
              ) : (
                <Menu className="h-5 w-5 relative z-10" />
              )}
            </button>
          </div>
        </div>


        <div
          className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-4 space-y-1 border-t border-slate-200/50">
            <MobileNavLink href="/" onClick={() => setIsMobileMenuOpen(false)}>
              홈
            </MobileNavLink>
            <MobileNavLink href="/businesses" onClick={() => setIsMobileMenuOpen(false)}>
              소상공인 목록
            </MobileNavLink>
            <MobileNavLink href="/new" onClick={() => setIsMobileMenuOpen(false)}>
              신규 등록
            </MobileNavLink>
            <MobileNavLink href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
              어드민
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
      className="relative group px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200"
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-yellow-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-200"></div>
      <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 group-hover:w-full group-hover:left-0 transition-all duration-300"></div>
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
      className="block px-4 py-3 text-base font-medium text-slate-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:text-slate-900 rounded-lg transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <span>{children}</span>
        <div className="w-2 h-2 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      </div>
    </Link>
  );
}
