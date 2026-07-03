import type { SourceLang, TargetLang } from "./types";

type BuiltInTranslator = {
  translate(text: string): Promise<string>;
  destroy?(): void;
};
type BuiltInTranslatorFactory = {
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: {
      addEventListener(
        type: "downloadprogress",
        listener: (event: { loaded: number }) => void,
      ): void;
    }) => void;
  }): Promise<BuiltInTranslator>;
};

const instances = new Map<string, BuiltInTranslator>();
function inferSource(texts: string[]): Exclude<SourceLang, "auto"> {
  const sample = texts.join(" ");
  if (/[\uac00-\ud7af]/u.test(sample)) return "kor";
  if (/[\u3040-\u30ff]/u.test(sample)) return "jpn";
  // Han characters alone are ambiguous. In automatic mode the OCR model is
  // Japanese/Korean/English (not Chinese), so a kanji-only balloon is Japanese.
  if (/[\u3400-\u9fff]/u.test(sample)) return "jpn";
  return "eng";
}
const sourceCodes: Record<Exclude<SourceLang, "auto">, string> = {
  kor: "ko",
  jpn: "ja",
  chi_sim: "zh",
  eng: "en",
};
const targetCodes: Record<TargetLang, string> = { pt: "pt", en: "en" };

function polishPortuguese(text: string) {
  return text
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?=[\p{L}\p{N}])/gu, "$1 ")
    .replace(/\s{2,}/g, " ")
    .replace(/\.\.\.+/g, "…")
    .replace(/\s+…/g, "…")
    .replace(/^([a-zá-úç])/, (letter) => letter.toUpperCase())
    .trim();
}

async function getTranslator(
  sourceLanguage: string,
  targetLanguage: string,
  onProgress: (status: string) => void,
) {
  const key = `${sourceLanguage}-${targetLanguage}`;
  let translator = instances.get(key);
  if (translator) return translator;
  const api = (
    globalThis as typeof globalThis & { Translator?: BuiltInTranslatorFactory }
  ).Translator;
  if (!api)
    throw new Error(
      "A tradução local requer Google Chrome 138 ou superior. Esta API não está disponível neste navegador.",
    );
  onProgress("Preparando pacote de tradução local");
  const creation = api.create({
    sourceLanguage,
    targetLanguage,
    monitor: (monitor) =>
      monitor.addEventListener("downloadprogress", (event) =>
        onProgress(
          `Baixando tradução local — ${Math.round(event.loaded * 100)}%`,
        ),
      ),
  });
  const timeout = new Promise<never>((_, reject) =>
    globalThis.setTimeout(
      () =>
        reject(
          new Error(
            `O Chrome não concluiu a preparação do pacote ${sourceLanguage} → ${targetLanguage}.`,
          ),
        ),
      180000,
    ),
  );
  translator = await Promise.race([creation, timeout]);
  instances.set(key, translator);
  return translator;
}

async function translateOne(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  onProgress: (status: string) => void,
) {
  try {
    const translator = await getTranslator(
      sourceLanguage,
      targetLanguage,
      onProgress,
    );
    return await translator.translate(text);
  } catch (directError) {
    // Chrome installations do not all expose the same direct language pairs.
    // English is the documented local bridge and also tends to produce more
    // idiomatic Portuguese than a failed/partial direct Japanese translation.
    if (targetLanguage === "pt" && sourceLanguage !== "en") {
      onProgress("Usando tradução local em duas etapas");
      try {
        const toEnglish = await getTranslator(sourceLanguage, "en", onProgress);
        const toPortuguese = await getTranslator("en", "pt", onProgress);
        const english = await toEnglish.translate(text);
        return await toPortuguese.translate(english);
      } catch {
        // Surface a useful error instead of Chrome's opaque generic failure.
        throw new Error(
          `O Chrome não conseguiu traduzir de ${sourceLanguage} para português, nem diretamente nem pela rota em inglês.`,
        );
      }
    }
    throw directError;
  }
}

export async function prepareTranslation(
  source: SourceLang,
  target: TargetLang,
  onProgress: (status: string) => void,
) {
  const targetLanguage = targetCodes[target];
  const sources =
    source === "auto" ? ["ko", "ja", "en"] : [sourceCodes[source]];
  await Promise.all(
    sources
      .filter((code) => code !== targetLanguage)
      .map((code) => getTranslator(code, targetLanguage, onProgress)),
  );
}

export async function translateTexts(
  texts: string[],
  source: SourceLang,
  target: TargetLang,
  onProgress: (status: string) => void,
): Promise<string[]> {
  const targetLanguage = targetCodes[target];
  const results: string[] = [];
  for (let index = 0; index < texts.length; index++) {
    onProgress(`Traduzindo — ${index + 1}/${texts.length}`);
    // Auto detection must happen per balloon. A whole manga viewport can contain
    // Japanese dialogue, Latin sound effects and UI text at the same time.
    const resolved = source === "auto" ? inferSource([texts[index]]) : source;
    const sourceLanguage = sourceCodes[resolved];
    if (sourceLanguage === targetLanguage) {
      results.push(texts[index]);
      continue;
    }
    results.push(
      (
        await translateOne(
          texts[index],
          sourceLanguage,
          targetLanguage,
          onProgress,
        )
      ).trim(),
    );
  }
  return target === "pt" ? results.map(polishPortuguese) : results;
}
