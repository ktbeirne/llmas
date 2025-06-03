/**
 * React Testing Library セットアップファイル
 */

import '@testing-library/jest-dom';

// React Testing Library のデフォルト設定
import { configure } from '@testing-library/react';

configure({
  // テストタイムアウトの設定
  asyncUtilTimeout: 5000,
  // より良いエラーメッセージのために
  testIdAttribute: 'data-testid',
});

// グローバルなミック設定
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver のモック
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];

  constructor() {}

  observe() {}
  unobserve() {}
  disconnect() {}
};

// window.matchMedia のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});