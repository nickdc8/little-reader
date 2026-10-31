import test from "node:test";
import assert from "node:assert/strict";
import {
  parseFeed,
  discoverFeed,
  isPublicAddress,
  validateTarget,
  webUrl,
  plain,
} from "../lib/feed.js";
import handler from "../api/feed.js";
test("RSS extracts content, relative links, enclosures and dates without HTML", () => {
  const f = parseFeed(
    `<rss version="2.0"><channel><title>Test &amp; notes</title><link>https://example.com</link><item><guid isPermaLink="false">one</guid><title>A &amp; B</title><link>/one</link><description><![CDATA[<p>Hello <b>reader</b></p><script>alert(1)</script>]]></description><pubDate>Fri, 30 Oct 2026 10:00:00 GMT</pubDate><enclosure url="https://example.com/a.jpg" type="image/jpeg"/></item></channel></rss>`,
    "https://example.com/feed",
  );
  assert.equal(f.title, "Test & notes");
  assert.equal(f.items[0].summary, "Hello reader");
  assert.equal(f.items[0].link, "https://example.com/one");
  assert.equal(f.items[0].image, "https://example.com/a.jpg");
  assert.equal(f.items[0].date, "2026-10-30T10:00:00.000Z");
});
test("Atom chooses alternate link rather than self link, supports content and author", () => {
  const f = parseFeed(
    `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><link rel="alternate" href="https://example.com"/><entry><id>tag:example,1</id><title>Article</title><link rel="self" href="https://example.com/api/1"/><link href="https://example.com/post/1"/><author><name>Ada</name></author><content type="html">&lt;p&gt;A useful post&lt;/p&gt;</content><updated>2026-10-30T12:00:00Z</updated></entry></feed>`,
    "https://example.com/feed",
  );
  assert.equal(f.items[0].link, "https://example.com/post/1");
  assert.equal(f.items[0].summary, "A useful post");
  assert.equal(f.items[0].author, "Ada");
});
test("RSS 1.0 accepts RDF items and missing dates", () => {
  const f = parseFeed(
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><channel><title>Old blog</title></channel><item><title>Still here</title><link>https://example.com/post</link></item></rdf:RDF>',
    "https://example.com/feed",
  );
  assert.equal(f.items.length, 1);
  assert.equal(f.items[0].date, null);
});
test("rejects malformed, HTML and entity declarations", () => {
  for (const input of [
    "<rss><channel>",
    "<html><body>Not a feed</body></html>",
    '<!DOCTYPE rss [<!ENTITY secret SYSTEM "file:///etc/passwd">]><rss/>',
  ])
    assert.throws(() => parseFeed(input, "https://example.com/feed"));
});
test("discovery accepts attribute order, single quotes and relative addresses", () => {
  assert.equal(
    discoverFeed(
      `<html><link href='/rss?a=1&amp;b=2' type='application/rss+xml' rel='alternate'></html>`,
      "https://example.com/page",
    ),
    "https://example.com/rss?a=1&b=2",
  );
  assert.equal(
    discoverFeed(
      '<link rel="stylesheet" href="/style.css">',
      "https://example.com",
    ),
    "",
  );
});
test("private IPv4, IPv6, mapped, metadata and special addresses are denied", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "172.16.0.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "224.0.0.1",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("1.1.1.1"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});
test("blocks unsafe schemes, credentials, ports, and loopback", async () => {
  for (const u of [
    "file:///etc/passwd",
    "http://user:password@example.com",
    "https://example.com:8000",
    "http://127.0.0.1",
    "http://[::1]",
    "http://2130706433",
  ])
    await assert.rejects(validateTarget(u));
  assert.equal(webUrl("javascript:alert(1)"), "");
  assert.equal(plain("<b>Hi</b><script>bad()</script>"), "Hi");
});
test("API returns structured errors and does not publicly cache private feeds", async () => {
  const headers = {};
  let body;
  const res = { setHeader: (k, v) => (headers[k] = v), end: (v) => (body = v) };
  await handler({ method: "GET", url: "/api/feed" }, res);
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(body).error, /address/);
  assert.equal(headers["Cache-Control"], "private, no-store");
  await handler({ method: "POST", url: "/api/feed" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(headers.Allow, "GET");
});
