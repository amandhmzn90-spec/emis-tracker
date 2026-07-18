/* ==========================================================
   school.js
   School Tracking page: groups students by asal_sekolah,
   shows entered/not-entered counts, lets the admin toggle each
   school's EMIS availability status, correct its type
   (TK/RA/KB), and — for RA schools, which sit under Kemenag
   instead of Dinas and need a Nomor Statistik Madrasah (NSM)
   to be entered in EMIS — record and keep that NSM so it never
   has to be looked up again.
   ========================================================== */

const SchoolModule = (() => {

  const TYPES = ["TK", "RA", "KB", "Lainnya"];

  let state = { query: "", sort: "az", type: "all" };
  let activeSchool = null;
  let detailState = { query: "", filter: "all" };

  function computeSchoolRows() {
    const students = Storage.getStudents();
    const schools = Storage.getSchools();

    return schools.map((school) => {
      const list = students.filter((s) => s.asal_sekolah === school.schoolName);
      const entered = list.filter((s) => s.emisStatus === "entered").length;
      return {
        schoolName: school.schoolName,
        emisAvailable: !!school.emisAvailable,
        schoolType: school.schoolType || "Lainnya",
        nsm: school.nsm || "",
        total: list.length,
        entered,
        notEntered: list.length - entered,
      };
    });
  }

  function applyFilters(rows) {
    let out = rows;
    if (state.query) {
      const q = Utils.norm(state.query);
      out = out.filter((r) => Utils.norm(r.schoolName).includes(q) || Utils.norm(r.nsm).includes(q));
    }
    if (state.type !== "all") {
      out = out.filter((r) => r.schoolType === state.type);
    }
    out = [...out].sort((a, b) =>
      state.sort === "az"
        ? a.schoolName.localeCompare(b.schoolName)
        : b.schoolName.localeCompare(a.schoolName)
    );
    return out;
  }

  function typeBadge(type) {
    return `<span class="badge-type badge-type-${type.toLowerCase()}">${Utils.esc(type)}</span>`;
  }

  function typeSelect(schoolName, type) {
    return `
      <select class="type-select" data-type-for="${Utils.esc(schoolName)}">
        ${TYPES.map((t) => `<option value="${t}" ${t === type ? "selected" : ""}>${t}</option>`).join("")}
      </select>`;
  }

  function nsmInput(row) {
    const isRA = row.schoolType === "RA";
    if (!isRA) {
      return `<input class="nsm-input" type="text" value="" placeholder="Tidak diperlukan" disabled>`;
    }
    const missing = !row.nsm;
    return `<input class="nsm-input ${missing ? "nsm-missing" : ""}" type="text"
      data-nsm-for="${Utils.esc(row.schoolName)}" value="${Utils.esc(row.nsm)}"
      placeholder="Isi NSM...">`;
  }

  function renderList() {
    const rows = applyFilters(computeSchoolRows());
    const body = document.getElementById("schoolTableBody");

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="8"><div class="empty-state">Tidak ada sekolah yang cocok.</div></td></tr>`;
      return;
    }

    body.innerHTML = rows.map((r) => `
      <tr>
        <td class="cell-strong"><button class="link-btn" data-open-school="${Utils.esc(r.schoolName)}">${Utils.esc(r.schoolName)}</button></td>
        <td>${typeSelect(r.schoolName, r.schoolType)}</td>
        <td>${nsmInput(r)}</td>
        <td>${r.total}</td>
        <td>${r.entered}</td>
        <td>${r.notEntered}</td>
        <td>
          ${r.emisAvailable
            ? `<span class="badge badge-success"><span class="badge-dot"></span>Tersedia di EMIS</span>`
            : `<span class="badge badge-warning"><span class="badge-dot"></span>Belum Tersedia</span>`}
        </td>
        <td>
          <label class="switch-row">
            <span class="switch">
              <input type="checkbox" data-school="${Utils.esc(r.schoolName)}" ${r.emisAvailable ? "checked" : ""}>
              <span class="slider"></span>
            </span>
            <span class="small muted">Toggle</span>
          </label>
        </td>
      </tr>
    `).join("");

    body.querySelectorAll("input[data-school]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const schoolName = e.target.getAttribute("data-school");
        Storage.updateSchool(schoolName, { emisAvailable: e.target.checked });
        Utils.toast(`Status "${schoolName}" diperbarui.`);
        renderList();
        DashboardModule.render();
        if (typeof QueueModule !== "undefined") QueueModule.updateBadge();
        if (typeof DailyCheckModule !== "undefined") DailyCheckModule.updateBadge();
      });
    });

    body.querySelectorAll("button[data-open-school]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        openDetail(e.target.getAttribute("data-open-school"));
      });
    });

    // Type dropdown: correcting TK/RA/KB re-renders (NSM field appears/disappears).
    body.querySelectorAll("select[data-type-for]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const schoolName = e.target.getAttribute("data-type-for");
        Storage.updateSchool(schoolName, { schoolType: e.target.value });
        Utils.toast(`Jenis "${schoolName}" diubah menjadi ${e.target.value}.`);
        renderList();
      });
    });

    // NSM text input: save quietly on blur, no re-render (keeps focus while typing).
    body.querySelectorAll("input[data-nsm-for]").forEach((input) => {
      input.addEventListener("blur", (e) => {
        const schoolName = e.target.getAttribute("data-nsm-for");
        const value = Utils.clean(e.target.value);
        Storage.updateSchool(schoolName, { nsm: value });
        e.target.classList.toggle("nsm-missing", !value);
        Utils.toast(`NSM "${schoolName}" disimpan.`);
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.target.blur();
      });
    });
  }

  // ---------- Detail (students in one school) ----------

  function openDetail(schoolName) {
    activeSchool = schoolName;
    detailState = { query: "", filter: "all" };
    document.getElementById("schoolDetailSearch").value = "";
    document.getElementById("schoolDetailFilter").value = "all";

    document.getElementById("schoolListWrap").style.display = "none";
    document.getElementById("schoolDetailWrap").style.display = "block";
    document.getElementById("btnBackToSchools").style.display = "inline-flex";
    document.getElementById("schoolsPageTitle").textContent = schoolName;
    document.getElementById("schoolsPageSubtitle").textContent = "Daftar siswa dari sekolah ini.";

    renderDetailInfo();
    renderDetail();
  }

  function renderDetailInfo() {
    const school = Storage.getSchools().find((s) => s.schoolName === activeSchool);
    if (!school) return;
    const type = school.schoolType || "Lainnya";
    const el = document.getElementById("schoolDetailInfo");

    el.innerHTML = `
      <div class="detail-info-row">
        <div class="detail-info-item">
          <span>Jenis</span>
          <b>${typeBadge(type)}</b>
        </div>
        <div class="detail-info-item">
          <span>Status EMIS</span>
          <b>${school.emisAvailable
            ? '<span class="badge badge-success"><span class="badge-dot"></span>Tersedia</span>'
            : '<span class="badge badge-warning"><span class="badge-dot"></span>Belum Tersedia</span>'}</b>
        </div>
        ${type === "RA" ? `
        <div class="detail-info-item" style="flex:1; min-width:200px;">
          <span>NSM (Nomor Statistik Madrasah)</span>
          <b><input class="nsm-input ${school.nsm ? "" : "nsm-missing"}" style="width:100%; max-width:260px;"
              type="text" id="schoolDetailNsm" value="${Utils.esc(school.nsm || "")}" placeholder="Isi NSM..."></b>
        </div>` : ""}
      </div>
    `;

    if (type === "RA") {
      const nsmField = document.getElementById("schoolDetailNsm");
      nsmField.addEventListener("blur", (e) => {
        const value = Utils.clean(e.target.value);
        Storage.updateSchool(activeSchool, { nsm: value });
        e.target.classList.toggle("nsm-missing", !value);
        Utils.toast("NSM disimpan.");
      });
      nsmField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.target.blur();
      });
    }
  }

  function closeDetail() {
    activeSchool = null;
    document.getElementById("schoolListWrap").style.display = "block";
    document.getElementById("schoolDetailWrap").style.display = "none";
    document.getElementById("btnBackToSchools").style.display = "none";
    document.getElementById("schoolsPageTitle").textContent = "Sekolah Asal (TK)";
    document.getElementById("schoolsPageSubtitle").textContent = "Kelola status ketersediaan sekolah di EMIS.";
  }

  function renderDetail() {
    if (!activeSchool) return;

    let rows = Storage.getStudents().filter((s) => s.asal_sekolah === activeSchool);

    if (detailState.query) {
      const q = Utils.norm(detailState.query);
      rows = rows.filter((s) => Utils.norm(s.nama).includes(q) || Utils.norm(s.nisn).includes(q));
    }
    if (detailState.filter === "entered") rows = rows.filter((s) => s.emisStatus === "entered");
    if (detailState.filter === "not_entered") rows = rows.filter((s) => s.emisStatus !== "entered");

    rows = [...rows].sort((a, b) => a.nama.localeCompare(b.nama));

    const body = document.getElementById("schoolDetailBody");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="5"><div class="empty-state">Tidak ada siswa yang cocok.</div></td></tr>`;
      return;
    }

    body.innerHTML = rows.map((s) => `
      <tr>
        <td class="cell-strong">${Utils.esc(s.nisn)}</td>
        <td>${Utils.esc(s.nama)}</td>
        <td class="cell-muted">${Utils.esc(s.kelas_paralel)}</td>
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

  // Renders whichever view (list or detail) is currently active.
  function render() {
    if (activeSchool) {
      renderDetailInfo();
      renderDetail();
    } else {
      renderList();
    }
  }

  function reset() {
    closeDetail();
  }

  function bindToolbar() {
    document.getElementById("schoolSearch").addEventListener("input", Utils.debounce((e) => {
      state.query = e.target.value;
      renderList();
    }, 150));
    document.getElementById("schoolSort").addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderList();
    });
    document.getElementById("schoolTypeFilter").addEventListener("change", (e) => {
      state.type = e.target.value;
      renderList();
    });

    document.getElementById("btnBackToSchools").addEventListener("click", closeDetail);
    document.getElementById("schoolDetailSearch").addEventListener("input", Utils.debounce((e) => {
      detailState.query = e.target.value;
      renderDetail();
    }, 150));
    document.getElementById("schoolDetailFilter").addEventListener("change", (e) => {
      detailState.filter = e.target.value;
      renderDetail();
    });
  }

  function setQuery(q) {
    state.query = q;
    document.getElementById("schoolSearch").value = q;
    renderList();
  }

  return { render, bindToolbar, setQuery, reset, openDetail };
})();
