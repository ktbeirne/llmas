/**
 * Input Component Tests - FSD Phase 1.2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Input } from './Input';

describe('Input Component', () => {
  describe('基本機能', () => {
    it('should render input element', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should handle value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test value' } });
      
      expect(handleChange).toHaveBeenCalled();
      expect(handleChange.mock.calls[0][0].target.value).toBe('test value');
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('ラベル', () => {
    it('should render label when provided', () => {
      render(<Input label="Email Address" />);
      expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    it('should associate label with input', () => {
      render(<Input label="Username" />);
      
      const label = screen.getByText('Username');
      const input = screen.getByRole('textbox');
      
      expect(label).toHaveAttribute('for');
      expect(input).toHaveAttribute('id');
      expect(label.getAttribute('for')).toBe(input.getAttribute('id'));
    });

    it('should use provided id for label association', () => {
      render(<Input id="custom-id" label="Custom" />);
      
      const label = screen.getByText('Custom');
      const input = screen.getByRole('textbox');
      
      expect(label).toHaveAttribute('for', 'custom-id');
      expect(input).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('バリアント', () => {
    it('should apply default variant styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('border-gray-300');
    });

    it('should apply error variant styles', () => {
      render(<Input variant="error" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('border-red-500');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should apply success variant styles', () => {
      render(<Input variant="success" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('border-green-500');
    });
  });

  describe('サイズ', () => {
    it('should apply medium size by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('h-10');
      expect(input).toHaveClass('px-4');
    });

    it('should apply small size', () => {
      render(<Input size="sm" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('h-8');
      expect(input).toHaveClass('px-3');
      expect(input).toHaveClass('text-sm');
    });

    it('should apply large size', () => {
      render(<Input size="lg" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('h-12');
      expect(input).toHaveClass('px-5');
      expect(input).toHaveClass('text-lg');
    });
  });

  describe('エラーとヘルパーテキスト', () => {
    it('should display error message', () => {
      render(<Input error="This field is required" />);
      
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should display helper text', () => {
      render(<Input helperText="Enter your email address" />);
      
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('should prioritize error over helper text', () => {
      render(
        <Input 
          error="Invalid email" 
          helperText="Enter your email address" 
        />
      );
      
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
      expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument();
    });

    it('should associate error with input', () => {
      render(<Input error="Error message" />);
      
      const input = screen.getByRole('textbox');
      const errorId = input.getAttribute('aria-describedby');
      
      expect(errorId).toBeTruthy();
      expect(screen.getByRole('alert')).toHaveAttribute('id', errorId);
    });
  });

  describe('状態', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50');
    });

    it('should apply disabled styles to label', () => {
      render(<Input label="Disabled Input" disabled />);
      const label = screen.getByText('Disabled Input');
      
      expect(label).toHaveClass('opacity-50');
    });
  });

  describe('追加のプロパティ', () => {
    it('should apply fullWidth styles', () => {
      const { container } = render(<Input fullWidth />);
      const wrapper = container.firstChild;
      
      expect(wrapper).toHaveClass('w-full');
      expect(screen.getByRole('textbox')).toHaveClass('w-full');
    });

    it('should apply custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('custom-class');
      // デフォルトクラスも保持
      expect(input).toHaveClass('border-gray-300');
    });

    it('should pass through other HTML input props', () => {
      render(
        <Input 
          type="email"
          name="email-input"
          autoComplete="email"
          data-testid="custom-input"
        />
      );
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('name', 'email-input');
      expect(input).toHaveAttribute('autoComplete', 'email');
      expect(input).toHaveAttribute('data-testid', 'custom-input');
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Input 
          label="Email"
          error="Invalid email"
          helperText="name@example.com"
        />
      );
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('should be keyboard accessible', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      
      input.focus();
      expect(document.activeElement).toBe(input);
    });
  });
});