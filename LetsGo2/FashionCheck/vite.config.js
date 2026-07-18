import { defineConfig } from 'vite';

export default defineConfig({
  root: 'fitcheck',
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
  },
});
