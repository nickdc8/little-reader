import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { extractArticle } from "../lib/article.js";
import { renderArticleContent } from "../public/article-content.js";
import handler from "../api/article.js";
const paragraph =
  "This is a fictional cooking article with enough detail to identify its reading content. It describes preparing a meal, cooking vegetables and bringing everything together in a skillet. ";
const page = `<!doctype html><html><head><title>A fictional supper</title></head><body><nav>Navigation links</nav><article><h1>A fictional supper</h1><p>${paragraph.repeat(4)}</p><img src="/dish.jpg" alt="The finished dish"><h2>Ingredients</h2><ul><li>One onion</li><li>Two mushrooms</li></ul><h2>Method</h2><p>${paragraph.repeat(4)}</p><a href="/more">More recipes</a></article><section id="comments"><p>COMMENT CONTENT SHOULD BE REMOVED</p></section></body></html>`;
test("extracts paragraphs, images, recipe lists and resolves links, excluding comments", () => {
  const result = extractArticle(page, "https://example.com/supper");
  assert.match(result.html, /<p>/);
  assert.match(result.html, /<li>One onion/);
  assert.match(result.html, /https:\/\/example.com\/dish.jpg/);
  assert.match(result.html, /https:\/\/example.com\/more/);
  assert.doesNotMatch(result.html, /COMMENT CONTENT/);
});
test("rejects a page with no meaningful article", () => {
  assert.throws(
    () =>
      extractArticle(
        "<html><body>Nothing here</body></html>",
        "https://example.com",
      ),
    /readable/,
  );
});
test("server strips executable HTML from readable content", () => {
  const result = extractArticle(
    page.replace(
      "</article>",
      '<script>alert(1)</script><p onclick="bad()">Still useful</p><a href="javascript:bad()">Unsafe link</a></article>',
    ),
    "https://example.com",
  );
  assert.doesNotMatch(result.html, /<script|onclick|javascript:/i);
});
test("browser renderer treats even imported cached HTML as untrusted", () => {
  const dom = new JSDOM("<body></body>");
  try {
    const d = dom.window.document;
    d.body.append(
      renderArticleContent(
        '<p onclick="bad()">Safe text <strong>with emphasis</strong></p><script>bad()</script><iframe src="https://example.com"></iframe><img src="javascript:bad()" onerror="bad()"><a href="javascript:bad()">Bad link</a><a href="https://example.com">Good link</a>',
        d,
      ),
    );
    assert.equal(d.querySelector("p").textContent, "Safe text with emphasis");
    assert.equal(
      d.querySelectorAll("script,iframe,img,[onclick],[onerror]").length,
      0,
    );
    assert.equal(d.querySelector("a").hasAttribute("href"), false);
    assert.equal(d.querySelectorAll("a")[1].rel, "noopener noreferrer");
  } finally {
    dom.window.close();
  }
});
test("article endpoint rejects missing URL and unsupported methods without caching", async () => {
  const headers = {};
  let body;
  const res = { setHeader: (k, v) => (headers[k] = v), end: (v) => (body = v) };
  await handler({ method: "GET", url: "/api/article" }, res);
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(body).error, /address/);
  assert.equal(headers["Cache-Control"], "private, no-store");
  await handler({ method: "POST", url: "/api/article" }, res);
  assert.equal(res.statusCode, 405);
});
