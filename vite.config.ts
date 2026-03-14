import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'src',
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'lib/FastJavaThread/src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    strictPort: true,
  },
});
