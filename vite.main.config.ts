import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
  plugins: [
    {
      name: 'copy-tools-json',
      writeBundle() {
        // tools.jsonをビルド出力ディレクトリにコピー
        try {
          const srcPath = join(__dirname, 'src', 'config', 'tools.json');
          const destPath = join(__dirname, '.vite', 'build', 'tools.json');
          
          copyFileSync(srcPath, destPath);
          console.log('tools.jsonをビルドディレクトリにコピーしました:', destPath);
        } catch (error) {
          console.error('tools.jsonのコピーに失敗:', error);
        }
      }
    }
  ]
});
