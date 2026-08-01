'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  rounded?: boolean;
  dot?: boolean;
  dotColor?: string;
}

const variantStyles = {
  default: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
  error: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
  info: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300',
  outline: 'border border-current bg-transparent',
  ghost: 'bg-transparent',
};

const sizeStyles = {
  xs: 'px-1.5 py-0.5 text-[0.625rem] gap-0.5',
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
  lg: 'px-3 py-1.5 text-base gap-2',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', rounded = true, dot = false, dotColor, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center font-medium',
          variantStyles[variant],
          sizeStyles[size],
          rounded ? 'rounded-full' : 'rounded-md',
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor || 'currentColor' }}
          />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export const StatusBadge = forwardRef<HTMLSpanElement, Omit<BadgeProps, 'variant'> & { status: 'active' | 'inactive' | 'pending' | 'success' | 'failed' | 'processing' | 'completed' }>(
  ({ className, status, ...props }, ref) => {
    const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string; dot: boolean }> = {
      active: { variant: 'success', label: '활성', dot: true },
      inactive: { variant: 'default', label: '비활성', dot: true },
      pending: { variant: 'warning', label: '대기', dot: true },
      success: { variant: 'success', label: '성공', dot: false },
      failed: { variant: 'error', label: '실패', dot: false },
      processing: { variant: 'info', label: '처리 중', dot: true },
      completed: { variant: 'success', label: '완료', dot: false },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge ref={ref} variant={config.variant} dot={config.dot} className={className} {...props}>
        {config.label}
      </Badge>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';