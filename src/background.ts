import type { Message } from "./lib/messages";
import type { Settings } from "./lib/types";
import { getCached, hashText, setCached } from "./lib/cache";

const processingTabs = new Set<number>();
const pendingRefreshTabs = new Set<number>();
async function saveStatus(status: string, error?: string) {
  await chrome.storage.local.set({
    bitStatus: { status, error, updatedAt: Date.now() },
  });
}
async function ensureOffscreen() {
  const url = chrome.runtime.getURL("src/offscreen.html");
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [url],
  });
  if (!contexts.length)
    await chrome.offscreen.createDocument({
      url: "src/offscreen.html",
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification:
        "Processar localmente a captura de tela com OCR e tradução sem bloquear a interface.",
    });
}
async function processTab(tab: chrome.tabs.Tab, settings: Settings) {
  if (!tab.id || tab.windowId === undefined || processingTabs.has(tab.id))
    return;
  processingTabs.add(tab.id);
  try {
    await saveStatus("Capturando tela");
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["overlay.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    await chrome.tabs.sendMessage(tab.id, { type: "CLEAR" } satisfies Message);
    const [{ result: viewport }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({ width: window.innerWidth, height: window.innerHeight }),
    });
    const image = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
    });
    const cacheKey = await hashText(image + JSON.stringify(settings));
    if (settings.useCache) {
      const cached = await getCached(cacheKey);
      if (cached) {
        await chrome.tabs.sendMessage(tab.id, {
          type: "RENDER",
          items: cached,
          showOriginal: settings.showOriginal,
        } satisfies Message);
        await saveStatus("Finalizado");
        processingTabs.delete(tab.id);
        return;
      }
    }
    await ensureOffscreen();
    await chrome.runtime.sendMessage({
      type: "PROCESS_OFFSCREEN",
      image,
      settings,
      cacheKey,
      tabId: tab.id,
      viewport: viewport || { width: tab.width || 1, height: tab.height || 1 },
    } satisfies Message);
  } catch (error) {
    processingTabs.delete(tab.id);
    await saveStatus(
      "Erro",
      error instanceof Error ? error.message : String(error),
    );
  }
}

chrome.runtime.onMessage.addListener((message: Message, sender, respond) => {
  if (message.type === "STATUS") {
    void saveStatus(message.status, message.error);
    respond({ ok: true });
    return;
  }
  if (message.type === "OFFSCREEN_RESULT") {
    processingTabs.delete(message.tabId);
    void (async () => {
      if (pendingRefreshTabs.delete(message.tabId)) {
        const tab = await chrome.tabs.get(message.tabId);
        const { settings } = (await chrome.storage.local.get("settings")) as {
          settings?: Settings;
        };
        if (settings) await processTab(tab, settings);
        return;
      }
      if (message.useCache) await setCached(message.cacheKey, message.items);
      await chrome.tabs.sendMessage(message.tabId, {
        type: "RENDER",
        items: message.items,
        showOriginal: message.showOriginal,
      } satisfies Message);
    })();
    respond({ ok: true });
    return true;
  }
  if (message.type === "OFFSCREEN_FAILED") {
    processingTabs.delete(message.tabId);
    pendingRefreshTabs.delete(message.tabId);
    respond({ ok: true });
    return;
  }
  if (message.type === "CLEAR") {
    void (async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab.id)
          await chrome.tabs.sendMessage(tab.id, {
            type: "CLEAR",
          } satisfies Message);
      } catch {
        /* Content script ainda não foi inserido. */
      }
      await saveStatus("Pronto");
    })();
    respond({ ok: true });
    return true;
  }
  if (message.type === "RETRANSLATE") {
    void (async () => {
      if (!sender.tab?.active || !sender.tab.id) return;
      if (processingTabs.has(sender.tab.id)) {
        pendingRefreshTabs.add(sender.tab.id);
        return;
      }
      const { settings } = (await chrome.storage.local.get("settings")) as {
        settings?: Settings;
      };
      if (settings) await processTab(sender.tab, settings);
    })();
    respond({ ok: true });
    return true;
  }
  if (message.type === "TRANSLATE") {
    void (async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) throw new Error("Aba ativa não encontrada.");
      await processTab(tab, message.settings);
    })();
    respond({ ok: true });
    return true;
  }
});
