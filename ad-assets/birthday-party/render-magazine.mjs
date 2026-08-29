import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUTPUT = path.join(HERE, "outputs", "maya-23rd-birthday-magazine.png");
const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

function serveProject() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const requested = path.resolve(ROOT, pathname.replace(/^\/+/, ""));
    if (requested !== ROOT && !requested.startsWith(ROOT + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(requested, (error, content) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500).end(error.message);
        return;
      }
      response.writeHead(200, { "Content-Type": MIME[path.extname(requested)] || "application/octet-stream" });
      response.end(content);
    });
  });
  return new Promise(resolve => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const server = await serveProject();
const address = server.address();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 720, height: 1100 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${address.port}/ad-assets/birthday-party/render.html`, {
    waitUntil: "networkidle"
  });
  await page.waitForFunction(() => document.body.dataset.ready === "true", null, { timeout: 60_000 });
  const result = await page.evaluate(() => window.__birthdayMagazine);
  if (result.theme !== "after-dark" || result.template !== "noir" || result.selectedPhoto !== 3) {
    throw new Error("Birthday Magazine did not use the expected real product configuration.");
  }
  const encoded = result.dataUrl.replace(/^data:image\/png;base64,/, "");
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, Buffer.from(encoded, "base64"));
  console.log(`Created ${OUTPUT}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
