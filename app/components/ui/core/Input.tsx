'use client';

import React, { forwardRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Search, X, Eye, EyeOff, Loader2 } from 'lucide-react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  showPasswordToggle?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-5 py-3 text-lg',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    label, 
    error, 
    hint, 
    leftIcon, 
    rightIcon, 
    clearable, 
    showPasswordToggle, 
    loading, 
    size = 'md', 
    disabled, 
    id, 
    value,
    onChange,
    onBlur,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [hasFocus, setHasFocus] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    
    const type = showPasswordToggle && showPassword ? 'text' : props.type;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (clearable && e.target.value === '' && value) {
        onChange?.(e);
      }
      onChange?.(e);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange?.({ target: { name: props.name, value: '' } } as any);
      if (ref && 'current' in ref) {
        (ref.current as HTMLInputElement).focus();
      }
    };

    const handlePasswordToggle = (e: React.MouseEvent) => {
      e.preventDefault();
      setShowPassword(!showPassword);
    };

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5"
          >
            {label}
            {props.required && <span className="text-error-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-xl border bg-white dark:bg-gray-900',
              'placeholder:text-gray-400',
              'transition-all duration-200 ease-smooth',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800',
              sizeStyles[size],
              leftIcon && 'pl-10',
              (rightIcon || clearable || showPasswordToggle || loading) && 'pr-10',
              error 
                ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20 dark:border-error-700 dark:focus:border-error-400'
                : hasFocus
                ? 'border-primary-500 focus:border-primary-500 focus:ring-primary-500/20 dark:border-primary-400 dark:focus:border-primary-500'
                : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={clsx(error && errorId, hint && hintId)}
            onChange={handleChange}
            onBlur={(e) => { setHasFocus(false); onBlur?.(e); }}
            onFocus={() => setHasFocus(true)}
            {...props}
          />
          {loading && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-primary-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          {!loading && clearable && value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="입력 내용 지우기"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {!loading && showPasswordToggle && (
            <button
              type="button"
              onClick={handlePasswordToggle}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {!loading && rightIcon && !clearable && !showPasswordToggle && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-error-600 dark:text-error-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & { 
  label?: string; 
  error?: string; 
  hint?: string; 
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  id?: string;
  rows?: number;
}>(
  ({ 
    className, 
    label, 
    error, 
    hint, 
    size = 'md', 
    disabled, 
    id, 
    value,
    onChange,
    onBlur,
    rows = 3,
    ...props 
  }, ref) => {
    const [hasFocus, setHasFocus] = useState(false);
    const inputId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5"
          >
            {label}
            {props.required && <span className="text-error-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-xl border bg-white dark:bg-gray-900 resize-y',
            'placeholder:text-gray-400',
            'transition-all duration-200 ease-smooth',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800',
            sizeStyles[size],
            error 
              ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20 dark:border-error-700 dark:focus:border-error-400'
              : hasFocus
              ? 'border-primary-500 focus:border-primary-500 focus:ring-primary-500/20 dark:border-primary-400 dark:focus:border-primary-500'
              : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={clsx(error && errorId, hint && hintId)}
          onChange={onChange}
          onBlur={(e) => { setHasFocus(false); onBlur?.(e); }}
          onFocus={() => setHasFocus(true)}
          rows={rows}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-error-600 dark:text-error-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  id?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    label, 
    error, 
    hint, 
    options, 
    placeholder, 
    size = 'md', 
    disabled, 
    id, 
    value,
    onChange,
    onBlur,
    ...props 
  }, ref) => {
    const [hasFocus, setHasFocus] = useState(false);
    const inputId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5"
          >
            {label}
            {props.required && <span className="text-error-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-xl border bg-white dark:bg-gray-900 appearance-none',
              'transition-all duration-200 ease-smooth',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800',
              sizeStyles[size],
              'pr-10',
              error 
                ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20 dark:border-error-700 dark:focus:border-error-400'
                : hasFocus
                ? 'border-primary-500 focus:border-primary-500 focus:ring-primary-500/20 dark:border-primary-400 dark:focus:border-primary-500'
                : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={clsx(error && errorId, hint && hintId)}
            onChange={onChange}
            onBlur={(e) => { setHasFocus(false); onBlur?.(e); }}
            onFocus={() => setHasFocus(true)}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-error-600 dark:text-error-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';