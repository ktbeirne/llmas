import { defineConfig } from 'vite';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    tsconfigPaths(), // TypeScript path mapping support
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@app': resolve(__dirname, 'src/app'),
      '@features': resolve(__dirname, 'src/features'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@widgets': resolve(__dirname, 'src/widgets'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'], // CommonJS形式で出力
      fileName: 'main',
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-squirrel-startup',
        'dotenv',
        'fs',
        'path',
        'os',
        'crypto',
        'util',
        'stream',
        'events',
        'url',
        'http',
        'https',
        'zlib',
        'buffer',
        'querystring',
        'net',
        'tls',
        'child_process'
      ],
      output: {
        entryFileNames: '[name].cjs',
      },
    },
    target: 'node18',
  },
});
