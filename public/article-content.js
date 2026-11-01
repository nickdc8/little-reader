// Cached/imported content is untrusted too. Rebuild only safe reading elements,
// rather than inserting saved HTML directly into the live document.
export function renderArticleContent(html, document) {
  const allowed = new Set(
    "p br hr h1 h2 h3 h4 h5 h6 ul ol li blockquote pre code strong b em i s del sup sub a img figure figcaption table thead tbody tr th td div span dl dt dd".split(
      " ",
    ),
  );
  const template = document.createElement("template");
  template.innerHTML = String(html);
  let remaining = 30000;
  const link = (value) => {
    try {
      const u = new URL(value);
      return ["http:", "https:"].includes(u.protocol) &&
        !u.username &&
        !u.password
        ? u.href
        : "";
    } catch {
      return "";
    }
  };
  function clean(node, depth = 0) {
    if (--remaining < 0 || depth > 100) return document.createTextNode("");
    if (node.nodeType === 3) return document.createTextNode(node.textContent);
    const tag = node.nodeName.toLowerCase();
    if (!allowed.has(tag)) return document.createTextNode("");
    const output = document.createElement(tag);
    if (tag === "a") {
      const href = link(node.getAttribute("href"));
      if (href) {
        output.href = href;
        output.target = "_blank";
        output.rel = "noopener noreferrer";
      }
    }
    if (tag === "img") {
      const src = link(node.getAttribute("src"));
      if (!src) return document.createTextNode("");
      output.src = src;
      output.alt = node.getAttribute("alt") || "";
      output.loading = "lazy";
      output.referrerPolicy = "no-referrer";
    }
    for (const attribute of ["start", "colspan", "rowspan"]) {
      const value = node.getAttribute(attribute);
      if (value && /^\d{1,3}$/.test(value))
        output.setAttribute(attribute, value);
    }
    for (const child of node.childNodes) output.append(clean(child, depth + 1));
    return output;
  }
  const fragment = document.createDocumentFragment();
  for (const node of template.content.childNodes) fragment.append(clean(node));
  return fragment;
}
