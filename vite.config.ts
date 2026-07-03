import { defineConfig, type Plugin } from 'vite';
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

function extensionAssets(): Plugin {
  return { name: 'extension-assets', closeBundle() {
    const copy = (from: string, to: string) => { if (existsSync(from)) { mkdirSync(resolve(to, '..'), { recursive: true }); copyFileSync(from, to); } };
    copy('manifest.json', 'dist/manifest.json');
    copy('src/overlay.css', 'dist/overlay.css');
    if (existsSync('assets')) cpSync('assets', 'dist/assets', { recursive: true });
    if (existsSync('models')) cpSync('models', 'dist/models', { recursive: true });
    copy('node_modules/tesseract.js/dist/worker.min.js', 'dist/vendor/tesseract/worker.min.js');
    for (const f of ['tesseract-core.wasm.js','tesseract-core-simd.wasm.js','tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js']) copy(`node_modules/tesseract.js-core/${f}`, `dist/vendor/tesseract/${f}`);
    copy('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm','dist/vendor/ort/ort-wasm-simd-threaded.wasm');
    copy('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs','dist/vendor/ort/ort-wasm-simd-threaded.mjs');
    copy('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'dist/models/tesseract/eng.traineddata.gz');
    copy('node_modules/@tesseract.js-data/kor/4.0.0_best_int/kor.traineddata.gz', 'dist/models/tesseract/kor.traineddata.gz');
    copy('node_modules/@tesseract.js-data/jpn/4.0.0_best_int/jpn.traineddata.gz', 'dist/models/tesseract/jpn.traineddata.gz');
    copy('node_modules/@tesseract.js-data/jpn_vert/4.0.0_best_int/jpn_vert.traineddata.gz', 'dist/models/tesseract/jpn_vert.traineddata.gz');
    copy('node_modules/@tesseract.js-data/chi_sim/4.0.0_best_int/chi_sim.traineddata.gz', 'dist/models/tesseract/chi_sim.traineddata.gz');
  }};
}
export default defineConfig({ base: './', plugins: [extensionAssets()], build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: { popup: resolve('src/popup.html'), offscreen: resolve('src/offscreen.html'), background: resolve('src/background.ts') }, output: { entryFileNames: '[name].js', chunkFileNames: 'chunks/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' } } } });
