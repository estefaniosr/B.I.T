import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({base:'./',build:{outDir:'dist',emptyOutDir:false,lib:{entry:resolve('src/content.ts'),formats:['iife'],name:'BubbleImageTranslatorContent',fileName:()=> 'content.js'},rollupOptions:{output:{assetFileNames:'assets/[name]-[hash][extname]'}}}});
