/* ==========================================================
   utils.js
   Small shared helper functions used across the app.
   ========================================================== */

const Utils = (() => {

  // Generate a short unique id (used when a row has no usable id).
  function uid(prefix = "id") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Safely trim + normalize a value coming from Excel (numbers, null, etc).
  function clean(val) {
    if (val === null || val === undefined) return "";
    return String(val).trim();
  }

  // Escape text before injecting into innerHTML.
  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // Debounce helper for search inputs.
  function debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // Basic string normalizer for search/sort (lowercase, trimmed).
  function norm(str) {
    return clean(str).toLowerCase();
  }

  // Show a small toast notification.
  function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  return { uid, clean, esc, debounce, norm, toast };
})();
