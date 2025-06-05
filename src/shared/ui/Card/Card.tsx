/**
 * Card Component - FSD Phase 1.2
 * 共通カードコンポーネント
 */

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@shared/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className,
    variant = 'elevated',
    padding = 'md',
    hoverable = false,
    clickable = false,
    children,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-lg transition-all duration-200',
          
          // Variant styles
          {
            // Elevated
            'bg-white shadow-md': variant === 'elevated',
            
            // Outlined
            'bg-white border border-gray-200': variant === 'outlined',
            
            // Filled
            'bg-gray-50': variant === 'filled',
          },
          
          // Padding styles
          {
            'p-0': padding === 'none',
            'p-3': padding === 'sm',
            'p-5': padding === 'md',
            'p-8': padding === 'lg',
          },
          
          // Interactive states
          hoverable && {
            'hover:shadow-lg': variant === 'elevated',
            'hover:border-gray-300': variant === 'outlined',
            'hover:bg-gray-100': variant === 'filled',
          },
          
          clickable && 'cursor-pointer active:scale-[0.98]',
          
          className
        )}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header サブコンポーネント
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between px-5 py-4 border-b border-gray-200',
          className
        )}
        {...props}
      >
        <div className="flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {action && (
          <div className="ml-4 flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Body サブコンポーネント
export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-5 py-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

// Card Footer サブコンポーネント
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-end px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';