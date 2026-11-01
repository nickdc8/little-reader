import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import sanitizeHtml from "sanitize-html";
import { download, webUrl } from "./feed.js";

export function extractArticle(html, url) {
  // JSDOM does not execute page scripts or load resources with these defaults.
  const dom = new JSDOM(html, { url });
  try {
    const document = dom.window.document;
    // Exclude discussion threads and subscription widgets from article extraction.
    for (const node of document.querySelectorAll(
      "#comments, .comments-area, #respond, nav, footer, form, iframe",
    ))
      node.remove();
    const article = new Readability(document, {
      maxElemsToParse: 30000,
    }).parse();
    if (!article?.content || article.textContent.trim().length < 100) {
      throw new Error(
        "Could not find readable article content. Try Read original.",
      );
    }
    const content = sanitizeHtml(article.content, {
      allowedTags: [
        "p",
        "br",
        "hr",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "blockquote",
        "pre",
        "code",
        "strong",
        "b",
        "em",
        "i",
        "s",
        "del",
        "sup",
        "sub",
        "a",
        "img",
        "figure",
        "figcaption",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "div",
        "span",
        "dl",
        "dt",
        "dd",
      ],
      allowedAttributes: {
        a: ["href", "title"],
        img: ["src", "alt", "title"],
        ol: ["start"],
        th: ["colspan", "rowspan"],
        td: ["colspan", "rowspan"],
      },
      allowedSchemes: ["http", "https"],
      allowProtocolRelative: false,
      transformTags: {
        a: (tagName, attrs) => ({
          tagName,
          attribs: { ...attrs, href: webUrl(attrs.href, url) },
        }),
        img: (tagName, attrs) => ({
          tagName,
          attribs: { ...attrs, src: webUrl(attrs.src, url) },
        }),
      },
    });
    if (content.length > 300000)
      throw new Error(
        "This article is too large for the reader. Try Read original.",
      );
    return {
      title: article.title,
      url,
      html: content,
      byline: article.byline || "",
    };
  } finally {
    dom.window.close();
  }
}
export async function loadArticle(url) {
  const result = await download(url);
  if (!/<html\b|<!doctype html|<article\b|<body\b/i.test(result.body))
    throw new Error("The source did not return an article page.");
  return extractArticle(result.body, result.url);
}
