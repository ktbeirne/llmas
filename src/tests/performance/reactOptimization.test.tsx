import React, { memo, useMemo, useCallback, useState } from 'react';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * React コンポーネント最適化テスト
 * TDD: memo, useMemo, useCallback の適用検証
 */
describe('React Component Optimization Tests', () => {
  
  describe('React.memo Optimization', () => {
    it('should prevent unnecessary re-renders with React.memo', () => {
      // TDD: 期待値 - React.memoによる不要な再レンダリング防止
      const renderSpy = vi.fn();
      
      const ChildComponent = memo(({ value }: { value: string }) => {
        renderSpy();
        return <div data-testid="child">{value}</div>;
      });
      
      const ParentComponent = () => {
        const [count, setCount] = useState(0);
        const [childValue] = useState('constant');
        
        return (
          <div>
            <button onClick={() => setCount(c => c + 1)} data-testid="increment">
              Count: {count}
            </button>
            <ChildComponent value={childValue} />
          </div>
        );
      };
      
      render(<ParentComponent />);
      
      // 初回レンダリング
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // 親の状態変更（子のpropsは変わらない）
      fireEvent.click(screen.getByTestId('increment'));
      
      // React.memoにより子は再レンダリングされない
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
    
    it('should handle complex props with custom comparison', () => {
      // TDD: 期待値 - カスタム比較関数による最適化
      const renderSpy = vi.fn();
      
      interface ComplexProps {
        user: { id: number; name: string };
        settings: { theme: string; language: string };
      }
      
      const ComplexComponent = memo(({ user, settings }: ComplexProps) => {
        renderSpy();
        return (
          <div data-testid="complex">
            {user.name} - {settings.theme}
          </div>
        );
      }, (prevProps, nextProps) => {
        // カスタム比較：IDとテーマのみチェック
        return prevProps.user.id === nextProps.user.id && 
               prevProps.settings.theme === nextProps.settings.theme;
      });
      
      const ParentComponent = () => {
        const [user, setUser] = useState({ id: 1, name: 'John' });
        const [settings] = useState({ theme: 'dark', language: 'ja' });
        
        return (
          <div>
            <button 
              onClick={() => setUser({ id: 1, name: 'John Updated' })}
              data-testid="update-name"
            >
              Update Name
            </button>
            <ComplexComponent user={user} settings={settings} />
          </div>
        );
      };
      
      render(<ParentComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // 名前の変更（IDは同じ）→再レンダリングされない
      fireEvent.click(screen.getByTestId('update-name'));
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('useMemo Optimization', () => {
    it('should memoize expensive calculations', () => {
      // TDD: 期待値 - 重い計算のメモ化
      const expensiveCalculation = vi.fn((n: number) => {
        // 重い計算をシミュレート
        let result = 0;
        for (let i = 0; i < n; i++) {
          result += i;
        }
        return result;
      });
      
      const OptimizedComponent = () => {
        const [count, setCount] = useState(1000);
        const [otherState, setOtherState] = useState(0);
        
        const expensiveValue = useMemo(() => {
          return expensiveCalculation(count);
        }, [count]);
        
        return (
          <div>
            <div data-testid="result">Result: {expensiveValue}</div>
            <button 
              onClick={() => setCount(c => c + 1000)}
              data-testid="change-count"
            >
              Change Count
            </button>
            <button 
              onClick={() => setOtherState(s => s + 1)}
              data-testid="change-other"
            >
              Change Other: {otherState}
            </button>
          </div>
        );
      };
      
      render(<OptimizedComponent />);
      
      // 初回計算
      expect(expensiveCalculation).toHaveBeenCalledTimes(1);
      
      // 関係ない状態の変更
      fireEvent.click(screen.getByTestId('change-other'));
      
      // 再計算されない
      expect(expensiveCalculation).toHaveBeenCalledTimes(1);
      
      // 依存する値の変更
      fireEvent.click(screen.getByTestId('change-count'));
      
      // 再計算される
      expect(expensiveCalculation).toHaveBeenCalledTimes(2);
    });
    
    it('should memoize object/array creation', () => {
      // TDD: 期待値 - オブジェクト・配列作成のメモ化
      const childRenderSpy = vi.fn();
      
      const ChildComponent = memo(({ items }: { items: string[] }) => {
        childRenderSpy();
        return (
          <ul>
            {items.map(item => <li key={item}>{item}</li>)}
          </ul>
        );
      });
      
      const OptimizedParent = () => {
        const [filter, setFilter] = useState('');
        const [allItems] = useState(['apple', 'banana', 'cherry', 'date']);
        
        const filteredItems = useMemo(() => {
          return allItems.filter(item => item.includes(filter));
        }, [allItems, filter]);
        
        return (
          <div>
            <input 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              data-testid="filter-input"
            />
            <ChildComponent items={filteredItems} />
          </div>
        );
      };
      
      render(<OptimizedParent />);
      expect(childRenderSpy).toHaveBeenCalledTimes(1);
      
      // フィルターが変わらない入力
      fireEvent.change(screen.getByTestId('filter-input'), { target: { value: '' } });
      
      // 同じ結果なので子は再レンダリングされない
      expect(childRenderSpy).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('useCallback Optimization', () => {
    it('should memoize event handlers', () => {
      // TDD: 期待値 - イベントハンドラーのメモ化
      const childRenderSpy = vi.fn();
      
      const ChildComponent = memo(({ onAction }: { onAction: () => void }) => {
        childRenderSpy();
        return (
          <button onClick={onAction} data-testid="child-button">
            Child Action
          </button>
        );
      });
      
      const OptimizedParent = () => {
        const [count, setCount] = useState(0);
        const [message, setMessage] = useState('');
        
        const handleAction = useCallback(() => {
          setMessage('Action performed!');
        }, []); // 依存配列が空なので常に同じ関数
        
        return (
          <div>
            <div data-testid="count">Count: {count}</div>
            <div data-testid="message">{message}</div>
            <button 
              onClick={() => setCount(c => c + 1)}
              data-testid="increment"
            >
              Increment
            </button>
            <ChildComponent onAction={handleAction} />
          </div>
        );
      };
      
      render(<OptimizedParent />);
      expect(childRenderSpy).toHaveBeenCalledTimes(1);
      
      // 親の状態変更
      fireEvent.click(screen.getByTestId('increment'));
      
      // コールバックが変わらないので子は再レンダリングされない
      expect(childRenderSpy).toHaveBeenCalledTimes(1);
    });
    
    it('should handle dependency changes correctly', () => {
      // TDD: 期待値 - 依存配列の変更時の適切な動作
      const childRenderSpy = vi.fn();
      const actionSpy = vi.fn();
      
      const ChildComponent = memo(({ onAction }: { onAction: (value: number) => void }) => {
        childRenderSpy();
        return (
          <button 
            onClick={() => onAction(42)}
            data-testid="child-action"
          >
            Child Action
          </button>
        );
      });
      
      const OptimizedParent = () => {
        const [multiplier, setMultiplier] = useState(1);
        const [otherState, setOtherState] = useState(0);
        
        const handleAction = useCallback((value: number) => {
          actionSpy(value * multiplier);
        }, [multiplier]); // multiplierに依存
        
        return (
          <div>
            <button 
              onClick={() => setMultiplier(m => m * 2)}
              data-testid="change-multiplier"
            >
              Multiplier: {multiplier}
            </button>
            <button 
              onClick={() => setOtherState(s => s + 1)}
              data-testid="change-other"
            >
              Other: {otherState}
            </button>
            <ChildComponent onAction={handleAction} />
          </div>
        );
      };
      
      render(<OptimizedParent />);
      expect(childRenderSpy).toHaveBeenCalledTimes(1);
      
      // 関係ない状態の変更
      fireEvent.click(screen.getByTestId('change-other'));
      expect(childRenderSpy).toHaveBeenCalledTimes(1);
      
      // 依存する値の変更
      fireEvent.click(screen.getByTestId('change-multiplier'));
      expect(childRenderSpy).toHaveBeenCalledTimes(2); // 新しいコールバックで再レンダリング
      
      // コールバックの動作確認
      fireEvent.click(screen.getByTestId('child-action'));
      expect(actionSpy).toHaveBeenCalledWith(84); // 42 * 2
    });
  });
  
  describe('Comprehensive Optimization', () => {
    it('should combine all optimization techniques effectively', async () => {
      // TDD: 期待値 - すべての最適化手法の統合
      const expensiveCalc = vi.fn((n: number) => n * n);
      const renderCountSpy = vi.fn();
      
      interface ItemListProps {
        items: Array<{ id: number; value: string }>;
        onItemClick: (id: number) => void;
        multiplier: number;
      }
      
      const OptimizedItemList = memo(({ items, onItemClick, multiplier }: ItemListProps) => {
        renderCountSpy();
        
        const processedItems = useMemo(() => {
          return items.map(item => ({
            ...item,
            processedValue: expensiveCalc(parseInt(item.value) || 0)
          }));
        }, [items]);
        
        const handleClick = useCallback((id: number) => {
          onItemClick(id);
        }, [onItemClick]);
        
        return (
          <div data-testid="item-list">
            {processedItems.map(item => (
              <div key={item.id} onClick={() => handleClick(item.id)}>
                {item.value}: {item.processedValue * multiplier}
              </div>
            ))}
          </div>
        );
      });
      
      const ComprehensiveOptimizedApp = () => {
        const [items, setItems] = useState([
          { id: 1, value: '10' },
          { id: 2, value: '20' }
        ]);
        const [multiplier, setMultiplier] = useState(1);
        const [unrelatedState, setUnrelatedState] = useState(0);
        
        const handleItemClick = useCallback((id: number) => {
          console.log(`Item ${id} clicked`);
        }, []);
        
        return (
          <div>
            <button 
              onClick={() => setMultiplier(m => m + 1)}
              data-testid="change-multiplier"
            >
              Multiplier: {multiplier}
            </button>
            <button 
              onClick={() => setUnrelatedState(s => s + 1)}
              data-testid="change-unrelated"
            >
              Unrelated: {unrelatedState}
            </button>
            <OptimizedItemList 
              items={items}
              onItemClick={handleItemClick}
              multiplier={multiplier}
            />
          </div>
        );
      };
      
      render(<ComprehensiveOptimizedApp />);
      
      // 初回レンダリング
      expect(renderCountSpy).toHaveBeenCalledTimes(1);
      expect(expensiveCalc).toHaveBeenCalledTimes(2); // 2つのアイテム
      
      // 関係ない状態の変更
      fireEvent.click(screen.getByTestId('change-unrelated'));
      
      // 最適化により再レンダリング・再計算されない
      expect(renderCountSpy).toHaveBeenCalledTimes(1);
      expect(expensiveCalc).toHaveBeenCalledTimes(2);
      
      // multiplierの変更
      fireEvent.click(screen.getByTestId('change-multiplier'));
      
      // propsが変わったので再レンダリングされるが、itemsは変わらないので再計算されない
      expect(renderCountSpy).toHaveBeenCalledTimes(2);
      expect(expensiveCalc).toHaveBeenCalledTimes(2); // useMemoで保護
    });
  });
});