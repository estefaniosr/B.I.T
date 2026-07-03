import { createWorker, PSM, type Worker } from "tesseract.js";
import type { BBox, SourceLang } from "./types";
import {
  cropImageRegion,
  detectSpeechBubbles,
  extractVerticalGlyphs,
} from "./image";
import { recognizeMangaText } from "./mangaOcr";

const supported: Record<SourceLang, string> = {
  auto: "jpn+kor+eng",
  kor: "kor",
  jpn: "jpn",
  chi_sim: "chi_sim",
  eng: "eng",
};
type OcrLine = { text: string; confidence: number; bbox: BBox };
const cjk = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u;
const cleanText = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:。、！？])/g, "$1")
    .trim();

function union(boxes: BBox[]): BBox {
  const x = Math.min(...boxes.map((box) => box.x)),
    y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width)),
    bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x, y, width: right - x, height: bottom - y };
}
function isUseful(item: OcrLine) {
  const chars =
      item.text.match(/[\p{L}\p{N}\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/gu)
        ?.length ?? 0,
    total = item.text.replace(/\s/g, "").length;
  return (
    item.text.length >= 2 &&
    item.confidence >= 25 &&
    chars >= 2 &&
    chars / Math.max(1, total) >= 0.35 &&
    item.bbox.width >= 10 &&
    item.bbox.height >= 8
  );
}

async function recognizeJapaneseBubbles(
  image: string,
  baseUrl: string,
  onProgress: (s: string) => void,
) {
  onProgress("localizando balões");
  const bubbles = await detectSpeechBubbles(image);
  const recognized = [];
  for (let index = 0; index < bubbles.length; index++) {
    const bubble = bubbles[index];
    onProgress(`entendendo balão ${index + 1}/${bubbles.length}`);
    const margin = Math.max(
      8,
      Math.min(18, Math.min(bubble.width, bubble.height) * 0.06),
    );
    const ocrRegion = {
      x: Math.max(0, bubble.x - margin),
      y: Math.max(0, bubble.y - margin),
      width: bubble.width + margin * 2,
      height: bubble.height + margin * 2,
    };
    const crop = await cropImageRegion(image, ocrRegion);
    const text = await recognizeMangaText(crop, baseUrl, onProgress);
    const japanese = text.match(/[\u3040-\u30ff\u3400-\u9fff]/gu)?.length ?? 0;
    if (japanese < 3 || japanese / Math.max(1, text.length) < 0.65) continue;
    const glyphs = await extractVerticalGlyphs(image, bubble);
    const textBox = glyphs.length
      ? union(glyphs.map((glyph) => glyph.bbox))
      : {
          x: bubble.x + bubble.width * 0.12,
          y: bubble.y + bubble.height * 0.12,
          width: bubble.width * 0.76,
          height: bubble.height * 0.76,
        };
    const layoutWidth = Math.max(
      textBox.width,
      Math.min(bubble.width * 0.76, 280),
    );
    recognized.push({
      id: `manga-${index}`,
      text,
      confidence: 100,
      bbox: {
        x: Math.max(bubble.x, textBox.x - (layoutWidth - textBox.width) / 2),
        y: textBox.y,
        width: layoutWidth,
        height: textBox.height,
      },
      region: "text" as const,
    });
  }
  return recognized.sort((a, b) => a.bbox.y - b.bbox.y || b.bbox.x - a.bbox.x);
}

export async function recognizeImage(
  image: string,
  source: SourceLang,
  baseUrl: string,
  onProgress: (s: string) => void,
) {
  let worker: Worker | undefined;
  try {
    if (source === "jpn" || source === "auto") {
      const mangaItems = await recognizeJapaneseBubbles(
        image,
        baseUrl,
        onProgress,
      );
      if (mangaItems.length) return mangaItems;
      if (source === "jpn")
        throw new Error("Nenhum balão japonês legível foi encontrado.");
    }
    worker = await createWorker(supported[source], 1, {
      workerPath: `${baseUrl}vendor/tesseract/worker.min.js`,
      workerBlobURL: false,
      corePath: `${baseUrl}vendor/tesseract`,
      langPath: `${baseUrl}models/tesseract`,
      logger: (message) =>
        onProgress(
          `${message.status} ${Math.round((message.progress || 0) * 100)}%`,
        ),
    });
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });
    const result = await worker.recognize(image, {}, { blocks: true });
    const paragraphs = (result.data.blocks || [])
      .flatMap((block) => block.paragraphs)
      .map((paragraph, index) => {
        const lines: OcrLine[] = paragraph.lines
          .map((line) => ({
            text: line.text,
            confidence: line.confidence,
            bbox: {
              x: line.bbox.x0,
              y: line.bbox.y0,
              width: line.bbox.x1 - line.bbox.x0,
              height: line.bbox.y1 - line.bbox.y0,
            },
          }))
          .filter(isUseful);
        if (!lines.length) return undefined;
        const text = lines
          .map((line) => cleanText(line.text))
          .filter(Boolean)
          .join(lines.some((line) => cjk.test(line.text)) ? "" : " ");
        return {
          id: `ocr-${index}`,
          text: cleanText(text),
          confidence:
            lines.reduce((sum, line) => sum + line.confidence, 0) /
            lines.length,
          bbox: union(lines.map((line) => line.bbox)),
          region: "text" as const,
        };
      })
      .filter((item) => item !== undefined);
    return paragraphs
      .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
      .slice(0, 30);
  } finally {
    await worker?.terminate();
  }
}
