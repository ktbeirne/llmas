import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import fsdRules from './eslint.config.fsd.js';

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
  
  // Apply to all TypeScript files in src (non-React)
  {
    files: ['src/**/*.ts'],
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
  
  // Specific configuration for React/TSX files (Phase 3.5.1 強化)
  {
    files: ['src/**/*.tsx', 'src/**/*.jsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin
    },
    rules: {
      // TypeScript rules (React強化版)
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      
      // React 19対応rules
      'react/react-in-jsx-scope': 'off', // React 17+ automatic JSX runtime
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/jsx-uses-react': 'off', // React 17+ automatic JSX runtime
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'error',
      'react/no-unknown-property': 'error',
      'react/jsx-no-useless-fragment': 'warn',
      'react/jsx-pascal-case': 'error',
      'react/no-array-index-key': 'warn',
      'react/no-unused-state': 'error',
      'react/prefer-stateless-function': 'warn',
      'react/self-closing-comp': 'error',
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-curly-brace-presence': ['error', { 'props': 'never', 'children': 'never' }],
      
      // React Hooks rules (強化版)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Context使用に関する規則
      'react/jsx-no-constructed-context-values': 'error',
      'react/no-unstable-nested-components': 'error',
      
      // パフォーマンス関連の規則
      'react/jsx-no-bind': ['warn', {
        'ignoreRefs': true,
        'allowArrowFunctions': true,
        'allowFunctions': false,
        'allowBind': false,
        'ignoreDOMComponents': true
      }],
      
      // Import rules (Reactパス解決対応)
      'import/no-unresolved': 'off', // TypeScript + Viteが処理
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'pathGroups': [
          {
            'pattern': 'react',
            'group': 'external',
            'position': 'before'
          },
          {
            'pattern': '@/**',
            'group': 'internal',
            'position': 'before'
          }
        ],
        'pathGroupsExcludedImportTypes': ['react'],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true
        }
      }],
      'import/no-default-export': 'off', // React components need default export
      'import/prefer-default-export': 'off',
      
      // Electron Context使用に関するカスタム規則
      'no-restricted-imports': ['error', {
        'patterns': [
          {
            'group': ['electron'],
            'message': 'Direct electron imports are not allowed in renderer process. Use ElectronContext instead.'
          }
        ]
      }]
    },
    settings: {
      react: {
        version: 'detect'
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json'
        }
      }
    }
  },

  // React Hooks and Context specific rules (Phase 3.5.1)
  {
    files: ['src/renderer/hooks/**/*.ts', 'src/renderer/contexts/**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin
    },
    rules: {
      // Hook専用の厳格な規則
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'react-hooks/exhaustive-deps': 'error', // Hooksでは厳格に
      
      // カスタムHook命名規則
      'no-restricted-syntax': [
        'error',
        {
          'selector': 'FunctionDeclaration[id.name!=/^use[A-Z]/]',
          'message': 'Custom hooks must start with "use" followed by a capital letter'
        }
      ],
      
      // Contextプロバイダーの規則
      'react/jsx-no-constructed-context-values': 'error',
      'react/no-unstable-nested-components': 'error'
    }
  },

  // React component specific rules
  {
    files: ['src/renderer/components/**/*.tsx', 'src/renderer/apps/**/*.tsx'],
    rules: {
      // コンポーネント命名規則
      'no-restricted-syntax': [
        'error',
        {
          'selector': 'FunctionDeclaration[id.name!=/^[A-Z]/]',
          'message': 'React components must start with a capital letter'
        }
      ],
      
      // Props型定義の強制
      '@typescript-eslint/no-explicit-any': 'error',
      
      // パフォーマンス最適化の推奨
      'react/jsx-no-bind': 'warn',
      'react/no-array-index-key': 'warn'
    }
  },

  // Test files for React components
  {
    files: ['src/renderer/**/*.test.tsx', 'src/renderer/**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react/jsx-no-bind': 'off',
      'no-console': 'off'
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
  },
  
  // Feature-Sliced Design architectural rules
  ...fsdRules
];