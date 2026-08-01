'use client';

import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/core/Card';
import { Badge } from '@/components/ui/core/Badge';

interface StatCardProps {
  title: string;
  value: number | string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  subtitle?: string;
  loading?: boolean;
  delay?: number;
  onClick?: () => void;
  className?: string;
}

const colorStyles = {
  primary: {
    bg: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/10',
    border: 'border-primary-200 dark:border-primary-800',
    text: 'text-primary-900 dark:text-primary-100',
    accent: 'text-primary-600 dark:text-primary-400',
    icon: 'from-primary-500 to-primary-600',
    glow: 'shadow-primary-500/20',
    trendUp: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  },
  success: {
    bg: 'bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/30 dark:to-success-900/10',
    border: 'border-success-200 dark:border-success-800',
    text: 'text-success-900 dark:text-success-100',
    accent: 'text-success-600 dark:text-success-400',
    icon: 'from-success-500 to-success-600',
    glow: 'shadow-success-500/20',
    trendUp: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
  },
  warning: {
    bg: 'bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/30 dark:to-warning-900/10',
    border: 'border-warning-200 dark:border-warning-800',
    text: 'text-warning-900 dark:text-warning-100',
    accent: 'text-warning-600 dark:text-warning-400',
    icon: 'from-warning-500 to-warning-600',
    glow: 'shadow-warning-500/20',
    trendUp: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
  },
  error: {
    bg: 'bg-gradient-to-br from-error-50 to-error-100 dark:from-error-900/30 dark:to-error-900/10',
    border: 'border-error-200 dark:border-error-800',
    text: 'text-error-900 dark:text-error-100',
    accent: 'text-error-600 dark:text-error-400',
    icon: 'from-error-500 to-error-600',
    glow: 'shadow-error-500/20',
    trendUp: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
  },
  info: {
    bg: 'bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/30 dark:to-secondary-900/10',
    border: 'border-secondary-200 dark:border-secondary-800',
    text: 'text-secondary-900 dark:text-secondary-100',
    accent: 'text-secondary-600 dark:text-secondary-400',
    icon: 'from-secondary-500 to-secondary-600',
    glow: 'shadow-secondary-500/20',
    trendUp: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300',
  },
};

const formatValue = (val: number | string) => {
  if (typeof val === 'string') return val;
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toLocaleString('ko-KR');
};

const formatTrendValue = (val: number) => {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toString();
};

export function StatCard({ 
  title, 
  value, 
  color = 'primary', 
  icon, 
  trend, 
  trendValue, 
  subtitle,
  loading = false,
  delay = 0,
  onClick,
  className,
}: StatCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const colors = colorStyles[color];

  const trendColors = {
    up: colors.trendUp,
    down: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
    neutral: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300',
  };

  if (loading) {
    return (
      <Card variant="elevated" className={clsx(
        'animate-pulse transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )} style={{ transitionDelay: `${delay}ms` }}>
        <CardContent className="p-6">
          <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700 mb-3"></div>
          <div className="h-8 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="mt-4 h-2 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="elevated"
      hover
      className={clsx(
        'relative group cursor-pointer transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        onClick && 'cursor-pointer',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={clsx(
        'relative overflow-hidden rounded-2xl border p-6',
        colors.bg,
        colors.border,
        isHovered ? `shadow-xl ${colors.glow}` : 'shadow-md'
      )}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 rounded-full blur-2xl transform translate-x-16 -translate-y-16 transition-all duration-500 group-hover:scale-150"></div>
        
        {icon && (
          <div className="absolute top-4 right-4">
            <div className={clsx(
              'relative p-3 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md transition-all duration-300',
              isHovered ? 'shadow-lg scale-110' : ''
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
              'text-sm font-semibold uppercase tracking-wider opacity-80',
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
              {formatValue(value)}
            </p>
            
            {trend && trendValue !== undefined && (
              <Badge 
                variant={trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'default'}
                className={clsx('px-2 py-1 rounded-full text-xs font-semibold')}
              >
                <div className="flex items-center space-x-1">
                  {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                  {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                  {trend === 'neutral' && <Minus className="w-3 h-3" />}
                  <span>{formatTrendValue(trendValue)}</span>
                </div>
              </Badge>
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
    </Card>
  );
}