import { existsSync, readFileSync } from "node:fs";
const required = [
  "manifest.json",
  "background.js",
  "content.js",
  "worker.js",
  "src/popup.html",
  "src/offscreen.html",
  "popup.js",
  "offscreen.js",
  "overlay.css",
  "models/tesseract/eng.traineddata.gz",
  "models/tesseract/kor.traineddata.gz",
  "models/tesseract/jpn.traineddata.gz",
  "models/tesseract/jpn_vert.traineddata.gz",
  "models/tesseract/chi_sim.traineddata.gz",
  "models/manga-ocr/config.json",
  "models/manga-ocr/tokenizer.json",
  "models/manga-ocr/onnx/encoder_model_q4.onnx",
  "models/manga-ocr/onnx/decoder_model_q4.onnx",
  "vendor/ort/ort-wasm-simd-threaded.wasm",
  "vendor/ort/ort-wasm-simd-threaded.mjs",
  "assets/icons/icon-16.png",
  "assets/icons/icon-32.png",
  "assets/icons/icon-48.png",
  "assets/icons/icon-128.png",
];
const missing = required.filter((file) => !existsSync(`dist/${file}`));
if (missing.length) throw new Error(`Build incompleto: ${missing.join(", ")}`);
const content = readFileSync("dist/content.js", "utf8");
if (/^\s*import\s/m.test(content))
  throw new Error("content.js contém import ESM.");
const manifest = JSON.parse(readFileSync("dist/manifest.json", "utf8"));
if (manifest.manifest_version !== 3) throw new Error("Manifest não é MV3.");
if (manifest.version !== "1.4.1")
  throw new Error(`Versão inesperada: ${manifest.version}`);
if (manifest.host_permissions?.length)
  throw new Error("host_permissions persistentes não são permitidas.");
for (const file of ["background.js", "content.js", "popup.js"])
  if (/https?:\/\//.test(readFileSync(`dist/${file}`, "utf8")))
    throw new Error(`${file} contém URL HTTP(S).`);
globalThis.console.log(
  "Build MV3 verificado: arquivos, permissões, content script clássico e URLs.",
);
