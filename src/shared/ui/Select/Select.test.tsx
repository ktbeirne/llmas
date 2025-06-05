/**
 * Select Component Tests - FSD Phase 1.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

describe('Select Component', () => {
  describe('基本機能', () => {
    it('should render select element with options', () => {
      render(<Select options={mockOptions} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('should handle value changes', () => {
      const handleChange = vi.fn();
      render(<Select options={mockOptions} onChange={handleChange} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'option2' } });
      
      expect(handleChange).toHaveBeenCalled();
      expect(handleChange.mock.calls[0][0].target.value).toBe('option2');
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<Select ref={ref} options={mockOptions} />);
      
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLSelectElement);
    });

    it('should disable specific options', () => {
      render(<Select options={mockOptions} />);
      
      const option3 = screen.getByText('Option 3').closest('option');
      expect(option3).toBeDisabled();
    });
  });

  describe('プレースホルダー', () => {
    it('should render placeholder when provided', () => {
      render(<Select options={mockOptions} placeholder="Select an option" />);
      
      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('should disable placeholder option', () => {
      render(<Select options={mockOptions} placeholder="Choose..." />);
      
      const placeholder = screen.getByText('Choose...').closest('option');
      expect(placeholder).toBeDisabled();
      expect(placeholder).toHaveValue('');
    });

    it('should apply placeholder color when no value selected', () => {
      render(<Select options={mockOptions} placeholder="Select..." value="" />);
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('text-gray-400');
    });
  });

  describe('ラベル', () => {
    it('should render label when provided', () => {
      render(<Select options={mockOptions} label="Country" />);
      expect(screen.getByText('Country')).toBeInTheDocument();
    });

    it('should associate label with select', () => {
      render(<Select options={mockOptions} label="Category" />);
      
      const label = screen.getByText('Category');
      const select = screen.getByRole('combobox');
      
      expect(label).toHaveAttribute('for');
      expect(select).toHaveAttribute('id');
      expect(label.getAttribute('for')).toBe(select.getAttribute('id'));
    });
  });

  describe('バリアント', () => {
    it('should apply default variant styles', () => {
      render(<Select options={mockOptions} />);
      const select = screen.getByRole('combobox');
      
      expect(select).toHaveClass('border-gray-300');
      expect(select).toHaveClass('bg-white');
    });

    it('should apply error variant styles', () => {
      render(<Select options={mockOptions} variant="error" />);
      const select = screen.getByRole('combobox');
      
      expect(select).toHaveClass('border-red-500');
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });

    it('should apply success variant styles', () => {
      render(<Select options={mockOptions} variant="success" />);
      const select = screen.getByRole('combobox');
      
      expect(select).toHaveClass('border-green-500');
    });
  });

  describe('サイズ', () => {
    it('should apply medium size by default', () => {
      render(<Select options={mockOptions} />);
      const select = screen.getByRole('combobox');
      
      expect(select).toHaveClass('h-10');
      expect(select).toHaveClass('px-4');
    });

    it('should apply small size', () => {
      render(<Select options={mockOptions} size="sm" />);
      const select = screen.getByRole('combobox');
      
      expect(select).toHaveClass('h-8');
      expect(select).toHaveClass('px-3');
      expect(select).toHaveClass('text-sm');
    });

    it('should apply large size', () => {
      render(<Select options={mockOptions} size="lg" />);
      const select = screen.getByRole('combobox');
      
      expect(select).toHaveClass('h-12');
      expect(select).toHaveClass('px-5');
      expect(select).toHaveClass('text-lg');
    });
  });

  describe('エラーとヘルパーテキスト', () => {
    it('should display error message', () => {
      render(<Select options={mockOptions} error="Please select an option" />);
      
      expect(screen.getByRole('alert')).toHaveTextContent('Please select an option');
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should display helper text', () => {
      render(<Select options={mockOptions} helperText="Choose your preferred option" />);
      
      expect(screen.getByText('Choose your preferred option')).toBeInTheDocument();
    });

    it('should prioritize error over helper text', () => {
      render(
        <Select 
          options={mockOptions}
          error="Invalid selection" 
          helperText="Choose wisely" 
        />
      );
      
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid selection');
      expect(screen.queryByText('Choose wisely')).not.toBeInTheDocument();
    });
  });

  describe('状態', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Select options={mockOptions} disabled />);
      const select = screen.getByRole('combobox');
      
      expect(select).toBeDisabled();
      expect(select).toHaveClass('disabled:opacity-50');
    });

    it('should apply disabled styles to label', () => {
      render(<Select options={mockOptions} label="Disabled Select" disabled />);
      const label = screen.getByText('Disabled Select');
      
      expect(label).toHaveClass('opacity-50');
    });
  });

  describe('追加のプロパティ', () => {
    it('should apply fullWidth styles', () => {
      const { container } = render(<Select options={mockOptions} fullWidth />);
      const wrapper = container.firstChild;
      
      expect(wrapper).toHaveClass('w-full');
      expect(screen.getByRole('combobox')).toHaveClass('w-full');
    });

    it('should apply custom className', () => {
      render(<Select options={mockOptions} className="custom-class" />);
      const select = screen.getByRole('combobox');
      
      expect(select).toHaveClass('custom-class');
      // デフォルトクラスも保持
      expect(select).toHaveClass('border-gray-300');
    });

    it('should pass through other HTML select props', () => {
      render(
        <Select 
          options={mockOptions}
          name="category-select"
          required
          data-testid="custom-select"
        />
      );
      const select = screen.getByRole('combobox');
      
      expect(select).toHaveAttribute('name', 'category-select');
      expect(select).toHaveAttribute('required');
      expect(select).toHaveAttribute('data-testid', 'custom-select');
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Select 
          options={mockOptions}
          label="Category"
          error="Invalid selection"
        />
      );
      const select = screen.getByRole('combobox');
      
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(select).toHaveAttribute('aria-describedby');
    });

    it('should be keyboard accessible', () => {
      render(<Select options={mockOptions} />);
      const select = screen.getByRole('combobox');
      
      select.focus();
      expect(document.activeElement).toBe(select);
    });
  });

  describe('ドロップダウンアイコン', () => {
    it('should render dropdown icon', () => {
      const { container } = render(<Select options={mockOptions} />);
      const svg = container.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should color icon red on error', () => {
      const { container } = render(<Select options={mockOptions} error="Error" />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveClass('text-red-500');
    });
  });
});