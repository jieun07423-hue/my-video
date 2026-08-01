'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  showLabel?: boolean;
  label?: string;
  rounded?: boolean;
  striped?: boolean;
  animated?: boolean;
}

const sizeStyles = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

const variantStyles = {
  default: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-secondary-500',
};

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, size = 'md', variant = 'default', showLabel = false, label, rounded = true, striped = false, animated = false, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    return (
      <div ref={ref} className={clsx('w-full', className)} {...props}>
        {(showLabel || label) && (
          <div className="flex items-center justify-between mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
            <span>{label || `${Math.round(percentage)}%`}</span>
            {showLabel && <span className="text-gray-500 dark:text-gray-400">{Math.round(percentage)}%</span>}
          </div>
        )}
        <div className={clsx('relative overflow-hidden bg-gray-100 dark:bg-gray-800', sizeStyles[size], rounded ? 'rounded-full' : 'rounded-md')}>
          <div
            className={clsx(
              'h-full transition-all duration-500 ease-smooth',
              variantStyles[variant],
              striped && 'bg-stripes',
              animated && 'animate-pulse'
            )}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={label}
          />
        </div>
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export const CircularProgress = forwardRef<HTMLDivElement, Omit<ProgressProps, 'size'> & { size?: number; strokeWidth?: number }>(
  ({ className, value, max = 100, size = 48, variant = 'default', strokeWidth = 4, showLabel = true, label, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <div ref={ref} className={clsx('inline-flex flex-col items-center', className)} style={{ width: size, height: size }} {...props}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-100 dark:text-gray-800"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={clsx('transition-all duration-500 ease-smooth text-current', variantStyles[variant].replace('bg-', 'text-'))}
            style={{ transitionProperty: 'stroke-dashoffset' }}
          />
        </svg>
        {(showLabel || label) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
              {label || `${Math.round(percentage)}%`}
            </span>
          </div>
        )}
      </div>
    );
  }
);
CircularProgress.displayName = 'CircularProgress';

export const ProgressSteps = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { steps: { label: string; completed?: boolean; current?: boolean }[] }>(
  ({ className, steps, ...props }, ref) => {
    return (
      <div ref={ref} className={clsx('flex items-center', className)} {...props}>
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className="flex items-center">
              <div
                className={clsx(
                  'flex items-center justify-center rounded-full transition-all duration-300',
                  'w-8 h-8 text-sm font-medium',
                  step.completed
                    ? 'bg-success-500 text-white'
                    : step.current
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                )}
              >
                {step.completed ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={clsx('ml-2 text-sm font-medium', step.current ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400')}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={clsx(
                  'w-12 h-0.5 mx-2 transition-colors',
                  step.completed ? 'bg-success-500' : 'bg-gray-100 dark:bg-gray-800'
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }
);
ProgressSteps.displayName = 'ProgressSteps';