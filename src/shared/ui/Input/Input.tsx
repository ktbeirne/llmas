/**
 * Input Component - FSD Phase 1.2
 * 共通入力フィールドコンポーネント
 */

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@shared/lib/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    variant = 'default',
    size = 'md',
    fullWidth,
    label,
    error,
    helperText,
    id,
    disabled,
    ...props 
  }, ref) => {
    const inputId = id || (label ? `input-${Math.random().toString(36).substr(2, 9)}` : undefined);
    const hasError = variant === 'error' || !!error;
    
    return (
      <div className={cn('space-y-1', fullWidth && 'w-full')}>
        {label && (
          <label 
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium',
              hasError ? 'text-red-600' : 'text-gray-700',
              disabled && 'opacity-50'
            )}
          >
            {label}
          </label>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={cn(
            // Base styles
            'block rounded-md border transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            'placeholder:text-gray-400',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50',
            
            // Variant styles
            {
              // Default
              'border-gray-300 focus:border-blue-500 focus:ring-blue-500': variant === 'default' && !hasError,
              
              // Error
              'border-red-500 text-red-900 placeholder:text-red-300': hasError,
              'focus:border-red-500 focus:ring-red-500': hasError,
              
              // Success
              'border-green-500 text-green-900 focus:border-green-500 focus:ring-green-500': variant === 'success',
            },
            
            // Size styles
            {
              'h-8 px-3 text-sm': size === 'sm',
              'h-10 px-4 text-base': size === 'md',
              'h-12 px-5 text-lg': size === 'lg',
            },
            
            // Full width
            fullWidth && 'w-full',
            
            className
          )}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        
        {error && (
          <p 
            id={`${inputId}-error`}
            className="text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p 
            id={`${inputId}-helper`}
            className="text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';