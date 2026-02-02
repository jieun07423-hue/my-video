'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'amber';
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  subtitle?: string;
  delay?: number;
}

export function StatCard({ 
  title, 
  value, 
  color = 'blue', 
  icon, 
  trend,
  trendValue,
  subtitle,
  delay = 0
}: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const colorConfig = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-200',
      text: 'text-blue-900',
      accent: 'text-blue-600',
      icon: 'from-blue-500 to-blue-600',
      glow: 'shadow-blue-200'
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-100',
      border: 'border-green-200',
      text: 'text-green-900',
      accent: 'text-green-600',
      icon: 'from-green-500 to-emerald-600',
      glow: 'shadow-green-200'
    },
    yellow: {
      bg: 'bg-gradient-to-br from-amber-50 to-yellow-100',
      border: 'border-amber-200',
      text: 'text-amber-900',
      accent: 'text-amber-600',
      icon: 'from-amber-400 to-yellow-500',
      glow: 'shadow-amber-200'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-violet-100',
      border: 'border-purple-200',
      text: 'text-purple-900',
      accent: 'text-purple-600',
      icon: 'from-purple-500 to-violet-600',
      glow: 'shadow-purple-200'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-100',
      border: 'border-amber-200',
      text: 'text-amber-900',
      accent: 'text-amber-600',
      icon: 'from-amber-400 to-orange-500',
      glow: 'shadow-amber-200'
    }
  };

  const colors = colorConfig[color];

  const formatTrendValue = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toString();
  };

  return (
    <div
      className={clsx(
        'relative group cursor-pointer transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        isHovered ? 'scale-105' : 'scale-100'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={clsx(
        'relative overflow-hidden rounded-2xl border border-opacity-20 p-6 backdrop-blur-sm',
        colors.bg,
        colors.border,
        isHovered ? `shadow-2xl ${colors.glow}` : 'shadow-lg'
      )}>

        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 rounded-full blur-2xl transform translate-x-16 -translate-y-16 transition-all duration-500 group-hover:scale-150"></div>
        

        {icon && (
          <div className="absolute top-4 right-4">
            <div className={clsx(
              'relative p-3 rounded-xl bg-white shadow-md transition-all duration-300',
              isHovered ? 'shadow-xl scale-110' : ''
            )}>
              <div className={clsx(
                'absolute inset-0 bg-gradient-to-br rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300',
                colors.icon
              )}></div>
              <span className="relative text-2xl filter drop-shadow-sm">{icon}</span>
            </div>
          </div>
        )}


        <div className="relative z-10">
          <div className="mb-3">
            <h3 className={clsx(
              'text-sm font-semibold uppercase tracking-wide opacity-80',
              colors.text
            )}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs opacity-60 mt-1">{subtitle}</p>
            )}
          </div>

          <div className="flex items-baseline space-x-3">
            <p className={clsx(
              'text-4xl font-bold transition-all duration-300',
              colors.text,
              isHovered ? 'scale-105' : ''
            )}>
              {value.toLocaleString('ko-KR')}
            </p>
            
            {trend && trendValue !== undefined && (
              <div className={clsx(
                'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold',
                trend === 'up' ? 'bg-green-100 text-green-700' : 
                trend === 'down' ? 'bg-red-100 text-red-700' : 
                'bg-gray-100 text-gray-700'
              )}>
                {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {trend === 'neutral' && <Minus className="w-3 h-3" />}
                <span>{formatTrendValue(trendValue)}</span>
              </div>
            )}
          </div>

  
          <div className="mt-4">
            <div className={clsx(
              'h-1 bg-gradient-to-r rounded-full transition-all duration-700 origin-left',
              colors.icon,
              isVisible ? 'scale-x-100' : 'scale-x-0'
            )}></div>
          </div>
        </div>


        <div className={clsx(
          'absolute inset-0 bg-gradient-to-br opacity-0 rounded-2xl transition-opacity duration-300 pointer-events-none',
          colors.icon
        )}></div>
      </div>
    </div>
  );
}