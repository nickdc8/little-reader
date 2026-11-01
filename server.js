import http from "node:http";
import { readFile } from "node:fs/promises";
import handler from "./api/feed.js";
import articleHandler from "./api/article.js";
const types = {
  "/article-content.js": ["article-content.js", "text/javascript"],
  "/theme.js": ["theme.js", "text/javascript"],
  "/": ["index.html", "text/html"],
  "/app.js": ["app.js", "text/javascript"],
  "/style.css": ["style.css", "text/css"],
  "/icon.svg": ["icon.svg", "image/svg+xml"],
  "/sample-web.svg": ["sample-web.svg", "image/svg+xml"],
  "/sample-design.svg": ["sample-design.svg", "image/svg+xml"],
  "/sample-garden.svg": ["sample-garden.svg", "image/svg+xml"],
  "/sample-food.svg": ["sample-food.svg", "image/svg+xml"],
  "/sample-photo.svg": ["sample-photo.svg", "image/svg+xml"],
};
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/api/feed") return handler(req, res);
  if (path === "/api/article") return articleHandler(req, res);
  if (!types[path]) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    const [file, type] = types[path];
    res.setHeader("Content-Type", `${type}; charset=utf-8`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(await readFile(new URL(`./public/${file}`, import.meta.url)));
  } catch {
    res.writeHead(500);
    res.end("Unable to serve this file.");
  }
});
server.listen(Number(process.env.PORT) || 3000, "127.0.0.1", () =>
  console.log(`Little Reader → http://localhost:${server.address().port}`),
);
