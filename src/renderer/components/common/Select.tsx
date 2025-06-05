/**
 * Select.tsx - 高機能セレクトコンポーネント
 * 
 * Phase 3.5.2.1 Task 3: Select UI Component実装
 * 検索、マルチセレクト、キーボードナビゲーション対応
 */

import React, { useState, useRef, useEffect, forwardRef } from 'react';

import { cn } from '../../utils/cn';

// Types
export type SelectSize = 'sm' | 'md' | 'lg';
export type SelectVariant = 'default' | 'error' | 'success';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps {
  /** オプション配列 */
  options: SelectOption[];
  
  /** 現在の値（制御コンポーネント） */
  value?: string;
  
  /** デフォルト値（非制御コンポーネント） */
  defaultValue?: string;
  
  /** 値変更時のコールバック */
  onChange?: (value: string, option: SelectOption) => void;
  
  /** サイズ */
  size?: SelectSize;
  
  /** バリアント */
  variant?: SelectVariant;
  
  /** ラベル */
  label?: string;
  
  /** プレースホルダー */
  placeholder?: string;
  
  /** エラーメッセージ */
  error?: string;
  
  /** ヘルプテキスト */
  helpText?: string;
  
  /** 検索機能を有効にするか */
  searchable?: boolean;
  
  /** 検索プレースホルダー */
  searchPlaceholder?: string;
  
  /** マルチセレクト */
  multiple?: boolean;
  
  /** マルチセレクトの値 */
  multipleValue?: string[];
  
  /** マルチセレクト変更時のコールバック */
  onMultipleChange?: (values: string[], options: SelectOption[]) => void;
  
  /** カスタムオプションレンダラー */
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
  
  /** カスタム選択値レンダラー */
  renderSelectedValue?: (option: SelectOption | null, options?: SelectOption[]) => React.ReactNode;
  
  /** 幅いっぱいに表示 */
  fullWidth?: boolean;
  
  /** 無効状態 */
  disabled?: boolean;
  
  /** 必須フィールド */
  required?: boolean;
  
  /** ドロップダウンの最大高さ */
  maxDropdownHeight?: number;
  
  /** カスタムクラス */
  className?: string;
  labelClassName?: string;
  errorClassName?: string;
  helpClassName?: string;
  dropdownClassName?: string;
  
  /** test-id */
  'data-testid'?: string;
}

/**
 * ベーススタイル
 */
const baseStyles = [
  'relative',
  'w-full',
  'bg-white',
  'border',
  'rounded-md',
  'px-3',
  'py-2',
  'text-left',
  'shadow-sm',
  'text-sm',
  'transition-colors',
  'duration-200',
  'focus:outline-none',
  'focus:ring-1',
  'disabled:bg-gray-50',
  'disabled:text-gray-500',
  'disabled:cursor-not-allowed',
  'cursor-pointer',
].join(' ');

/**
 * Variant別スタイル
 */
const variantStyles: Record<SelectVariant, string> = {
  default: [
    'border-gray-300',
    'focus:border-primary',
    'focus:ring-primary',
  ].join(' '),
  
  error: [
    'border-red-500',
    'focus:border-red-500',
    'focus:ring-red-500',
  ].join(' '),
  
  success: [
    'border-green-500',
    'focus:border-green-500',
    'focus:ring-green-500',
  ].join(' '),
};

/**
 * Size別スタイル
 */
const sizeStyles: Record<SelectSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

/**
 * ドロップダウンアイコン
 */
const ChevronDownIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <svg
    className={cn(
      'w-4 h-4 text-gray-400 transition-transform duration-200',
      isOpen && 'rotate-180'
    )}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

/**
 * 検索アイコン
 */
const SearchIcon: React.FC = () => (
  <svg
    className="w-4 h-4 text-gray-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

/**
 * チェックマークアイコン
 */
const CheckIcon: React.FC = () => (
  <svg
    className="w-4 h-4 text-primary"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

/**
 * Select コンポーネント
 */
export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      onChange,
      size = 'md',
      variant = 'default',
      label,
      placeholder = '選択してください',
      error,
      helpText,
      searchable = false,
      searchPlaceholder = '検索...',
      multiple = false,
      multipleValue = [],
      onMultipleChange,
      renderOption,
      renderSelectedValue,
      fullWidth = true,
      disabled = false,
      required = false,
      maxDropdownHeight = 200,
      className,
      labelClassName,
      errorClassName,
      helpClassName,
      dropdownClassName,
      'data-testid': testId,
    },
    ref
  ) => {
    // 内部状態管理
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [internalMultipleValue, setInternalMultipleValue] = useState<typeof multipleValue>(multipleValue);
    
    // 参照管理
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // 実際の値（制御/非制御コンポーネント対応）
    const actualValue = value !== undefined ? value : internalValue;
    const actualMultipleValue = multiple ? multipleValue : internalMultipleValue;
    
    // エラー状態の場合はvariantをerrorに変更
    const actualVariant = error ? 'error' : variant;
    
    // フィルタリングされたオプション
    const filteredOptions = searchable && searchTerm
      ? options.filter(option => 
          option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          option.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : options;
    
    // 選択されたオプションを取得
    const getSelectedOption = () => {
      return options.find(option => option.value === actualValue) || null;
    };
    
    const getSelectedMultipleOptions = () => {
      return options.filter(option => actualMultipleValue.includes(option.value));
    };
    
    // 一意なIDの生成
    const selectId = `select-${Math.random().toString(36).substr(2, 9)}`;
    
    // 外部クリック時の処理
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchTerm('');
        }
      };
      
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        
        // 検索可能な場合は自動フォーカス
        if (searchable && searchInputRef.current) {
          setTimeout(() => searchInputRef.current?.focus(), 0);
        }
      }
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen, searchable]);
    
    // キーボードナビゲーション
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return;
      
      switch (event.key) {
        case 'Enter':
        case ' ':
          if (!searchable || !isOpen) {
            event.preventDefault();
            setIsOpen(!isOpen);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          break;
        case 'ArrowDown':
          if (!isOpen) {
            event.preventDefault();
            setIsOpen(true);
          }
          break;
      }
    };
    
    // オプション選択処理
    const handleOptionSelect = (option: SelectOption) => {
      if (option.disabled) return;
      
      if (multiple) {
        const newValues = actualMultipleValue.includes(option.value)
          ? actualMultipleValue.filter(v => v !== option.value)
          : [...actualMultipleValue, option.value];
        
        setInternalMultipleValue(newValues);
        onMultipleChange?.(newValues, getSelectedMultipleOptions());
      } else {
        setInternalValue(option.value);
        onChange?.(option.value, option);
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    
    // スタイル統合
    const selectClasses = cn(
      baseStyles,
      variantStyles[actualVariant],
      sizeStyles[size],
      !fullWidth && 'w-auto',
      className
    );
    
    // 選択値表示
    const renderDisplayValue = () => {
      if (multiple) {
        const selectedOptions = getSelectedMultipleOptions();
        if (renderSelectedValue) {
          return renderSelectedValue(null, selectedOptions);
        }
        
        if (selectedOptions.length === 0) {
          return <span className="text-gray-500">{placeholder}</span>;
        }
        
        if (selectedOptions.length === 1) {
          return selectedOptions[0].label;
        }
        
        return `${selectedOptions.length}件選択中`;
      } else {
        const selectedOption = getSelectedOption();
        if (renderSelectedValue) {
          return renderSelectedValue(selectedOption);
        }
        
        return selectedOption ? (
          <span className="flex items-center gap-2">
            {selectedOption.icon}
            {selectedOption.label}
          </span>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        );
      }
    };
    
    return (
      <div className={cn('w-full', !fullWidth && 'w-auto')} ref={ref}>
        {/* ラベル */}
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium text-gray-700 mb-1',
              labelClassName
            )}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="必須">
                *
              </span>
            )}
          </label>
        )}
        
        {/* Select コンテナ */}
        <div className="relative" ref={dropdownRef}>
          {/* Select トリガー */}
          <div
            id={selectId}
            className={selectClasses}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-required={required}
            aria-invalid={actualVariant === 'error'}
            aria-describedby={cn(
              error && `${selectId}-error`,
              helpText && `${selectId}-help`
            )}
            data-testid={testId}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                {renderDisplayValue()}
              </div>
              <ChevronDownIcon isOpen={isOpen} />
            </div>
          </div>
          
          {/* ドロップダウン */}
          {isOpen && (
            <div
              className={cn(
                'absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg',
                dropdownClassName
              )}
              style={{ maxHeight: maxDropdownHeight }}
              role="listbox"
              aria-labelledby={selectId}
            >
              {/* 検索入力 */}
              {searchable && (
                <div className="p-2 border-b border-gray-200">
                  <div className="relative">
                    <SearchIcon />
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder={searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid={`${testId}-search`}
                    />
                  </div>
                </div>
              )}
              
              {/* オプションリスト */}
              <div className="max-h-60 overflow-auto py-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {searchable && searchTerm ? '該当する項目がありません' : 'オプションがありません'}
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = multiple
                      ? actualMultipleValue.includes(option.value)
                      : actualValue === option.value;
                    
                    return (
                      <div
                        key={`${option.value}-${index}`}
                        className={cn(
                          'px-3 py-2 cursor-pointer select-none relative transition-colors duration-150',
                          option.disabled && 'cursor-not-allowed opacity-50',
                          !option.disabled && 'hover:bg-gray-50',
                          isSelected && 'bg-primary/10'
                        )}
                        onClick={() => handleOptionSelect(option)}
                        role="option"
                        aria-selected={isSelected}
                        data-testid={`${testId}-option-${option.value}`}
                      >
                        {renderOption ? (
                          renderOption(option, isSelected)
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {option.icon}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {option.label}
                                </div>
                                {option.description && (
                                  <div className="text-xs text-gray-500 truncate">
                                    {option.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0 ml-2">
                                <CheckIcon />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* エラーメッセージ */}
        {error && (
          <p
            id={`${selectId}-error`}
            className={cn(
              'mt-1 text-xs text-red-600',
              errorClassName
            )}
            role="alert"
            data-testid={`${testId}-error`}
          >
            {error}
          </p>
        )}
        
        {/* ヘルプテキスト */}
        {helpText && !error && (
          <p
            id={`${selectId}-help`}
            className={cn(
              'mt-1 text-xs text-gray-500',
              helpClassName
            )}
            data-testid={`${testId}-help`}
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

// displayNameを設定
Select.displayName = 'Select';

// デフォルトエクスポート
export default Select;

/**
 * Select関連の型定義エクスポート
 */
export type {
  SelectProps,
  SelectOption,
  SelectSize,
  SelectVariant,
};