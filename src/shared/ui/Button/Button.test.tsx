/**
 * Button Component Tests - FSD Phase 1.2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Button } from './Button';

describe('Button Component', () => {
  describe('基本機能', () => {
    it('should render with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('should handle click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Button</Button>);
      
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('バリアント', () => {
    it('should apply primary variant styles by default', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-blue-600');
      expect(button).toHaveClass('text-white');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-gray-200');
      expect(button).toHaveClass('text-gray-900');
    });

    it('should apply danger variant styles', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-red-600');
      expect(button).toHaveClass('text-white');
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-transparent');
    });
  });

  describe('サイズ', () => {
    it('should apply medium size by default', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('px-4');
    });

    it('should apply small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('h-8');
      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('text-sm');
    });

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('h-12');
      expect(button).toHaveClass('px-6');
      expect(button).toHaveClass('text-lg');
    });
  });

  describe('状態', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });

    it('should show loading spinner and be disabled when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
    });

    it('should not trigger onClick when disabled', () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('追加のプロパティ', () => {
    it('should apply fullWidth styles', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('w-full');
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('custom-class');
      // デフォルトクラスも保持
      expect(button).toHaveClass('bg-blue-600');
    });

    it('should pass through other HTML button props', () => {
      render(
        <Button 
          type="submit" 
          name="test-button"
          data-testid="custom-button"
        >
          Submit
        </Button>
      );
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('name', 'test-button');
      expect(button).toHaveAttribute('data-testid', 'custom-button');
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('should be keyboard accessible', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Keyboard</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(document.activeElement).toBe(button);
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });
  });
});