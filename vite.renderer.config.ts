import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        speech_bubble: resolve(__dirname, 'renderer/speech_bubble/index.html'),
        chat: resolve(__dirname, 'chat.html'),
        settings: resolve(__dirname, 'settings.html'),
      },
    },
  },
  server: {
    fs: {
      // Allow serving files from the entire project root
      allow: ['..'],
    },
  },
});
