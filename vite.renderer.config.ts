import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    react({
      // React Fast Refresh最適化と開発体験向上
      fastRefresh: true,
      jsxDev: process.env.NODE_ENV === 'development',
      // HMR パフォーマンス最適化
      include: [
        'src/renderer/**/*.{ts,tsx}',
        'src/renderer/**/*.{js,jsx}',
      ],
      exclude: [
        '**/node_modules/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      babel: {
        plugins: [
          // 開発時のHMR最適化
          ...(process.env.NODE_ENV === 'development' ? [
            ['@babel/plugin-transform-react-jsx-development', {
              runtime: 'automatic'
            }]
          ] : []),
        ],
        // Babel最適化設定
        compact: false,
        minified: false,
        comments: process.env.NODE_ENV === 'development',
      }
    }),
    tsconfigPaths(), // TypeScript path mapping support
  ],
  root: '.',
  publicDir: 'public',
  
  // TypeScript設定と開発支援
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@services': resolve(__dirname, 'src/services'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },
  
  // 環境変数定義
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
    __PROD__: process.env.NODE_ENV === 'production',
  },
  
  // 開発サーバー設定（Electron統合最適化）
  server: {
    port: 3000,
    strictPort: false, // ポート競合時は自動で別のポートを使用
    host: '127.0.0.1', // セキュリティ考慮
    hmr: {
      port: 3001,
      host: 'localhost',
      // HMR接続の安定化とパフォーマンス最適化
      clientPort: 3001,
      timeout: 5000,
      overlay: {
        warnings: true,
        errors: true,
      },
    },
    fs: {
      // セキュリティを考慮したファイルアクセス範囲とパフォーマンス最適化
      allow: ['..', 'node_modules', '.vite'],
      strict: false,
      cachedChecks: true,
    },
    cors: true,
    // 開発サーバーのパフォーマンス最適化
    watch: {
      usePolling: false, // パフォーマンス向上（WSLでない限り）
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/test-results/**',
        '**/coverage/**',
        '**/.vscode/**',
        '**/.idea/**',
        '**/dist/**',
        '**/build/**',
      ],
    },
    // プリフライトチェックの無効化（開発速度向上）
    warmup: {
      clientFiles: [
        './src/renderer/main.tsx',
        './src/renderer/apps/*.tsx',
        './src/renderer/components/**/*.tsx',
        './src/renderer/hooks/*.ts',
        './src/renderer/stores/*.ts',
      ],
    },
  },
  
  // ビルド設定とパフォーマンス最適化
  build: {
    sourcemap: true, // デバッグ支援
    chunkSizeWarningLimit: 500, // より厳しいチャンクサイズ制限
    minify: 'esbuild', // 高速で効率的なminification
    target: 'esnext', // モダンな環境をターゲット
    cssCodeSplit: true, // CSS分割を有効化
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        speech_bubble: resolve(__dirname, 'renderer/speech_bubble/index.html'),
        chat: resolve(__dirname, 'chat.html'),
        settings: resolve(__dirname, 'settings.html'),
      },
      output: {
        // コード分割によるパフォーマンス最適化
        manualChunks: (id) => {
          // React関連の依存関係
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react';
          }
          
          // Three.js とVRM関連
          if (id.includes('three') || id.includes('@pixiv/three-vrm')) {
            return 'three';
          }
          
          // 状態管理関連
          if (id.includes('zustand') || id.includes('immer')) {
            return 'state';
          }
          
          // フォーム関連
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
            return 'forms';
          }
          
          // Google AI関連
          if (id.includes('@google/generative-ai')) {
            return 'ai';
          }
          
          // その他のnode_modules依存関係
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  
  // 最適化設定
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'zustand',
      'immer',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'clsx',
      'tailwind-merge',
    ],
    exclude: [
      // 大きな依存関係は最適化対象から除外（tree-shakingを活用）
      'three',
      '@pixiv/three-vrm',
      '@pixiv/three-vrm-animation',
      '@google/generative-ai',
    ],
    // HMR時の依存関係プリバンドル最適化
    force: process.env.NODE_ENV === 'development',
    esbuildOptions: {
      // esbuild最適化設定
      target: 'esnext',
      jsx: 'automatic',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      treeShaking: true, // Tree-shaking有効化
      minifyIdentifiers: process.env.NODE_ENV === 'production',
      minifySyntax: process.env.NODE_ENV === 'production',
      minifyWhitespace: process.env.NODE_ENV === 'production',
    },
  },

  // 開発時の型チェックとログ設定
  esbuild: {
    // TypeScript型チェックのパフォーマンス最適化
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'esnext',
    jsx: 'automatic',
    // 開発時のログとエラー表示最適化
    ...(process.env.NODE_ENV === 'development' && {
      banner: {
        js: '// HMR enabled - React Fast Refresh active',
      },
    }),
  },

  // 開発時のログレベル設定
  logLevel: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
  
  // カスタムログ設定
  customLogger: process.env.NODE_ENV === 'development' ? {
    info: (msg, options) => {
      if (msg.includes('hmr') || msg.includes('reload') || msg.includes('updated')) {
        console.log(`🔥 [HMR] ${msg}`);
      } else {
        console.log(`ℹ️ [Vite] ${msg}`);
      }
    },
    warn: (msg, options) => {
      console.warn(`⚠️ [Vite] ${msg}`);
    },
    error: (msg, options) => {
      console.error(`❌ [Vite] ${msg}`);
    },
  } : undefined,
});
