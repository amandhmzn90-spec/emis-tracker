/* ==========================================================
   dailycheck.js
   "Cek Harian EMIS" page: for every school not yet available
   in EMIS, surface one representative NISN the admin can copy
   straight into the EMIS search box to check status — plus a
   checkbox to tick off as reviewed, which auto-resets the next
   calendar day so the list works as a repeatable daily routine.
   ========================================================== */

const DailyCheckModule = (() => {

  let state = { query: "", type: "all", status: "all" };

  // Pick one representative NISN for a school: first valid NISN
  // alphabetically by student name.
  function pickSample(students) {
    const withNisn = students
      .filter((s) => s.nisn && s.nisn !== "-")
      .sort((a, b) => a.nama.localeCompare(b.nama));
    return withNisn[0] || null;
  }

  function computeRows() {
    const students = Storage.getStudents();
    const schools = Storage.getSchools();

    return schools
      .filter((sc) => !sc.emisAvailable)
      .map((sc) => {
        const list = students.filter((s) => s.asal_sekolah === sc.schoolName);
        const sample = pickSample(list);
        return {
          schoolName: sc.schoolName,
          schoolType: sc.schoolType || "Lainnya",
          nsm: sc.nsm || "",
          totalStudents: list.length,
          sampleNisn: sample ? sample.nisn : "",
          sampleName: sample ? sample.nama : "",
          checked: Storage.isCheckedToday(sc.schoolName),
        };
      })
      .sort((a, b) => {
        // Unchecked-today first (what still needs doing), then A-Z.
        if (a.checked !== b.checked) return a.checked ? 1 : -1;
        return a.schoolName.localeCompare(b.schoolName);
      });
  }

  function applyFilters(rows) {
    let out = rows;
    if (state.query) {
      const q = Utils.norm(state.query);
      out = out.filter((r) => Utils.norm(r.schoolName).includes(q));
    }
    if (state.type !== "all") out = out.filter((r) => r.schoolType === state.type);
    if (state.status === "checked") out = out.filter((r) => r.checked);
    if (state.status === "unchecked") out = out.filter((r) => !r.checked);
    return out;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for non-HTTPS / older browsers (e.g. opened via file://).
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function updateBadge() {
    const badge = document.getElementById("dailyCheckNavBadge");
    if (!badge) return;
    const remaining = computeRows().filter((r) => !r.checked).length;
    badge.textContent = remaining;
    badge.style.display = remaining > 0 ? "inline-flex" : "none";
  }

  function render() {
    const allRows = computeRows();
    const rows = applyFilters(allRows);

    const remaining = allRows.filter((r) => !r.checked).length;
    document.getElementById("dailyCheckRemaining").textContent = remaining;
    document.getElementById("dailyCheckTotal").textContent = allRows.length;
    updateBadge();

    const wrap = document.getElementById("dailyCheckList");

    if (!allRows.length) {
      wrap.innerHTML = `<div class="empty-state">🎉 Semua sekolah sudah berstatus "Tersedia di EMIS". Tidak ada yang perlu dicek.</div>`;
      return;
    }
    if (!rows.length) {
      wrap.innerHTML = `<div class="empty-state">Tidak ada sekolah yang cocok dengan pencarian/filter.</div>`;
      return;
    }

    wrap.innerHTML = rows.map((r) => `
      <div class="check-item ${r.checked ? "check-item-done" : ""}">
        <label class="switch-row" style="flex-shrink:0;">
          <span class="switch">
            <input type="checkbox" data-checkschool="${Utils.esc(r.schoolName)}" ${r.checked ? "checked" : ""}>
            <span class="slider"></span>
          </span>
        </label>
        <div class="check-info">
          <div class="queue-name">
            ${Utils.esc(r.schoolName)}
            <span class="badge-type badge-type-${r.schoolType.toLowerCase()}">${r.schoolType}</span>
          </div>
          <div class="queue-sub small muted">
            ${r.totalStudents} siswa terdaftar
            ${r.schoolType === "RA" ? (r.nsm ? ` &middot; NSM: ${Utils.esc(r.nsm)}` : ` &middot; <span style="color:var(--warning)">NSM belum diisi</span>`) : ""}
          </div>
        </div>
        <div class="check-nisn-wrap">
          ${r.sampleNisn
            ? `<code class="check-nisn">${Utils.esc(r.sampleNisn)}</code>
               <button class="btn btn-outline btn-sm" data-copy="${Utils.esc(r.sampleNisn)}" data-copyschool="${Utils.esc(r.schoolName)}">⧉ Salin NISN</button>`
            : `<span class="small muted">Belum ada NISN siswa</span>`}
        </div>
      </div>
    `).join("");

    wrap.querySelectorAll("input[data-checkschool]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const schoolName = e.target.getAttribute("data-checkschool");
        Storage.setCheckedToday(schoolName, e.target.checked);
        render();
      });
    });

    wrap.querySelectorAll("button[data-copy]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const nisn = e.currentTarget.getAttribute("data-copy");
        const schoolName = e.currentTarget.getAttribute("data-copyschool");
        copyText(nisn).then(() => {
          Utils.toast(`NISN "${nisn}" disalin (${schoolName}).`);
        });
      });
    });
  }

  function copyAll() {
    const rows = computeRows().filter((r) => r.sampleNisn);
    if (!rows.length) {
      Utils.toast("Tidak ada data untuk disalin.");
      return;
    }
    const text = rows.map((r) => `${r.schoolName}\t${r.sampleNisn}`).join("\n");
    copyText(text).then(() => {
      Utils.toast(`Berhasil menyalin ${rows.length} baris (sekolah + NISN).`);
    });
  }

  function bindToolbar() {
    document.getElementById("dailyCheckSearch").addEventListener("input", Utils.debounce((e) => {
      state.query = e.target.value;
      render();
    }, 150));
    document.getElementById("dailyCheckTypeFilter").addEventListener("change", (e) => {
      state.type = e.target.value;
      render();
    });
    document.getElementById("dailyCheckStatusFilter").addEventListener("change", (e) => {
      state.status = e.target.value;
      render();
    });
    document.getElementById("btnCopyAllDailyCheck").addEventListener("click", copyAll);
  }

  return { render, bindToolbar, updateBadge };
})();
