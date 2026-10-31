const $ = (selector) => document.querySelector(selector);
const icons = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  all: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
  unread: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/>',
  folder: '<path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11H3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6.1a8 8 0 0 1 13 2M4.9 15.9a8 8 0 0 0 13 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  circlecheck: '<circle cx="12" cy="12" r="8"/><path d="m8 12 3 3 5-6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  compact: '<path d="M4 5h16M4 10h16M4 15h16M4 20h16"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3" fill="white"/><circle cx="16" cy="17" r="3" fill="white"/>',
  import: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  export: '<path d="M12 15V3m-4 4 4-4 4 4M4 16v5h16v-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  rss: '<circle cx="5" cy="19" r="1"/><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/>',
  backup: '<path d="M5 3h12l3 3v15H4V3zM8 3v6h8V3M8 21v-7h8v7"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.rss}</svg>`;
const esc = (str) =>
  String(str ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const uid = () => crypto.randomUUID();
const KEY = "little-reader:v1";
const safeUrl = (str) => {
  try {
    const u = new URL(str);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
};
const sampleFeed = (id, title, folder) => ({
  id,
  title,
  folder,
  url: "",
  site: "",
  error: "",
});
function sampleState() {
  const feeds = [
    sampleFeed("design", "The Reading Desk", "Design"),
    sampleFeed("web", "Open Web Notes", "Technology"),
    sampleFeed("garden", "The Weekend Garden", "Life & interests"),
    sampleFeed("food", "A Small Kitchen", "Life & interests"),
    sampleFeed("photo", "Field of View", "Design"),
  ];
  const stories = [
    [
      "web",
      "A small web worth coming back to",
      "There is still a place for personal websites, thoughtful writing and following your own curiosity.",
      "web",
    ],
    [
      "design",
      "The quiet usefulness of a well-made tool",
      "A closer look at the little decisions that make everyday software a pleasure to use.",
      "design",
    ],
    [
      "garden",
      "Leaving a little room for things to grow",
      "A few notes from the garden, and a reminder that not everything needs to happen quickly.",
      "garden",
    ],
    [
      "food",
      "Something good from a very simple kitchen",
      "One pan, a few seasonal ingredients, and time to sit down and enjoy the result.",
      "food",
    ],
    [
      "photo",
      "Learning to notice what is already there",
      "An afternoon walk with a camera, looking for light rather than a destination.",
      "photo",
    ],
    [
      "web",
      "Your subscriptions are a little map of your interests",
      "The pleasure of hearing from people you chose to follow, whenever they have something to say.",
      "",
    ],
    [
      "design",
      "Designing for the reader on the other side",
      "Typography, space, and the importance of knowing when to leave something alone.",
      "",
    ],
    [
      "garden",
      "Notes for the next season",
      "A notebook full of things to try, things to keep, and things to leave behind.",
      "",
    ],
  ];
  return {
    version: 1,
    demo: true,
    folders: ["Technology", "Design", "Life & interests"],
    feeds,
    items: stories.map(([feedId, title, summary, art], i) => ({
      id: `sample-${i}`,
      feedId,
      title,
      summary,
      link: "",
      image: art ? `/sample-${art}.svg` : "",
      date: new Date(Date.now() - i * 1000 * 60 * 95).toISOString(),
      read: false,
      starred: i === 4,
    })),
    compact: false,
  };
}
function validState(s) {
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.feeds) ||
    !Array.isArray(s.items) ||
    !Array.isArray(s.folders) ||
    s.feeds.length > 300 ||
    s.items.length > 30000
  )
    throw new Error("This is not a Little Reader backup.");
  if (
    s.folders.some((f) => typeof f !== "string" || f.length > 100) ||
    s.feeds.some(
      (f) =>
        typeof f.id !== "string" ||
        typeof f.title !== "string" ||
        typeof f.folder !== "string" ||
        (!s.demo && !safeUrl(f.url)),
    ) ||
    s.items.some(
      (i) =>
        typeof i.id !== "string" ||
        typeof i.feedId !== "string" ||
        typeof i.title !== "string" ||
        typeof i.summary !== "string",
    )
  )
    throw new Error("The backup contains invalid data.");
  return s;
}
let storageBroken = false;
let state;
try {
  const stored = localStorage.getItem(KEY);
  state = stored ? validState(JSON.parse(stored)) : sampleState();
} catch {
  state = sampleState();
  storageBroken = true;
}
let view = { kind: "all", id: "" },
  unreadOnly = false,
  search = "",
  collapsed = new Set(),
  busy = false,
  toastTimer;
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    storageBroken = true;
    notify(
      "Browser storage is full or unavailable. Export a backup to keep your changes.",
    );
  }
  $("#local-label").textContent = storageBroken
    ? "Changes are not being saved"
    : "Saved in this browser";
}
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 5000);
}
const feedById = (id) => state.feeds.find((f) => f.id === id);
const countFor = (predicate) =>
  state.items.filter((i) => !i.read && predicate(i)).length;
function row(label, name, kind, id, count, extra = "") {
  return `<button class="nav-row ${view.kind === kind && view.id === id ? "active" : ""} ${extra}" data-view="${kind}" data-id="${esc(id)}" ${view.kind === kind && view.id === id ? 'aria-current="page"' : ""}>${icon(name)}<span class="label">${esc(label)}</span>${count ? `<span class="count">${count.toLocaleString()}</span>` : ""}</button>`;
}
function renderNav() {
  $("#main-nav").innerHTML =
    row(
      "All articles",
      "all",
      "all",
      "",
      countFor(() => true),
    ) +
    row(
      "Unread",
      "unread",
      "unread",
      "",
      countFor(() => true),
    ) +
    row(
      "Starred",
      "star",
      "starred",
      "",
      state.items.filter((i) => i.starred).length,
    );
  let html = "";
  for (const folder of [
    ...state.folders,
    ...(state.feeds.some((f) => !f.folder) ? [""] : []),
  ]) {
    const feeds = state.feeds.filter((f) => f.folder === folder);
    html += `<div class="folder-row"><button class="icon-button" data-collapse="${esc(folder)}" aria-label="${collapsed.has(folder) ? "Expand" : "Collapse"} ${esc(folder || "Unfiled")}" aria-expanded="${!collapsed.has(folder)}">${icon(collapsed.has(folder) ? "chevron" : "down")}</button>${row(
      folder || "Unfiled",
      "folder",
      "folder",
      folder,
      countFor((i) => feeds.some((f) => f.id === i.feedId)),
    )}</div>`;
    if (!collapsed.has(folder))
      html += feeds
        .map(
          (f) =>
            `<button class="nav-row feed-child ${view.kind === "feed" && view.id === f.id ? "active" : ""}" data-view="feed" data-id="${esc(f.id)}" ${view.kind === "feed" && view.id === f.id ? 'aria-current="page"' : ""}><span class="source-mark" aria-hidden="true">${esc(f.title[0]?.toUpperCase())}</span><span class="label">${esc(f.title)}</span>${countFor((i) => i.feedId === f.id) ? `<span class="count">${countFor((i) => i.feedId === f.id)}</span>` : ""}</button>`,
        )
        .join("");
  }
  $("#feed-nav").innerHTML =
    html || '<p class="hint">Your feeds will live here</p>';
}
function contextItems() {
  return state.items.filter(
    (i) =>
      view.kind === "all" ||
      (view.kind === "unread" && !i.read) ||
      (view.kind === "starred" && i.starred) ||
      (view.kind === "feed" && i.feedId === view.id) ||
      (view.kind === "folder" && feedById(i.feedId)?.folder === view.id),
  );
}
function visibleItems() {
  const query = search.toLowerCase();
  return contextItems()
    .filter(
      (i) =>
        (!unreadOnly || !i.read) &&
        (!query ||
          `${i.title} ${i.summary} ${feedById(i.feedId)?.title}`
            .toLowerCase()
            .includes(query)),
    )
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
}
function relative(date) {
  if (!date) return "Undated";
  const ms = Date.now() - Date.parse(date);
  if (!Number.isFinite(ms)) return "Undated";
  if (ms < 3600000) return "Just now";
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
function dateGroup(date) {
  if (!date || !Number.isFinite(Date.parse(date))) return "Undated";
  const d = new Date(date),
    today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  today.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
function renderArticles() {
  const items = visibleItems();
  $("#view-title").textContent = search
    ? `Search results`
    : view.kind === "feed"
      ? feedById(view.id)?.title || "Feed"
      : view.kind === "folder"
        ? view.id || "Unfiled"
        : {
            all: "All articles",
            unread: "Unread",
            starred: "Starred articles",
          }[view.kind];
  const unread = items.filter((i) => !i.read).length;
  $("#view-description").textContent = search
    ? `${items.length} ${items.length === 1 ? "match" : "matches"} for “${search}”`
    : `${unread.toLocaleString()} unread ${unread === 1 ? "article" : "articles"} · ${state.feeds.length} ${state.feeds.length === 1 ? "source" : "sources"}${state.demo ? " · Sample collection" : ""}`;
  $("#edition").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  $("#sample-banner").hidden = !state.demo;
  $("#filter-all").setAttribute("aria-pressed", !unreadOnly);
  $("#filter-unread").setAttribute("aria-pressed", unreadOnly);
  $("#view-list").setAttribute("aria-pressed", !state.compact);
  $("#view-compact").setAttribute("aria-pressed", !!state.compact);
  $("#articles").classList.toggle("compact", !!state.compact);
  $("#mark-all").disabled = !unread;
  $("#refresh").disabled = busy || state.demo || !state.feeds.length;
  let previous = "";
  $("#articles").innerHTML = items
    .map((i) => {
      const feed = feedById(i.feedId),
        group = dateGroup(i.date);
      const heading =
        group !== previous ? `<h2 class="date-label">${esc(group)}</h2>` : "";
      previous = group;
      return `${heading}<article class="article ${i.read ? "read" : "unread"}" data-item="${esc(i.id)}"><div class="article-main"><div class="article-meta"><span class="source-mark" aria-hidden="true">${esc(feed?.title[0]?.toUpperCase() || "R")}</span><span class="source-name">${esc(feed?.title || "Source")}</span><span aria-hidden="true">·</span><time datetime="${esc(i.date || "")}" title="${esc(i.date ? new Date(i.date).toLocaleString() : "Undated")}">${esc(relative(i.date))}</time></div><button class="article-title" data-open="${esc(i.id)}">${esc(i.title)}</button><p class="article-summary">${esc(i.summary)}</p></div>${safeUrl(i.image) || (state.demo && /^\/sample-\w+\.svg$/.test(i.image)) ? `<img class="thumbnail" src="${esc(i.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}<div class="article-actions"><button class="icon-button ${i.starred ? "starred" : ""}" data-star="${esc(i.id)}" aria-label="${i.starred ? "Unstar" : "Star"} ${esc(i.title)}" aria-pressed="${!!i.starred}" title="${i.starred ? "Remove star" : "Star article"}">${icon("star")}</button><button class="icon-button read-toggle" data-read="${esc(i.id)}" aria-label="Mark ${esc(i.title)} ${i.read ? "unread" : "read"}" aria-pressed="${!!i.read}" title="Mark ${i.read ? "unread" : "read"}">${icon("circlecheck")}</button>${safeUrl(i.link) ? `<a class="icon-button external" href="${esc(safeUrl(i.link))}" target="_blank" rel="noopener noreferrer" data-external="${esc(i.id)}" aria-label="Open ${esc(i.title)} on its website" title="Open original">${icon("external")}</a>` : ""}</div></article>`;
    })
    .join("");
  if (!items.length)
    $("#articles").innerHTML =
      `<div class="empty">${icon(state.feeds.length ? "circlecheck" : "rss")}<h2>${search ? "Nothing found" : view.kind === "starred" ? "Keep the good ones" : state.feeds.length ? "A little breathing room" : "Make yourself at home"}</h2><p>${search ? "Try a different search or another folder." : view.kind === "starred" ? "Star an article and it will be waiting here." : state.feeds.length ? "No articles in this view. Refresh your feeds or choose All articles." : "Add a blog, a publication, or a newsletter feed. Start with something you enjoy reading."}</p>${!state.feeds.length ? '<button class="button primary" data-add>Add your first feed</button>' : ""}</div>`;
  $("#end-label").textContent = items.length
    ? `${items.length.toLocaleString()} ${items.length === 1 ? "article" : "articles"} · You’re up to date with this view`
    : "";
  const errors = state.feeds.filter((f) => f.error);
  $("#feed-errors").innerHTML = errors.length
    ? `<div class="error-list"><strong>${errors.length} ${errors.length === 1 ? "source needs" : "sources need"} attention</strong>${errors.map((f) => `<p>${esc(f.title)}: ${esc(f.error)}</p>`).join("")}</div>`
    : "";
}
function render() {
  renderNav();
  renderArticles();
}
function updateItem(id, change) {
  const item = state.items.find((i) => i.id === id);
  if (item) {
    Object.assign(item, change);
    persist();
    render();
  }
}
function openDialog(title, body, wide = false) {
  const dialog = $("#dialog");
  dialog.classList.toggle("reader-dialog", wide);
  $("#dialog-content").innerHTML =
    `<div class="dialog-heading"><h2>${esc(title)}</h2><button class="icon-button" data-close aria-label="Close dialog">${icon("close")}</button></div>${body}`;
  if (!dialog.open) dialog.showModal();
}
function closeDialog() {
  $("#dialog").close();
}
function folderOptions(selected = "") {
  return (
    `<option value="">Unfiled</option>` +
    state.folders
      .map(
        (f) =>
          `<option ${f === selected ? "selected" : ""} value="${esc(f)}">${esc(f)}</option>`,
      )
      .join("")
  );
}
function clearSamples() {
  if (state.demo) {
    state = {
      version: 1,
      demo: false,
      folders: [],
      feeds: [],
      items: [],
      compact: state.compact,
    };
    view = { kind: "all", id: "" };
  }
}
async function requestFeed(url) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 28000);
  try {
    const res = await fetch(`/api/feed?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to load feed.");
    return data;
  } catch (e) {
    throw new Error(
      e.name === "AbortError"
        ? "The source took too long to respond."
        : e.message,
    );
  } finally {
    clearTimeout(timer);
  }
}
function mergeFeed(feed, data) {
  feed.title = data.title;
  feed.site = data.site;
  feed.url = data.url;
  feed.error = "";
  feed.updated = new Date().toISOString();
  for (const raw of data.items) {
    const id = `${feed.id}:${raw.id}`;
    const existing = state.items.find((i) => i.id === id);
    if (existing) {
      Object.assign(existing, raw, { id, feedId: feed.id });
    } else
      state.items.push({
        ...raw,
        id,
        feedId: feed.id,
        read: false,
        starred: false,
      });
  }
  // Bound local storage without discarding starred articles or read/unread state for retained entries.
  const keep = new Set(
    state.items
      .filter((i) => i.feedId === feed.id && !i.starred)
      .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
      .slice(0, 200)
      .map((i) => i.id),
  );
  state.items = state.items.filter(
    (i) => i.feedId !== feed.id || i.starred || keep.has(i.id),
  );
}
function showAdd() {
  if (busy) {
    notify("Please wait for the current refresh to finish.");
    return;
  }
  openDialog(
    "Add a feed",
    `<p class="dialog-description">A good reading list starts with one good source</p><form id="add-form"><label for="feed-url">Website or feed address</label><input id="feed-url" name="url" type="url" placeholder="https://example.com/feed" required autocomplete="url"><p class="hint">RSS, Atom and Kill the Newsletter feeds all work</p><label for="feed-folder">Folder</label><select id="feed-folder" name="folder">${state.demo ? '<option value="">Unfiled</option>' : folderOptions(view.kind === "folder" ? view.id : "")}</select><label for="feed-new-folder">Or create a folder</label><input id="feed-new-folder" name="newFolder" type="text" maxlength="100" placeholder="e.g. Technology"><p id="form-error" class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button type="submit" class="button primary">Add feed</button></div></form>`,
  );
  $("#add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      button = form.querySelector("[type=submit]");
    let url = form.elements.url.value.trim();
    if (!safeUrl(url)) {
      $("#form-error").textContent = "Enter a complete http or https address.";
      return;
    }
    const folder =
      form.elements.newFolder.value.trim() || form.elements.folder.value;
    if (!state.demo && state.feeds.some((f) => f.url === url)) {
      $("#form-error").textContent = "You already follow this feed.";
      return;
    }
    button.disabled = true;
    button.textContent = "Finding feed…";
    try {
      const data = await requestFeed(url);
      if (!state.demo && state.feeds.some((f) => f.url === data.url))
        throw new Error("You already follow this feed.");
      clearSamples();
      if (folder && !state.folders.includes(folder)) state.folders.push(folder);
      const feed = {
        id: uid(),
        title: data.title,
        url: data.url,
        folder,
        site: data.site,
        error: "",
      };
      state.feeds.push(feed);
      mergeFeed(feed, data);
      view = { kind: "feed", id: feed.id };
      unreadOnly = false;
      persist();
      render();
      closeDialog();
      notify(`Added ${feed.title}`);
    } catch (error) {
      $("#form-error").textContent = error.message;
      button.disabled = false;
      button.textContent = "Add feed";
    }
  });
}
async function refresh() {
  if (busy || state.demo || !state.feeds.length) return;
  busy = true;
  $("#refresh").innerHTML = icon("refresh") + "Refreshing…";
  renderArticles();
  // Small batches are gentle on sources and avoid a request storm after importing OPML.
  const feeds = [...state.feeds];
  let failures = 0;
  for (let n = 0; n < feeds.length; n += 3) {
    await Promise.all(
      feeds.slice(n, n + 3).map(async (feed) => {
        try {
          mergeFeed(feed, await requestFeed(feed.url));
        } catch (error) {
          feed.error = error.message;
          failures++;
        }
      }),
    );
    persist();
    render();
  }
  busy = false;
  $("#refresh").innerHTML = icon("refresh") + "Refresh";
  render();
  notify(
    failures
      ? `Refreshed with ${failures} source ${failures === 1 ? "error" : "errors"}`
      : "Your feeds are up to date",
  );
}
function showArticle(id) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  const feed = feedById(item.feedId);
  updateItem(id, { read: true });
  openDialog(
    "Reading",
    `${state.demo ? '<span class="sample-note">Sample article</span>' : ""}<div class="reader-source">${esc(feed?.title || "Source")} · ${esc(relative(item.date))}</div><h3 class="reader-title">${esc(item.title)}</h3>${safeUrl(item.image) || (state.demo && /^\/sample-\w+\.svg$/.test(item.image)) ? `<img class="reader-image" src="${esc(item.image)}" alt="" referrerpolicy="no-referrer">` : ""}<div class="reader-body">${esc(item.summary || "This feed supplies a title only. Read the article on the publisher’s website.")}</div><div class="reader-bottom"><button class="button secondary ${item.starred ? "starred" : ""}" data-reader-star="${esc(id)}" aria-pressed="${!!item.starred}">${icon("star")}${item.starred ? "Starred" : "Star article"}</button>${safeUrl(item.link) ? `<a class="button primary" href="${esc(safeUrl(item.link))}" target="_blank" rel="noopener noreferrer">Read original ${icon("external")}</a>` : '<span class="hint">Sample text for trying the reader</span>'}</div>`,
    true,
  );
}
function createFolder() {
  if (busy) {
    notify("Please wait for the current refresh to finish.");
    return;
  }
  openDialog(
    "Create a folder",
    `<form id="folder-form"><label for="folder-name">Folder name</label><input type="text" id="folder-name" maxlength="100" required placeholder="e.g. Long reads"><p class="form-error" id="form-error" role="alert"></p><div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Create folder</button></div></form>`,
  );
  $("#folder-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#folder-name").value.trim();
    if (!name) return;
    if (state.folders.includes(name)) {
      $("#form-error").textContent = "That folder already exists.";
      return;
    }
    state.folders.push(name);
    persist();
    render();
    closeDialog();
    notify(`Created ${name}`);
  });
}
function showManage() {
  if (busy) {
    notify("Please wait for the current refresh to finish.");
    return;
  }
  openDialog(
    "Manage your sources",
    `${state.demo ? '<p class="hint">You’re editing the sample collection. Adding a real feed will replace it.</p>' : ""}<p class="dialog-description">Move feeds between folders, or remove what you no longer read</p>${state.feeds.map((f) => `<div class="manage-feed"><strong>${esc(f.title)}</strong><p class="feed-url">${esc(f.url || "Sample source")}</p><div class="manage-controls"><select data-move="${esc(f.id)}" aria-label="Folder for ${esc(f.title)}">${folderOptions(f.folder)}</select><button class="icon-button danger" data-remove="${esc(f.id)}" aria-label="Remove ${esc(f.title)}" title="Remove source">${icon("trash")}</button></div></div>`).join("") || '<p class="hint">No sources yet. Add your first feed to get started.</p>'}<h3>Folders</h3>${state.folders.map((f) => `<form class="folder-setting" data-rename="${esc(f)}"><input type="text" aria-label="Rename ${esc(f)}" value="${esc(f)}" maxlength="100" required><button class="icon-button" title="Save folder name" aria-label="Save ${esc(f)} folder name">${icon("check")}</button><button type="button" class="icon-button danger" data-delete-folder="${esc(f)}" title="Remove folder; keep feeds" aria-label="Remove ${esc(f)} folder and keep its feeds">${icon("trash")}</button></form>`).join("")}<p class="hint">Removing a folder moves its feeds to Unfiled</p>`,
  );
}
function downloadFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportOPML() {
  if (state.demo) {
    notify("Add a real feed before exporting subscriptions.");
    return;
  }
  const outline = (f) =>
    `<outline text="${esc(f.title)}" title="${esc(f.title)}" type="rss" xmlUrl="${esc(f.url)}" htmlUrl="${esc(f.site || "")}"/>`;
  const grouped = state.folders
    .map(
      (folder) =>
        `<outline text="${esc(folder)}" title="${esc(folder)}">${state.feeds
          .filter((f) => f.folder === folder)
          .map(outline)
          .join("")}</outline>`,
    )
    .join("");
  downloadFile(
    "little-reader.opml",
    `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>Little Reader subscriptions</title></head><body>${grouped}${state.feeds
      .filter((f) => !f.folder)
      .map(outline)
      .join("")}</body></opml>`,
    "text/xml",
  );
}
async function importFile(file) {
  if (busy) {
    notify("Please wait for the current refresh to finish.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    notify("Choose a file smaller than 10 MB.");
    return;
  }
  try {
    const text = await file.text();
    if (text.trim().startsWith("{")) {
      const incoming = validState(JSON.parse(text));
      openDialog(
        "Restore a backup",
        `<p>This replaces the collection in this browser with ${incoming.feeds.length} sources and ${incoming.items.length} articles from your backup.</p><div class="form-actions"><button class="button secondary" data-close>Cancel</button><button class="button primary" id="confirm-restore">Restore backup</button></div>`,
      );
      $("#confirm-restore").onclick = () => {
        state = incoming;
        view = { kind: "all", id: "" };
        search = "";
        $("#search").value = "";
        persist();
        render();
        closeDialog();
        notify("Backup restored");
      };
      return;
    }
    const xml = new DOMParser().parseFromString(text, "text/xml");
    if (xml.querySelector("parsererror") || !xml.querySelector("opml > body"))
      throw new Error(
        "Choose an OPML subscriptions file or a Little Reader JSON backup.",
      );
    const outlines = [
      ...xml.querySelectorAll("outline[xmlUrl], outline[xmlurl]"),
    ];
    const entries = outlines
      .map((node) => ({
        url: safeUrl(
          node.getAttribute("xmlUrl") || node.getAttribute("xmlurl"),
        ),
        title: node.getAttribute("title") || node.getAttribute("text"),
        folder:
          node.parentElement.tagName.toLowerCase() === "outline"
            ? (
                node.parentElement.getAttribute("text") ||
                node.parentElement.getAttribute("title") ||
                ""
              ).slice(0, 100)
            : "",
      }))
      .filter((e) => e.url);
    if (!entries.length)
      throw new Error("No valid feed addresses were found in this OPML file.");
    if (entries.length + (state.demo ? 0 : state.feeds.length) > 300)
      throw new Error(
        "This small reader supports up to 300 sources. Import a smaller collection.",
      );
    clearSamples();
    let added = 0;
    for (const entry of entries) {
      if (state.feeds.some((f) => f.url === entry.url)) continue;
      if (entry.folder && !state.folders.includes(entry.folder))
        state.folders.push(entry.folder);
      state.feeds.push({
        id: uid(),
        title: entry.title || new URL(entry.url).hostname,
        url: entry.url,
        folder: entry.folder,
        site: "",
        error: "",
      });
      added++;
    }
    view = { kind: "all", id: "" };
    persist();
    render();
    notify(`Imported ${added} sources. Fetching articles…`);
    await refresh();
  } catch (error) {
    notify(error.message);
  }
}
// One delegated handler keeps the UI usable as lists update.
document.addEventListener("click", (e) => {
  const button = e.target.closest("button,a");
  if (!button) return;
  if (button.hasAttribute("data-close")) closeDialog();
  if (button.hasAttribute("data-add")) showAdd();
  if (button.dataset.view) {
    view = { kind: button.dataset.view, id: button.dataset.id };
    search = "";
    $("#search").value = "";
    render();
    if (innerWidth <= 720) setSidebar(false);
  }
  if (button.hasAttribute("data-collapse")) {
    const folder = button.dataset.collapse;
    collapsed.has(folder) ? collapsed.delete(folder) : collapsed.add(folder);
    renderNav();
  }
  if (button.dataset.open) showArticle(button.dataset.open);
  if (button.dataset.star) {
    const item = state.items.find((i) => i.id === button.dataset.star);
    updateItem(item.id, { starred: !item.starred });
  }
  if (button.dataset.read) {
    const item = state.items.find((i) => i.id === button.dataset.read);
    updateItem(item.id, { read: !item.read });
  }
  if (button.dataset.external)
    updateItem(button.dataset.external, { read: true });
  if (button.dataset.readerStar) {
    const item = state.items.find((i) => i.id === button.dataset.readerStar);
    updateItem(item.id, { starred: !item.starred });
    button.classList.toggle("starred", item.starred);
    button.setAttribute("aria-pressed", !!item.starred);
    button.innerHTML =
      icon("star") + (item.starred ? "Starred" : "Star article");
  }
  if (button.dataset.remove) {
    const feed = feedById(button.dataset.remove);
    state.feeds = state.feeds.filter((f) => f.id !== feed.id);
    state.items = state.items.filter((i) => i.feedId !== feed.id);
    if (view.kind === "feed" && view.id === feed.id)
      view = { kind: "all", id: "" };
    persist();
    render();
    showManage();
    notify(`Removed ${feed.title}`);
  }
  if (button.hasAttribute("data-delete-folder")) {
    const name = button.dataset.deleteFolder;
    state.folders = state.folders.filter((f) => f !== name);
    state.feeds.forEach((f) => {
      if (f.folder === name) f.folder = "";
    });
    if (view.kind === "folder" && view.id === name)
      view = { kind: "folder", id: "" };
    persist();
    render();
    showManage();
  }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.move) {
    const feed = feedById(e.target.dataset.move);
    feed.folder = e.target.value;
    persist();
    render();
  }
});
document.addEventListener("submit", (e) => {
  if (e.target.hasAttribute("data-rename")) {
    e.preventDefault();
    const old = e.target.dataset.rename,
      name = e.target.querySelector("input").value.trim();
    if (!name) return;
    if (name !== old && state.folders.includes(name)) {
      notify("That folder already exists.");
      return;
    }
    state.folders = state.folders.map((f) => (f === old ? name : f));
    state.feeds.forEach((f) => {
      if (f.folder === old) f.folder = name;
    });
    if (view.kind === "folder" && view.id === old) view.id = name;
    persist();
    render();
    showManage();
  }
});
function setSidebar(open) {
  document.body.classList.toggle("sidebar-hidden", !open);
  $("#menu").setAttribute("aria-expanded", open);
  $("#scrim").hidden = !open;
}
$("#menu").innerHTML = icon("menu");
$("#search-icon").innerHTML = icon("search");
$("#new-folder").innerHTML = icon("plus");
$("#add-feed").innerHTML = icon("plus") + "Add a feed";
$("#manage").innerHTML = icon("settings") + "Manage sources";
$("#import").innerHTML = icon("import") + "Import subscriptions";
$("#export").innerHTML = icon("export") + "Export OPML";
$("#backup").innerHTML = icon("backup") + "Download backup";
$("#refresh").innerHTML = icon("refresh") + "Refresh";
$("#mark-all").innerHTML = icon("check") + "Mark all read";
$("#view-list").innerHTML = icon("list");
$("#view-compact").innerHTML = icon("compact");
$("#menu").onclick = () =>
  setSidebar(document.body.classList.contains("sidebar-hidden"));
$("#scrim").onclick = () => setSidebar(false);
$("#add-feed").onclick = showAdd;
$("#new-folder").onclick = createFolder;
$("#manage").onclick = showManage;
$("#refresh").onclick = refresh;
$("#filter-all").onclick = () => {
  unreadOnly = false;
  renderArticles();
};
$("#filter-unread").onclick = () => {
  unreadOnly = true;
  renderArticles();
};
$("#view-list").onclick = () => {
  state.compact = false;
  persist();
  renderArticles();
};
$("#view-compact").onclick = () => {
  state.compact = true;
  persist();
  renderArticles();
};
$("#mark-all").onclick = () => {
  const items = visibleItems();
  items.forEach((i) => (i.read = true));
  persist();
  render();
  notify("Articles in this view marked read");
};
$("#search").addEventListener("input", (e) => {
  search = e.target.value.trim();
  renderArticles();
});
$("#start-fresh").onclick = () => {
  clearSamples();
  persist();
  render();
  showAdd();
};
$("#import").onclick = () => $("#import-file").click();
$("#export").onclick = exportOPML;
$("#backup").onclick = () =>
  downloadFile(
    "little-reader-backup.json",
    JSON.stringify(state, null, 2),
    "application/json",
  );
$("#import-file").onchange = (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (file) importFile(file);
};
$("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeDialog();
  }
});
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !$("#dialog").open &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    $("#search").focus();
  }
  if (e.key === "Escape" && !$("#dialog").open && innerWidth <= 720)
    setSidebar(false);
});
$("#articles").addEventListener(
  "error",
  (e) => {
    if (e.target.tagName === "IMG") e.target.hidden = true;
  },
  true,
);
window.addEventListener("storage", (e) => {
  if (e.key === KEY && e.newValue && !busy) {
    try {
      state = validState(JSON.parse(e.newValue));
      render();
    } catch {
      notify("Another tab saved unreadable data. Export a backup of this tab.");
    }
  }
});
setSidebar(innerWidth > 720);
persist();
render();
