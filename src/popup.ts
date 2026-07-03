import type { Message } from "./lib/messages";
import type { Settings, SourceLang, TargetLang } from "./lib/types";
import { prepareTranslation } from "./lib/translator";
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const status = $<HTMLDivElement>("status");
const showStatus = (value: { status: string; error?: string } | undefined) => {
  status.textContent = value?.error
    ? `${value.status}: ${value.error}`
    : value?.status || "Pronto";
  status.className = `status${value?.error ? " error" : ""}`;
};
const settings = (): Settings => ({
  sourceLang: $<HTMLSelectElement>("source").value as SourceLang,
  targetLang: $<HTMLSelectElement>("target").value as TargetLang,
  showOriginal: $<HTMLInputElement>("original").checked,
  useCache: $<HTMLInputElement>("cache").checked,
});
void chrome.storage.local
  .get(["settings", "bitStatus"])
  .then(({ settings: s, bitStatus }) => {
    if (s) {
      $<HTMLSelectElement>("source").value = s.sourceLang;
      $<HTMLSelectElement>("target").value = s.targetLang;
      $<HTMLInputElement>("original").checked = s.showOriginal;
      $<HTMLInputElement>("cache").checked = s.useCache;
    }
    showStatus(bitStatus);
  });
chrome.storage.onChanged.addListener((changes) => {
  if (changes.bitStatus) showStatus(changes.bitStatus.newValue);
});
$("translate").onclick = async () => {
  const value = settings();
  const button = $<HTMLButtonElement>("translate");
  button.disabled = true;
  try {
    await prepareTranslation(value.sourceLang, value.targetLang, (message) =>
      showStatus({ status: message }),
    );
    await chrome.storage.local.set({
      settings: value,
      bitStatus: { status: "Capturando tela", updatedAt: Date.now() },
    });
    await chrome.runtime.sendMessage({
      type: "TRANSLATE",
      settings: value,
    } satisfies Message);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showStatus({ status: "Erro", error: message });
    await chrome.storage.local.set({
      bitStatus: { status: "Erro", error: message, updatedAt: Date.now() },
    });
  } finally {
    button.disabled = false;
  }
};
$("clear").onclick = () =>
  chrome.runtime.sendMessage({ type: "CLEAR" } satisfies Message);
