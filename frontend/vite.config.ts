import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [svgr(), react(), tsconfigPaths({ root: __dirname })],
  resolve: {
    alias: {
      $fonts: resolve('./src/vendor/fonts'),
      $assets: resolve('./src/assets'),
      $scss: resolve('./src/scss'), // Добавляем алиас для SCSS
    },
  },
  build: {
    assetsInlineLimit: 0,
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "$scss/mixins/index" as mixins;
          @use "$scss/variables" as *;
        `,
      },
    },
  },
  server: {
    host: '0.0.0.0',
  },
});