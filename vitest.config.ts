import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // React components need DOM environment
    setupFiles: ['./tests/helpers/index.ts', './tests/helpers/react-testing-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './test-results/coverage',
      exclude: [
        'node_modules/**',
        'out/**',
        'test-results/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'forge.config.ts',
        'vite.*.config.ts',
        'playwright.config.ts',
        'vitest.config.ts',
        'eslint.config.js'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    include: [
      'tests/**/*.{test,spec}.{js,ts,tsx}',
      'src/**/*.{test,spec}.{js,ts,tsx}'
    ],
    exclude: [
      'node_modules/**',
      'out/**',
      'test-results/**'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});