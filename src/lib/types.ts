export type SourceLang = "auto" | "kor" | "jpn" | "chi_sim" | "eng";
export type TargetLang = "pt" | "en";
export type BBox = { x: number; y: number; width: number; height: number };
export type TranslationItem = {
  id: string;
  originalText: string;
  translatedText: string;
  confidence?: number;
  bbox: BBox;
  region?: "text" | "bubble";
};
export type Settings = {
  sourceLang: SourceLang;
  targetLang: TargetLang;
  showOriginal: boolean;
  useCache: boolean;
};
export type WorkerRequest = {
  image: string;
  settings: Settings;
  viewport: { width: number; height: number };
  extensionBaseUrl: string;
};
export type WorkerEvent =
  | { type: "status"; status: string }
  | { type: "result"; items: TranslationItem[] }
  | { type: "error"; error: string };
