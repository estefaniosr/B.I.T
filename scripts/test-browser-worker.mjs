/* global URL, document */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".onnx": "application/octet-stream",
  ".png": "image/png",
  ".txt": "text/plain",
};
await sharp("test-pages/japanese-vertical-quality.png")
  .extend({
    top: 200,
    bottom: 200,
    left: 200,
    right: 200,
    background: "#b7b7b7",
  })
  .png()
  .toFile("test-pages/japanese-vertical-page.png");
const server = createServer(async (req, res) => {
  try {
    const path = resolve(
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
    const body = await readFile(path);
    res.writeHead(200, {
      "content-type": types[extname(path)] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const port = server.address().port,
  browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--no-sandbox"],
  });
try {
  const page = await browser.newPage();
  await page.goto(
    `http://127.0.0.1:${port}/test-pages/manga-worker-harness.html`,
  );
  await page.waitForFunction(() => document.body.dataset.status !== "RUNNING", {
    timeout: 180000,
  });
  const status = await page.evaluate(() => ({
    status: document.body.dataset.status,
    text: document.body.textContent,
  }));
  if (status.status !== "PASS") throw new Error(JSON.stringify(status));
} finally {
  await browser.close();
  server.close();
}
