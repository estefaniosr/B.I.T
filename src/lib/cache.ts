import type { TranslationItem } from "./types";
const PREFIX = "bit-cache-v141-mangaocr-";
export async function hashText(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function getCached(key: string) {
  const value = await chrome.storage.local.get(PREFIX + key);
  return value[PREFIX + key] as TranslationItem[] | undefined;
}
export async function setCached(key: string, items: TranslationItem[]) {
  await chrome.storage.local.set({ [PREFIX + key]: items });
}
export async function clearCache() {
  const all = await chrome.storage.local.get();
  await chrome.storage.local.remove(
    Object.keys(all).filter((k) => k.startsWith(PREFIX)),
  );
}
