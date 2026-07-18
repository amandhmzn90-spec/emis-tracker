/* ==========================================================
   class.js
   Classes page: grid of class cards (grouped by kelas_paralel)
   with a click-through detail view listing students A-Z.
   ========================================================== */

const ClassModule = (() => {

  let activeClass = null;
  let detailQuery = "";

  function computeClassRows() {
    const students = Storage.getStudents();
    const groups = {};
    students.forEach((s) => {
      const key = s.kelas_paralel || "Belum Ada Kelas";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    return Object.entries(groups)
      .map(([className, list]) => {
        const entered = list.filter((s) => s.emisStatus === "entered").length;
        return { className, total: list.length, entered, notEntered: list.length - entered };
      })
      .sort((a, b) => a.className.localeCompare(b.className));
  }

  function renderGrid() {
    const grid = document.getElementById("classGrid");
    const rows = computeClassRows();

    if (!rows.length) {
      grid.innerHTML = `<div class="empty-state">Belum ada data kelas.</div>`;
      return;
    }

    grid.innerHTML = rows.map((r) => `
      <div class="stat-card class-card" data-class="${Utils.esc(r.className)}">
        <div class="stat-icon blue">📚</div>
        <div class="class-card-title">${Utils.esc(r.className)}</div>
        <div class="class-mini-stats">
          <div class="mini-stat"><b>${r.total}</b><span>Total</span></div>
          <div class="mini-stat" style="color:var(--success)"><b>${r.entered}</b><span>Masuk</span></div>
          <div class="mini-stat" style="color:#b45309"><b>${r.notEntered}</b><span>Belum</span></div>
        </div>
      </div>
    `).join("");

    grid.querySelectorAll(".class-card").forEach((card) => {
      card.addEventListener("click", () => openDetail(card.getAttribute("data-class")));
    });
  }

  function openDetail(className) {
    activeClass = className;
    detailQuery = "";
    document.getElementById("classDetailSearch").value = "";
    document.getElementById("classGrid").style.display = "none";
    document.getElementById("classDetailWrap").style.display = "block";
    document.getElementById("btnBackToClasses").style.display = "inline-flex";
    renderDetail();
  }

  function closeDetail() {
    activeClass = null;
    document.getElementById("classGrid").style.display = "grid";
    document.getElementById("classDetailWrap").style.display = "none";
    document.getElementById("btnBackToClasses").style.display = "none";
  }

  function renderDetail() {
    if (!activeClass) return;
    const students = Storage.getStudents()
      .filter((s) => (s.kelas_paralel || "Belum Ada Kelas") === activeClass);

    let rows = students;
    if (detailQuery) {
      const q = Utils.norm(detailQuery);
      rows = rows.filter((s) =>
        Utils.norm(s.nama).includes(q) ||
        Utils.norm(s.nisn).includes(q) ||
        Utils.norm(s.asal_sekolah).includes(q)
      );
    }
    rows = [...rows].sort((a, b) => a.nama.localeCompare(b.nama));

    const body = document.getElementById("classDetailBody");
    document.querySelector("#page-classes .page-head h1").textContent = `Kelas ${activeClass}`;

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="5"><div class="empty-state">Tidak ada siswa di kelas ini.</div></td></tr>`;
      return;
    }

    body.innerHTML = rows.map((s) => `
      <tr>
        <td class="cell-strong">${Utils.esc(s.nisn)}</td>
        <td>${Utils.esc(s.nama)}</td>
        <td class="cell-muted">${Utils.esc(s.asal_sekolah)}</td>
        <td>${s.emisStatus === "entered"
          ? `<span class="badge badge-success"><span class="badge-dot"></span>Sudah Masuk</span>`
          : `<span class="badge badge-warning"><span class="badge-dot"></span>Belum Masuk</span>`}</td>
        <td><button class="link-btn" data-detail="${s.id}">Lihat Detail →</button></td>
      </tr>
    `).join("");

    body.querySelectorAll("button[data-detail]").forEach((btn) => {
      btn.addEventListener("click", (e) => ModalModule.open(e.target.getAttribute("data-detail")));
    });
  }

  function bindToolbar() {
    document.getElementById("btnBackToClasses").addEventListener("click", closeDetail);
    document.getElementById("classDetailSearch").addEventListener("input", Utils.debounce((e) => {
      detailQuery = e.target.value;
      renderDetail();
    }, 150));
  }

  // Called whenever the Classes page becomes active, or after data changes.
  function render() {
    if (activeClass) {
      renderDetail();
    } else {
      renderGrid();
    }
  }

  function reset() {
    closeDetail();
    document.querySelector("#page-classes .page-head h1").textContent = "Kelas";
  }

  return { render, bindToolbar, reset };
})();
