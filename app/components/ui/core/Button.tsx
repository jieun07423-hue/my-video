'use client';

import React, { forwardRef, useState, useRef, useEffect, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2, ChevronDown } from 'lucide-react';

interface ButtonProps extends HTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  ripple?: boolean;
  disabled?: boolean;
}

const variantStyles = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-700',
  secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 active:bg-secondary-300 focus:ring-secondary-500 dark:bg-secondary-800 dark:text-secondary-100 dark:hover:bg-secondary-700',
  outline: 'border-2 border-gray-300 bg-transparent hover:bg-gray-50 active:bg-gray-100 focus:ring-gray-500 dark:border-gray-600 dark:hover:bg-gray-800 dark:active:bg-gray-700',
  ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500 dark:hover:bg-gray-800 dark:active:bg-gray-700',
  destructive: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800 focus:ring-error-500',
  success: 'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 focus:ring-success-500',
  link: 'bg-transparent text-primary-600 hover:text-primary-700 hover:underline focus:ring-primary-500 dark:text-primary-400 dark:hover:text-primary-300',
};

const sizeStyles = {
  xs: 'px-2.5 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-base gap-2',
  lg: 'px-6 py-3 text-lg gap-2.5',
  xl: 'px-8 py-4 text-xl gap-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    leftIcon, 
    rightIcon, 
    fullWidth = false,
    ripple = true,
    disabled,
    children,
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-xl',
          'transition-all duration-150 ease-smooth',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'active:scale-[0.98]',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          ripple && 'relative overflow-hidden',
          className
        )}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        )}
        {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span className={clsx('relative z-10', loading && 'invisible')}>{children}</span>
        {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        {ripple && (
          <span className="absolute inset-0 bg-white/30 opacity-0 transition-opacity duration-300 active:opacity-100" aria-hidden="true" />
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export const ButtonGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { vertical?: boolean }>(
  ({ className, vertical = false, children, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={clsx(
          'inline-flex',
          vertical ? 'flex-col' : 'flex-row',
          'rounded-xl overflow-hidden',
          vertical ? 'space-y-0' : 'space-x-0',
          '[&>*:not(:first-child)]:rounded-none',
          '[&>*:first-child]:rounded-l-xl',
          '[&>*:last-child]:rounded-r-xl',
          vertical && '[&>*:first-child]:rounded-t-xl',
          vertical && '[&>*:last-child]:rounded-b-xl',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, index) => 
          React.isValidElement(child) ? React.cloneElement(child, {
            className: clsx(child.props.className, index > 0 && !vertical && 'border-l border-gray-200 dark:border-gray-700')
          }) : child
        )}
      </div>
    );
  }
);
ButtonGroup.displayName = 'ButtonGroup';

export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'children' | 'fullWidth'> & { 
  label: string; 
  children: ReactNode;
  square?: boolean;
}>(
  ({ className, label, children, square = false, variant = 'ghost', size = 'md', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={clsx(
          'p-0',
          square ? 'aspect-square' : '',
          className
        )}
        aria-label={label}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
IconButton.displayName = 'IconButton';

export const ToggleButton = forwardRef<HTMLButtonElement, ButtonProps & { pressed?: boolean; onChange?: (pressed: boolean) => void }>(
  ({ className, pressed = false, onChange, variant = 'outline', ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const newPressed = !pressed;
      onChange?.(newPressed);
      props.onClick?.(e);
    };

    return (
      <Button
        ref={ref}
        variant={pressed ? 'primary' : variant}
        className={clsx(
          pressed && 'bg-primary-600 text-white border-primary-600',
          className
        )}
        onClick={handleClick}
        aria-pressed={pressed}
        {...props}
      />
    );
  }
);
ToggleButton.displayName = 'ToggleButton';

export const DropdownMenu = ({ 
  trigger, 
  items, 
  align = 'right',
  className 
}: { 
  trigger: ReactNode;
  items: { label: string; onClick: () => void; icon?: ReactNode; disabled?: boolean; danger?: boolean }[];
  align?: 'left' | 'right' | 'center';
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
          menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (onClick: () => void) => {
    onClick();
    setOpen(false);
  };

  return (
    <div className="relative inline-block" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <Button 
        ref={triggerRef}
        variant="ghost" 
        size="sm"
        onClick={() => setOpen(!open)}
        rightIcon={<ChevronDown className={clsx('w-4 h-4 transition-transform', open && 'rotate-180')} />}
      >
        {trigger}
      </Button>

      {open && (
        <div
          ref={menuRef}
          className={clsx(
            'fixed z-dropdown mt-1.5 min-w-[180px] rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg',
            'dark:border-gray-700 dark:bg-gray-900',
            'animate-fade-in',
            align === 'left' && 'left-0',
            align === 'right' && 'right-0',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            className
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => handleItemClick(item.onClick)}
              disabled={item.disabled}
              className={clsx(
                'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
                'transition-colors duration-150',
                'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                item.danger ? 'text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20' : 
                'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              role="menuitem"
              aria-disabled={item.disabled}
            >
              {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};