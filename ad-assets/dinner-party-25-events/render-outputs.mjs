import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const GENERATED = path.join(HERE, "generated");
const OUTPUTS = path.join(HERE, "outputs");
const SOURCE_FILES = [1, 2, 3].map((number) => path.join(GENERATED, `selfie-${number}.png`));
const THEME_IDS = ["editorial", "after-dark"];
const OUTPUT_NAMES = new Set(THEME_IDS.flatMap((themeId) => [
  `${themeId}-magazine.png`,
  `${themeId}-photo-strip.png`,
  `${themeId}-moving-polaroid-still.png`,
  `${themeId}-moving-polaroid.mp4`
]));
const MAX_UPLOAD_BYTES = 96 * 1024 * 1024;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function missingSources() {
  return SOURCE_FILES.filter((filename) => !fs.existsSync(filename));
}

function send(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

function sendEmpty(response, status = 204) {
  response.writeHead(status, { "Cache-Control": "no-store", "Content-Length": "0" });
  response.end();
}

function fileInsideRoot(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidate = path.resolve(ROOT, "." + decoded);
  const relative = path.relative(ROOT, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return candidate;
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_UPLOAD_BYTES) {
      const error = new Error("Output upload exceeded the 96 MiB safety limit.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

function createServer(uploaded) {
  return http.createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url || "/", "http://127.0.0.1");

      if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/favicon.ico") {
        sendEmpty(response);
        return;
      }

      if (request.method === "POST" && url.pathname === "/__dinner-party-output") {
        const filename = url.searchParams.get("filename") || "";
        if (!OUTPUT_NAMES.has(filename)) {
          send(response, 400, "Unexpected output filename.");
          return;
        }
        const body = await readRequestBody(request);
        if (!body.length) {
          send(response, 400, "Empty output upload.");
          return;
        }
        const destination = path.join(OUTPUTS, filename);
        const temporary = destination + `.part-${process.pid}`;
        await fsp.writeFile(temporary, body);
        await fsp.rename(temporary, destination);
        uploaded.set(filename, body.length);
        send(response, 200, JSON.stringify({ filename, bytes: body.length }), "application/json; charset=utf-8");
        return;
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        send(response, 405, "Method not allowed.");
        return;
      }

      const filename = fileInsideRoot(url.pathname);
      if (!filename) {
        send(response, 403, "Forbidden.");
        return;
      }
      let stat;
      try {
        stat = await fsp.stat(filename);
      } catch (error) {
        if (error && error.code === "ENOENT") {
          send(response, 404, "Not found.");
          return;
        }
        throw error;
      }
      if (!stat.isFile()) {
        send(response, 404, "Not found.");
        return;
      }

      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": MIME_TYPES[path.extname(filename).toLowerCase()] || "application/octet-stream",
        "Content-Length": stat.size
      });
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      fs.createReadStream(filename).pipe(response);
    })().catch((error) => {
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      send(response, error.statusCode || 500, error.stack || error.message || String(error));
    });
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not resolve the local render server address.");
  return address.port;
}

async function closeServer(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function launchBrowser() {
  const options = { headless: true };
  try {
    // Installed Chrome includes the H.264 WebCodecs path used by mp4.js.
    return await chromium.launch({ ...options, channel: "chrome" });
  } catch (chromeError) {
    try {
      return await chromium.launch(options);
    } catch (bundledError) {
      throw new AggregateError(
        [chromeError, bundledError],
        "Could not launch installed Chrome or Playwright Chromium."
      );
    }
  }
}

async function main() {
  const missing = missingSources();
  if (missing.length) {
    throw new Error(
      "The real output renderer needs all three generated selfies before it can run:\n" +
      missing.map((filename) => "- " + path.relative(ROOT, filename)).join("\n")
    );
  }

  await fsp.mkdir(OUTPUTS, { recursive: true });
  const uploaded = new Map();
  const server = createServer(uploaded);
  const port = await listen(server);
  let browser;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    page.on("console", (message) => {
      const text = message.text();
      if (text) process.stdout.write(`[browser:${message.type()}] ${text}\n`);
    });
    page.on("pageerror", (error) => process.stderr.write(`[browser:error] ${error.stack || error.message}\n`));

    const renderUrl = `http://127.0.0.1:${port}/ad-assets/dinner-party-25-events/render.html?save=1`;
    await page.goto(renderUrl, { waitUntil: "load", timeout: 30_000 });
    await page.waitForFunction(
      () => document.body.dataset.ready === "true" || document.body.dataset.ready === "error",
      null,
      { timeout: 240_000 }
    );

    const state = await page.evaluate(() => ({
      ready: document.body.dataset.ready,
      status: document.getElementById("status")?.textContent || "",
      error: window.__dinnerPartyRenderError || "",
      metadata: window.__dinnerPartyRender || null
    }));
    if (state.ready !== "true") throw new Error(state.error || state.status || "The browser renderer failed.");

    const notUploaded = [...OUTPUT_NAMES].filter((filename) => !uploaded.has(filename));
    if (notUploaded.length) {
      throw new Error("The browser finished without uploading: " + notUploaded.join(", "));
    }

    for (const filename of OUTPUT_NAMES) {
      const output = path.join(OUTPUTS, filename);
      const stat = await fsp.stat(output);
      if (!stat.isFile() || stat.size < 256) throw new Error(`Output is missing or unexpectedly small: ${output}`);
    }

    process.stdout.write("Created real MyBishBash output candidates:\n");
    for (const [filename, bytes] of uploaded) {
      process.stdout.write(`- ${path.join(OUTPUTS, filename)} (${bytes.toLocaleString("en-GB")} bytes)\n`);
    }
    process.stdout.write(`Event: ${state.metadata.event.eventTitle} · ${state.metadata.event.location} · ${state.metadata.event.date}\n`);
  } finally {
    if (browser) await browser.close();
    await closeServer(server);
  }
}

main().catch((error) => {
  process.stderr.write((error && (error.stack || error.message) || String(error)) + "\n");
  process.exitCode = 1;
});
