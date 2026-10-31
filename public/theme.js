// Apply before the stylesheet paints to avoid a flash of the wrong theme.
(() => {
  const key = "little-reader:theme";
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  let preference;
  try {
    preference = localStorage.getItem(key);
  } catch {
    /* Storage can be disabled. */
  }
  if (!["light", "dark"].includes(preference)) preference = null;
  const glyph = (dark) =>
    dark
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>'
      : '<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5a8.5 8.5 0 1 0 9.5 9.5Z"/>';
  function apply() {
    const theme = preference || (system.matches ? "dark" : "light");
    const dark = theme === "dark";
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = dark
      ? "#191b20"
      : "#ffffff";
    const button = document.getElementById("theme-toggle");
    if (button) {
      const label = `Switch to ${dark ? "light" : "dark"} mode`;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${glyph(dark)}</svg>`;
    }
  }
  apply();
  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.getElementById("theme-toggle").addEventListener("click", () => {
      preference =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(key, preference);
      } catch {
        /* Keep the current-session choice. */
      }
      apply();
    });
  });
  system.addEventListener("change", () => {
    if (!preference) apply();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      preference = ["light", "dark"].includes(event.newValue)
        ? event.newValue
        : null;
      apply();
    }
  });
})();
