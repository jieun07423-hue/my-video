'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import { useState } from 'react';
import { MapPin, Building2, Calendar, ChevronRight, Star, TrendingUp, TrendingDown } from 'lucide-react';

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

interface BusinessTableRowProps {
  business: Business;
  showNewBadge?: boolean;
  index?: number;
}

export function BusinessTableRow({ business, showNewBadge = false, index = 0 }: BusinessTableRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusConfig = {
    pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: '⏳',
      label: '대기'
    },
    active: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: '✅',
      label: '영업중'
    },
    inactive: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: '⏸️',
      label: '휴업'
    },
    dissolved: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: '❌',
      label: '폐업'
    },
  };

  const recordStatusConfig = {
    new: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: '🆕',
      label: '신규'
    },
    synced: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: '🔄',
      label: '동기화됨'
    },
    verified: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: '✓',
      label: '검증됨'
    },
  };

  const currentStatus = statusConfig[business.status as keyof typeof statusConfig] || statusConfig.pending;
  const currentRecordStatus = recordStatusConfig[business.recordStatus as keyof typeof recordStatusConfig] || recordStatusConfig.new;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <tr 
      className={clsx(
        'group relative transition-all duration-300 border-b border-slate-100',
        isHovered ? 'bg-gradient-to-r from-slate-50 to-blue-50/30 shadow-sm' : 'bg-white',
        'hover:shadow-md'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 50}ms`,
        animation: 'slideIn 0.5s ease-out forwards'
      }}
    >
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {showNewBadge && (
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse"></div>
            )}
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-sm transition-all duration-200',
              currentStatus.bg,
              currentStatus.text,
              isHovered ? 'shadow-md scale-105' : ''
            )}>
              {currentStatus.icon}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                {business.name}
              </h4>
              {showNewBadge && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-blue-400 to-blue-600 text-white text-xs font-semibold rounded-full">
                  NEW
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{business.bizesId}</span>
              <span>•</span>
              <span>{currentRecordStatus.label}</span>
            </div>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-start space-x-2">
          <MapPin className={clsx(
            'w-4 h-4 mt-0.5 transition-colors duration-200',
            isHovered ? 'text-blue-500' : 'text-slate-400'
          )} />
          <div className="flex-1">
            <p className="text-sm text-slate-900 line-clamp-2 group-hover:text-slate-700 transition-colors">
              {business.roadNameAddress || business.lotNumberAddress || '-'}
            </p>
            {business.roadNameAddress && business.lotNumberAddress && (
              <button className="text-xs text-blue-600 hover:text-blue-700 mt-1 transition-colors">
                지번 보기
              </button>
            )}
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <div className={clsx(
            'inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200',
            currentStatus.bg,
            currentStatus.text,
            currentStatus.border,
            isHovered ? 'shadow-sm scale-105' : ''
          )}>
            <span>{currentStatus.icon}</span>
            <span>{business.businessName || '-'}</span>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className={clsx(
          'inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200',
          currentStatus.bg,
          currentStatus.text,
          currentStatus.border,
          isHovered ? 'shadow-sm scale-105' : ''
        )}>
          <span>{currentStatus.icon}</span>
          <span>{currentStatus.label}</span>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div className="text-sm">
            <p className="text-slate-900 font-medium">{formatDate(business.createdAt)}</p>
            <p className="text-xs text-slate-500">
              {new Date(business.createdAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        <Link
          href={`/businesses/${business.id}`}
          className={clsx(
            'group/link inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
            'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm',
            'hover:from-blue-600 hover:to-blue-700 hover:shadow-md hover:scale-105'
          )}
        >
          <span>상세</span>
          <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1" />
        </Link>
      </td>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </tr>
  );
}