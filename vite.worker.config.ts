import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({base:'./',build:{outDir:'dist',emptyOutDir:false,rollupOptions:{input:{worker:resolve('src/worker/ocrTranslateWorker.ts')},output:{entryFileNames:'worker.js',chunkFileNames:'chunks/worker-[name]-[hash].js',assetFileNames:'assets/[name]-[hash][extname]'}}}});
