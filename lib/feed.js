import { XMLParser, XMLValidator } from "fast-xml-parser";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  processEntities: true,
  htmlEntities: true,
  parseTagValue: false,
  trimValues: true,
});
const array = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const value = (v) =>
  typeof v === "object" && v !== null
    ? String(v["#text"] ?? "")
    : String(v ?? "");
export const plain = (v) =>
  value(v)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function webUrl(input, base) {
  if (!value(input).trim()) return "";
  try {
    const u = new URL(value(input), base);
    return ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function isPublicAddress(address) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
export async function validateTarget(input) {
  const url = new URL(input);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new Error("Use a public http or https feed address.");
  const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ""), {
    all: true,
  });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new Error("Private network addresses cannot be fetched.");
  return { url, address: addresses[0] };
}
export async function download(
  input,
  redirects = 0,
  deadline = Date.now() + 20000,
) {
  if (redirects > 4 || Date.now() > deadline)
    throw new Error("The source took too long to respond.");
  const { url, address } = await validateTarget(input);
  return new Promise((resolve, reject) => {
    const req = (url.protocol === "https:" ? https : http).get(
      url,
      {
        agent: false,
        lookup: (_host, options, cb) =>
          options?.all
            ? cb(null, [address])
            : cb(null, address.address, address.family),
        headers: {
          "User-Agent": "LittleReader/0.1 (personal RSS reader)",
          Accept:
            "application/atom+xml, application/rss+xml, application/xml, text/xml, text/html;q=0.5",
          "Accept-Encoding": "identity",
        },
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          if (!res.headers.location)
            return reject(new Error("Invalid redirect."));
          resolve(
            download(
              new URL(res.headers.location, url).href,
              redirects + 1,
              deadline,
            ),
          );
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`The source returned HTTP ${res.statusCode}.`));
          return;
        }
        let size = 0;
        const chunks = [];
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) {
            res.destroy();
            reject(new Error("This feed exceeds the 2 MB limit."));
          } else chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            url: url.href,
          }),
        );
        res.on("error", reject);
      },
    );
    const timer = setTimeout(
      () => req.destroy(new Error("The source took too long to respond.")),
      Math.max(1, deadline - Date.now()),
    );
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
  });
}
function imageFrom(item, html, base) {
  const media = [
    ...array(item.content),
    ...array(item.thumbnail),
    ...array(item.enclosure),
  ].find(
    (p) =>
      p &&
      typeof p === "object" &&
      p["@_url"] &&
      (!p["@_type"] || p["@_type"].startsWith("image/")),
  );
  const src =
    media?.["@_url"] || html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
  return src ? webUrl(src, base) : "";
}
export function parseFeed(xml, sourceUrl) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("Feeds with document entities are not supported.");
  if (XMLValidator.validate(xml) !== true)
    throw new Error("The source did not return valid RSS or Atom XML.");
  const doc = parser.parse(xml),
    channel = doc.rss?.channel || doc.feed || doc.RDF;
  if (!channel)
    throw new Error("No RSS or Atom feed found. Try the direct feed address.");
  const atom = Boolean(doc.feed);
  const alternate = (links) =>
    array(links).find(
      (l) => l?.["@_href"] && (!l["@_rel"] || l["@_rel"] === "alternate"),
    )?.["@_href"];
  const site = atom ? alternate(channel.link) : value(channel.link);
  const items = array(atom ? channel.entry : channel.item || doc.RDF?.item)
    .slice(0, 100)
    .map((item) => {
      const link = webUrl(
        atom ? alternate(item.link) : value(item.link),
        sourceUrl,
      );
      const html = value(
        item.encoded || item.description || item.summary || item.content,
      );
      const date = value(
        item.pubDate || item.published || item.updated || item.date,
      );
      return {
        id: value(item.guid || item.id) || link || plain(item.title),
        title: plain(item.title) || "Untitled article",
        link,
        summary: plain(html).slice(0, 12000),
        image: imageFrom(item, html, link || sourceUrl),
        date: Number.isNaN(Date.parse(date))
          ? null
          : new Date(date).toISOString(),
        author: plain(item.creator || item.author?.name || item.author),
      };
    })
    .filter((i) => i.id);
  return {
    title: plain(channel.title) || new URL(sourceUrl).hostname,
    site: webUrl(site, sourceUrl),
    url: sourceUrl,
    items,
  };
}
export function discoverFeed(html, base) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const attrs = Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map((m) => [
        m[1].toLowerCase(),
        m[3],
      ]),
    );
    if (
      attrs.rel?.toLowerCase().split(/\s+/).includes("alternate") &&
      /application\/(rss|atom)\+xml/i.test(attrs.type || "")
    )
      return webUrl(attrs.href?.replace(/&amp;/g, "&"), base);
  }
  return "";
}
export async function loadFeed(url) {
  let result = await download(url);
  if (/<html\b|<!doctype html/i.test(result.body)) {
    const discovered = discoverFeed(result.body, result.url);
    if (!discovered)
      throw new Error(
        "No feed was advertised on this page. Try its direct RSS or Atom link.",
      );
    result = await download(discovered);
  }
  return parseFeed(result.body, result.url);
}
