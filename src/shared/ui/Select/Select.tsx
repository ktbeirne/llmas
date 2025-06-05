/**
 * Select Component - FSD Phase 1.2
 * 共通セレクトボックスコンポーネント
 */

import { forwardRef, SelectHTMLAttributes } from 'react';

import { cn } from '@shared/lib/cn';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  variant?: 'default' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className,
    options,
    variant = 'default',
    size = 'md',
    fullWidth,
    label,
    error,
    helperText,
    placeholder,
    id,
    disabled,
    value,
    ...props 
  }, ref) => {
    const selectId = id || (label ? `select-${Math.random().toString(36).substr(2, 9)}` : undefined);
    const hasError = variant === 'error' || !!error;
    
    return (
      <div className={cn('space-y-1', fullWidth && 'w-full')}>
        {label && (
          <label 
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium',
              hasError ? 'text-red-600' : 'text-gray-700',
              disabled && 'opacity-50'
            )}
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={value}
            className={cn(
              // Base styles
              'block rounded-md border transition-colors duration-200 appearance-none',
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50',
              'pr-10', // Space for dropdown icon
              
              // Variant styles
              {
                // Default
                'border-gray-300 focus:border-blue-500 focus:ring-blue-500': variant === 'default' && !hasError,
                'bg-white': variant === 'default' && !hasError,
                
                // Error
                'border-red-500 text-red-900': hasError,
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
              
              // Placeholder color
              !value && placeholder && 'text-gray-400',
              
              // Full width
              fullWidth && 'w-full',
              
              className
            )}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Dropdown icon */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg 
              className={cn(
                'h-5 w-5',
                hasError ? 'text-red-500' : 'text-gray-400'
              )}
              viewBox="0 0 20 20" 
              fill="currentColor"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
        </div>
        
        {error && (
          <p 
            id={`${selectId}-error`}
            className="text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p 
            id={`${selectId}-helper`}
            className="text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';