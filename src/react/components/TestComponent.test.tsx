import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import TestComponent from './TestComponent';

describe('TestComponent', () => {
  it('デフォルトメッセージが表示されること', () => {
    render(<TestComponent />);
    
    expect(screen.getByTestId('test-message')).toHaveTextContent(
      'React環境が正常に動作しています！'
    );
  });

  it('カスタムメッセージが表示されること', () => {
    const customMessage = 'カスタムテストメッセージ';
    render(<TestComponent message={customMessage} />);
    
    expect(screen.getByTestId('test-message')).toHaveTextContent(customMessage);
  });

  it('onClickが提供された場合にボタンが表示されること', () => {
    const mockOnClick = vi.fn();
    render(<TestComponent onClick={mockOnClick} />);
    
    const button = screen.getByTestId('test-button');
    expect(button).toBeInTheDocument();
  });

  it('ボタンをクリックした時にonClickが呼ばれること', () => {
    const mockOnClick = vi.fn();
    render(<TestComponent onClick={mockOnClick} />);
    
    const button = screen.getByTestId('test-button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('onClickが提供されていない場合はボタンが表示されないこと', () => {
    render(<TestComponent />);
    
    expect(screen.queryByTestId('test-button')).not.toBeInTheDocument();
  });
});