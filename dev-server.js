// Sayso: local development server (`npm start`).
// Serves ./public and runs the same /api/* functions Vercel runs in production.
// Without Stripe keys, set DEV_FREE_ACCESS=1 to skip the paywall locally.

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, "public");
const PORT = Number(process.env.PORT) || 3000;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const API = new Set(["account", "billing", "tutor", "progress", "lessons"]);

async function toRequest(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  return new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
}

async function sendResponse(res, response) {
  const headers = {};
  response.headers.forEach((v, k) => (headers[k] = v));
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const api = url.pathname.match(/^\/api\/(\w+)$/);
  try {
    if (api && API.has(api[1])) {
      const mod = await import(`./api/${api[1]}.js`);
      const fn = mod[req.method];
      if (!fn) return sendResponse(res, new Response("Method not allowed", { status: 405 }));
      return sendResponse(res, await fn(await toRequest(req)));
    }
    const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const file = path.resolve(PUBLIC_DIR, rel);
    const data = file.startsWith(PUBLIC_DIR + path.sep) ? await fs.readFile(file).catch(() => null) : null;
    if (!data) return sendResponse(res, new Response("Not found", { status: 404 }));
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch (err) {
    console.error(err);
    sendResponse(res, new Response("Server error", { status: 500 }));
  }
}).listen(PORT, () => {
  console.log(`Sayso is running → http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.log("Note: ANTHROPIC_API_KEY is not set; the tutor won't answer.");
  if (process.env.DEV_FREE_ACCESS === "1") console.log("DEV_FREE_ACCESS=1: paywall skipped for local testing.");
});
