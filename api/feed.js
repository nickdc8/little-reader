import { loadFeed } from "../lib/feed.js";
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed." }));
    return;
  }
  const url = new URL(req.url, "http://localhost").searchParams.get("url");
  if (!url || url.length > 2048) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Enter a feed or website address." }));
    return;
  }
  try {
    res.end(JSON.stringify(await loadFeed(url)));
  } catch (error) {
    res.statusCode = 422;
    res.end(
      JSON.stringify({ error: error.message || "Unable to read this feed." }),
    );
  }
}
