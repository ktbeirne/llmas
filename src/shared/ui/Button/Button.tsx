/**
 * Button Component - FSD Phase 1.2
 * 共通ボタンコンポーネント
 */

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@shared/lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading, 
    fullWidth,
    children, 
    disabled, 
    ...props 
  }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'select-none',
          
          // Variant styles
          variant === 'primary' && [
            'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
            'focus-visible:ring-blue-500'
          ],
          variant === 'secondary' && [
            'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
            'focus-visible:ring-gray-500'
          ],
          variant === 'danger' && [
            'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
            'focus-visible:ring-red-500'
          ],
          variant === 'ghost' && [
            'bg-transparent hover:bg-gray-100 active:bg-gray-200',
            'focus-visible:ring-gray-500'
          ],
          
          // Size styles
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-base': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          
          // Full width
          fullWidth && 'w-full',
          
          // Loading state
          loading && 'cursor-wait',
          
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg 
            className="mr-2 h-4 w-4 animate-spin" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4" 
              className="opacity-25" 
              fill="none"
            />
            <path 
              fill="currentColor" 
              className="opacity-75" 
              d="M4 12a8 8 0 018-8v8H4z" 
            />
          </svg>
        )}
        <span className={cn(loading && 'opacity-70')}>
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';