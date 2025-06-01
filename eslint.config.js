import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

export default [
  // Global ignores (applies to all configurations)
  {
    ignores: [
      'node_modules/**',
      '.vite/**',
      'dist/**',
      'out/**',
      '.git/**',
      '.Obsidian/**',
      '**/*.d.ts',
      'tests-e2e/**',
      'tests-examples/**',
      '*.config.ts',
      '*.config.js'
    ]
  },
  
  // Apply to all TypeScript files in src
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        NodeJS: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        getComputedStyle: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        // DOM/HTML element types
        HTMLElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        Element: 'readonly',
        NodeListOf: 'readonly',
        Event: 'readonly',
        FocusEvent: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        // Other browser APIs
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        Electron: 'readonly',
        // Electron globals
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin
    },
    rules: {
      // ESLint recommended rules
      ...js.configs.recommended.rules,
      
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // Import rules
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always'
      }],
      
      // General rules
      'no-console': 'off', // Allow console for development
      'no-debugger': 'warn',
      'no-unused-vars': 'off', // Use TypeScript version instead
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  
  // Specific overrides for test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  
  // Specific rules for Electron main process files
  {
    files: ['src/main.ts', 'src/preload.ts'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly'
      }
    }
  }
];