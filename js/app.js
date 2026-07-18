/* ==========================================================
   app.js
   Application bootstrap: connects to the shared Supabase
   database, page routing, sidebar nav, top bar actions
   (upload/export/search), and live sync across coworkers.
   ========================================================== */

(function () {

  const pages = ["dashboard", "schools", "queue", "dailycheck", "students", "classes"];

  function currentPageId() {
    const el = document.querySelector(".nav-item.active");
    return el ? el.getAttribute("data-page") : "dashboard";
  }

  function showPage(pageId) {
    pages.forEach((p) => {
      document.getElementById(`page-${p}`).classList.toggle("active", p === pageId);
    });
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-page") === pageId);
    });

    renderPage(pageId);

    // Close mobile sidebar after navigating.
    document.getElementById("sidebar").classList.remove("open");
  }

  // Renders a single page's content (used both on navigation and on
  // realtime sync so we don't disturb whichever page is currently open).
  function renderPage(pageId) {
    if (pageId === "dashboard") DashboardModule.render();
    if (pageId === "schools") SchoolModule.render();
    if (pageId === "queue") QueueModule.render();
    if (pageId === "dailycheck") DailyCheckModule.render();
    if (pageId === "students") StudentModule.render();
    if (pageId === "classes") ClassModule.render();
  }

  function bindNav() {
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => showPage(btn.getAttribute("data-page")));
    });
    document.getElementById("hamburger").addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("open");
    });
  }

  function bindTopbar() {
    const fileInput = document.getElementById("fileInput");
    document.getElementById("btnUpload").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      ExcelModule.handleFileUpload(file, () => {
        refreshAll();
      });
      fileInput.value = "";
    });

    document.getElementById("btnExport").addEventListener("click", () => {
      ExportModule.exportToExcel();
    });

    document.getElementById("btnResetData").addEventListener("click", async () => {
      if (!confirm("Reset SEMUA data di database bersama ini? Ini akan menghapus data untuk SEMUA orang yang memakai aplikasi ini (termasuk coworker), dan kembali ke data contoh awal. Perubahan yang belum diekspor akan hilang.")) return;
      Utils.toast("Menghapus data...");
      await Storage.clearAll();
      await ExcelModule.loadSeedIfEmpty();
      refreshAll();
      Utils.toast("Data telah direset untuk semua pengguna.");
    });

    // Global search: jumps to Students page filtered by the query.
    document.getElementById("globalSearch").addEventListener("input", Utils.debounce((e) => {
      const q = e.target.value;
      if (!q) return;
      showPage("students");
      StudentModule.setQuery(q);
    }, 250));
  }

  // Full refresh: used after structural data changes (Excel import, reset)
  // where drill-down views (open school/class) should also reset.
  function refreshAll() {
    DashboardModule.render();
    SchoolModule.reset();
    SchoolModule.render();
    QueueModule.render();
    DailyCheckModule.render();
    StudentModule.render();
    ClassModule.reset();
    ClassModule.render();
  }

  // Lighter refresh: used when data changes arrive from a coworker via
  // Realtime. Re-renders the dashboard + whichever page is currently open,
  // without resetting drill-down state (so it doesn't yank you out of a
  // school/class detail view you're actively looking at or editing).
  function softRefresh() {
    DashboardModule.render();
    renderPage(currentPageId());
    QueueModule.updateBadge();
    DailyCheckModule.updateBadge();
  }

  function showLoading(message) {
    const el = document.getElementById("appLoading");
    if (!el) return;
    el.innerHTML = `
      <div class="app-loading-inner">
        <div class="spinner"></div>
        <p>${Utils.esc(message)}</p>
      </div>`;
    el.style.display = "flex";
  }

  function showConnectError(err) {
    const el = document.getElementById("appLoading");
    if (!el) return;
    el.innerHTML = `
      <div class="app-loading-inner">
        <p style="color:var(--danger); font-weight:700; font-size:15px;">Gagal terhubung ke database.</p>
        <p class="small muted" style="max-width:320px; text-align:center;">${Utils.esc(err && err.message ? err.message : String(err))}</p>
        <button class="btn btn-primary" id="btnRetryConnect" style="margin-top:6px;">Coba Lagi</button>
      </div>`;
    el.style.display = "flex";
    document.getElementById("btnRetryConnect").addEventListener("click", () => location.reload());
  }

  function hideLoading() {
    const el = document.getElementById("appLoading");
    if (el) el.style.display = "none";
  }

  async function init() {
    showLoading("Menghubungkan ke database...");

    try {
      await Storage.connect();
    } catch (err) {
      showConnectError(err);
      return;
    }

    await ExcelModule.loadSeedIfEmpty();

    bindNav();
    bindTopbar();
    SchoolModule.bindToolbar();
    StudentModule.bindToolbar();
    ClassModule.bindToolbar();
    DailyCheckModule.bindToolbar();
    ModalModule.bind();
    QueueModule.updateBadge();
    DailyCheckModule.updateBadge();

    Storage.subscribeRealtime(() => {
      softRefresh();
    });

    hideLoading();
    showPage("dashboard");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
