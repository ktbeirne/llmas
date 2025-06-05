/**
 * Card Component Tests - FSD Phase 1.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CardHeader, CardBody, CardFooter } from './Card';

describe('Card Component', () => {
  describe('基本機能', () => {
    it('should render with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<Card ref={ref}>Card</Card>);
      
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('バリアント', () => {
    it('should apply elevated variant by default', () => {
      const { container } = render(<Card>Elevated</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('bg-white');
      expect(card).toHaveClass('shadow-md');
    });

    it('should apply outlined variant', () => {
      const { container } = render(<Card variant="outlined">Outlined</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('border-gray-200');
    });

    it('should apply filled variant', () => {
      const { container } = render(<Card variant="filled">Filled</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('bg-gray-50');
    });
  });

  describe('パディング', () => {
    it('should apply medium padding by default', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('p-5');
    });

    it('should apply no padding', () => {
      const { container } = render(<Card padding="none">Content</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('p-0');
    });

    it('should apply small padding', () => {
      const { container } = render(<Card padding="sm">Content</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('p-3');
    });

    it('should apply large padding', () => {
      const { container } = render(<Card padding="lg">Content</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('p-8');
    });
  });

  describe('インタラクティブ状態', () => {
    it('should apply hoverable styles', () => {
      const { container } = render(<Card hoverable>Hoverable</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('hover:shadow-lg');
    });

    it('should apply clickable styles and attributes', () => {
      const { container } = render(<Card clickable>Clickable</Card>);
      const card = container.firstChild as HTMLElement;
      
      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    it('should handle click events when clickable', () => {
      const handleClick = vi.fn();
      render(<Card clickable onClick={handleClick}>Click me</Card>);
      
      const card = screen.getByRole('button');
      fireEvent.click(card);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be keyboard accessible when clickable', () => {
      const handleClick = vi.fn();
      render(<Card clickable onClick={handleClick}>Keyboard</Card>);
      
      const card = screen.getByRole('button');
      card.focus();
      expect(document.activeElement).toBe(card);
      
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('追加のプロパティ', () => {
    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-class">Custom</Card>);
      const card = container.firstChild;
      
      expect(card).toHaveClass('custom-class');
      // デフォルトクラスも保持
      expect(card).toHaveClass('rounded-lg');
    });

    it('should pass through other HTML div props', () => {
      const { container } = render(
        <Card 
          id="test-card"
          data-testid="custom-card"
        >
          Props
        </Card>
      );
      const card = container.firstChild;
      
      expect(card).toHaveAttribute('id', 'test-card');
      expect(card).toHaveAttribute('data-testid', 'custom-card');
    });
  });
});

describe('CardHeader Component', () => {
  it('should render title and subtitle', () => {
    render(
      <CardHeader 
        title="Card Title" 
        subtitle="Card subtitle text"
      />
    );
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card subtitle text')).toBeInTheDocument();
  });

  it('should render action element', () => {
    render(
      <CardHeader 
        title="Title"
        action={<button>Action</button>}
      />
    );
    
    expect(screen.getByRole('button')).toHaveTextContent('Action');
  });

  it('should render custom children', () => {
    render(
      <CardHeader>
        <div>Custom header content</div>
      </CardHeader>
    );
    
    expect(screen.getByText('Custom header content')).toBeInTheDocument();
  });
});

describe('CardBody Component', () => {
  it('should render children', () => {
    render(
      <CardBody>
        Body content
      </CardBody>
    );
    
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('should apply default padding', () => {
    const { container } = render(<CardBody>Content</CardBody>);
    const body = container.firstChild;
    
    expect(body).toHaveClass('px-5');
    expect(body).toHaveClass('py-4');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CardBody className="custom-body">Content</CardBody>
    );
    const body = container.firstChild;
    
    expect(body).toHaveClass('custom-body');
    expect(body).toHaveClass('px-5'); // デフォルトクラスも保持
  });
});

describe('CardFooter Component', () => {
  it('should render children', () => {
    render(
      <CardFooter>
        <button>Cancel</button>
        <button>Save</button>
      </CardFooter>
    );
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should apply default styles', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.firstChild;
    
    expect(footer).toHaveClass('border-t');
    expect(footer).toHaveClass('bg-gray-50');
    expect(footer).toHaveClass('rounded-b-lg');
  });

  it('should align content to the end', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.firstChild;
    
    expect(footer).toHaveClass('justify-end');
  });
});

describe('Card with subcomponents', () => {
  it('should render complete card structure', () => {
    render(
      <Card>
        <CardHeader title="Complete Card" subtitle="With all sections" />
        <CardBody>
          <p>Main content goes here</p>
        </CardBody>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Complete Card')).toBeInTheDocument();
    expect(screen.getByText('With all sections')).toBeInTheDocument();
    expect(screen.getByText('Main content goes here')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Action');
  });
});