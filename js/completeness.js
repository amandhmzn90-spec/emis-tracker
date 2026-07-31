/* ==========================================================
   completeness.js
   "Kelengkapan Data" page.

   Flags students with missing NIK / parent data / NISN and
   sorts each case into one of three buckets, grouped by
   sekolah + kelas so the admin can message the right wali
   kelas directly:

   1. belum_kk   — Belum Mengumpulkan KK
        Both parents' name+NIK are completely blank — nothing
        from the family card appears to have been entered at
        all. (The student's own NIK is usually blank too in
        this case, but that's not required — parent data being
        fully blank is enough on its own.)

   2. kelewatan  — Kelewatan Input
        Some parent data DOES exist, but either one parent's
        name is still blank, or the student's own NIK is
        blank. Reads as a data-entry slip rather than a
        missing document.

   3. nisn       — NISN Bermasalah
        NISN is blank. This can mean either the KK hasn't
        been collected yet or the NISN genuinely can't be
        found, so it needs a human to check and mark which
        one applies — hence the "Tandai Final" buttons rather
        than an automatic verdict.

   Grouped strictly by kelas_paralel (not by sekolah) so every
   class shows up as a single list, even if the same class
   name is used at more than one sekolah — each student row
   still shows their sekolah asal so nothing gets mixed up.
   ========================================================== */

const CompletenessModule = (() => {

  const state = { query: "" };

  function isBlank(v) {
    const s = Utils.clean(v);
    return !s || s === "-";
  }

  // Returns the list of issue keys ("belum_kk" | "kelewatan" | "nisn")
  // that apply to this student. A student can have more than one
  // (e.g. NISN missing AND KK never collected).
  function classify(s) {
    const nikSiswaKosong = isBlank(s.siswaNik);
    const fatherFullyEmpty = isBlank(s.fatherName) && isBlank(s.fatherNik);
    const motherFullyEmpty = isBlank(s.motherName) && isBlank(s.motherNik);
    const ortuFullyEmpty = fatherFullyEmpty && motherFullyEmpty;
    const namaOrtuSalahSatuKosong = isBlank(s.fatherName) || isBlank(s.motherName);
    const nisnKosong = isBlank(s.nisn);

    const issues = [];
    if (ortuFullyEmpty) issues.push("belum_kk");
    if (!ortuFullyEmpty && (namaOrtuSalahSatuKosong || nikSiswaKosong)) issues.push("kelewatan");
    if (nisnKosong) issues.push("nisn");
    return issues;
  }

  // Short human note on what specifically is missing, shown next to a
  // "kelewatan" row so the admin/wali kelas knows exactly what to fix.
  function kelewatanDetail(s) {
    const parts = [];
    if (isBlank(s.fatherName)) parts.push("Nama Ayah kosong");
    if (isBlank(s.motherName)) parts.push("Nama Ibu kosong");
    if (isBlank(s.siswaNik)) parts.push("NIK Siswa kosong");
    return parts.join(", ");
  }

  function computeGroups() {
    const students = Storage.getStudents();
    const groups = {}; // key: kelas_paralel

    students.forEach((s) => {
      const issues = classify(s);
      if (!issues.length) return;

      const kelas = s.kelas_paralel || "-";
      const key = kelas;
      if (!groups[key]) {
        groups[key] = {
          kelas,
          sekolahSet: new Set(),
          belum_kk: [],
          kelewatan: [],
          nisn: [],
        };
      }
      groups[key].sekolahSet.add(s.asal_sekolah || "-");
      if (issues.includes("belum_kk")) groups[key].belum_kk.push(s);
      if (issues.includes("kelewatan")) groups[key].kelewatan.push(s);
      if (issues.includes("nisn")) groups[key].nisn.push(s);
    });

    return Object.values(groups)
      .map((g) => ({ ...g, sekolahList: Array.from(g.sekolahSet).sort() }))
      .sort((a, b) => a.kelas.localeCompare(b.kelas));
  }

  function filterGroups(groups) {
    const q = Utils.norm(state.query);
    if (!q) return groups;
    return groups.filter((g) =>
      Utils.norm(g.kelas).includes(q) || g.sekolahList.some((sk) => Utils.norm(sk).includes(q))
    );
  }

  function totals(groups) {
    const t = { belum_kk: 0, kelewatan: 0, nisn: 0, nisnFinal: 0 };
    groups.forEach((g) => {
      t.belum_kk += g.belum_kk.length;
      t.kelewatan += g.kelewatan.length;
      g.nisn.forEach((s) => (s.nisnIssueStatus ? t.nisnFinal++ : t.nisn++));
    });
    return t;
  }

  function nisnStatusBadge(s) {
    if (s.nisnIssueStatus === "not_found") {
      return `<span class="badge badge-danger"><span class="badge-dot"></span>Final: NISN Tidak Ditemukan</span>`;
    }
    if (s.nisnIssueStatus === "no_kk") {
      return `<span class="badge badge-warning"><span class="badge-dot"></span>Final: Belum Kumpul KK</span>`;
    }
    return `<span class="badge badge-warning"><span class="badge-dot"></span>Perlu Ditinjau</span>`;
  }

  function buildMessage(g) {
    const multiSchool = g.sekolahList.length > 1;
    const lines = [];
    lines.push(`*Kelas ${g.kelas}*${multiSchool ? "" : ` — ${g.sekolahList[0] || "-"}`}`);
    lines.push(`Info kelengkapan data EMIS siswa baru:`);

    const nameLine = (s) => multiSchool ? `${s.nama} (${s.asal_sekolah})` : s.nama;

    if (g.belum_kk.length) {
      lines.push(``, `📄 *Belum Mengumpulkan KK* (${g.belum_kk.length}):`);
      g.belum_kk.forEach((s, i) => lines.push(`${i + 1}. ${nameLine(s)}`));
    }
    if (g.kelewatan.length) {
      lines.push(``, `✏️ *Data Kelewatan Diinput* (${g.kelewatan.length}):`);
      g.kelewatan.forEach((s, i) => {
        const detail = kelewatanDetail(s);
        lines.push(`${i + 1}. ${nameLine(s)}${detail ? ` — ${detail}` : ""}`);
      });
    }
    if (g.nisn.length) {
      lines.push(``, `🔎 *NISN Bermasalah/Kosong* (${g.nisn.length}):`);
      g.nisn.forEach((s, i) => lines.push(`${i + 1}. ${nameLine(s)}`));
    }

    lines.push(``, `Mohon bantu konfirmasi ke wali murid ya, terima kasih 🙏`);
    return lines.join("\n");
  }

  function issueRow(s, opts = {}, showSchool) {
    return `
      <div class="issue-row">
        <div class="issue-row-main">
          <span class="issue-row-name">${Utils.esc(s.nama)}</span>
          <span class="cell-muted">NISN: ${Utils.esc(s.nisn)}</span>
          ${showSchool ? `<span class="cell-muted">• ${Utils.esc(s.asal_sekolah)}</span>` : ""}
          ${opts.detail ? `<span class="cell-muted">— ${Utils.esc(opts.detail)}</span>` : ""}
        </div>
        <div class="issue-row-actions">
          ${opts.nisnActions ? nisnActionsHtml(s) : ""}
          <button class="link-btn" data-detail="${s.id}">Lihat Detail →</button>
        </div>
      </div>`;
  }

  function nisnActionsHtml(s) {
    if (s.nisnIssueStatus) {
      return `
        ${nisnStatusBadge(s)}
        <button class="link-btn" data-nisn-reset="${s.id}">Ubah</button>`;
    }
    return `
      ${nisnStatusBadge(s)}
      <button class="btn btn-outline btn-sm" data-nisn-final="${s.id}" data-reason="not_found">Final: Tidak Ditemukan</button>
      <button class="btn btn-outline btn-sm" data-nisn-final="${s.id}" data-reason="no_kk">Final: Belum Kumpul KK</button>`;
  }

  function groupHtml(g) {
    const showSchool = g.sekolahList.length > 1;
    const sections = [];

    if (g.belum_kk.length) {
      sections.push(`
        <div class="issue-section">
          <div class="issue-section-head issue-danger">📄 Belum Mengumpulkan KK <span class="issue-count">${g.belum_kk.length}</span></div>
          ${g.belum_kk.map((s) => issueRow(s, {}, showSchool)).join("")}
        </div>`);
    }
    if (g.kelewatan.length) {
      sections.push(`
        <div class="issue-section">
          <div class="issue-section-head issue-warning">✏️ Kelewatan Input <span class="issue-count">${g.kelewatan.length}</span></div>
          ${g.kelewatan.map((s) => issueRow(s, { detail: kelewatanDetail(s) }, showSchool)).join("")}
        </div>`);
    }
    if (g.nisn.length) {
      sections.push(`
        <div class="issue-section">
          <div class="issue-section-head issue-info">🔎 NISN Bermasalah / Kosong <span class="issue-count">${g.nisn.length}</span></div>
          ${g.nisn.map((s) => issueRow(s, { nisnActions: true }, showSchool)).join("")}
        </div>`);
    }

    return `
      <div class="panel issue-group" style="margin-bottom:16px;">
        <div class="issue-group-head">
          <div>
            <div class="issue-group-title">Kelas ${Utils.esc(g.kelas)}</div>
            <div class="small muted">${Utils.esc(g.sekolahList.join(", "))}</div>
          </div>
          <button class="btn btn-outline btn-sm" data-copy-msg="1">⧉ Salin Pesan untuk Wali Kelas</button>
        </div>
        ${sections.join("")}
      </div>
    `;
  }

  function renderSummary(t) {
    const wrap = document.getElementById("completenessCards");
    const cards = [
      { icon: "📄", cls: "amber", label: "Belum Mengumpulkan KK", value: t.belum_kk },
      { icon: "✏️", cls: "blue", label: "Kelewatan Input", value: t.kelewatan },
      { icon: "🔎", cls: "amber", label: "NISN Perlu Ditinjau", value: t.nisn },
      { icon: "✅", cls: "green", label: "NISN Sudah Final", value: t.nisnFinal },
    ];
    wrap.innerHTML = cards.map((c) => `
      <div class="stat-card">
        <div class="stat-icon ${c.cls}">${c.icon}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${Utils.esc(c.label)}</div>
      </div>
    `).join("");
  }

  function updateBadge(t) {
    const badge = document.getElementById("completenessNavBadge");
    if (!badge) return;
    const totalsToUse = t || totals(computeGroups());
    const count = totalsToUse.belum_kk + totalsToUse.kelewatan + totalsToUse.nisn;
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-flex" : "none";
  }

  function render() {
    const allGroups = computeGroups();
    const t = totals(allGroups);
    renderSummary(t);
    updateBadge(t);

    const groups = filterGroups(allGroups);
    const wrap = document.getElementById("completenessList");

    if (!groups.length) {
      wrap.innerHTML = `<div class="empty-state">${allGroups.length ? "Tidak ada kelas yang cocok dengan pencarian." : "🎉 Semua data siswa lengkap — tidak ada KK, data ortu, atau NISN yang kosong."}</div>`;
      return;
    }

    wrap.innerHTML = groups.map((g) => groupHtml(g)).join("");

    wrap.querySelectorAll("button[data-detail]").forEach((btn) => {
      btn.addEventListener("click", (e) => ModalModule.open(e.currentTarget.getAttribute("data-detail")));
    });

    wrap.querySelectorAll("button[data-nisn-final]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-nisn-final");
        const reason = e.currentTarget.getAttribute("data-reason");
        Storage.updateStudent(id, { nisnIssueStatus: reason });
        Utils.toast(reason === "not_found" ? "Ditandai final: NISN tidak ditemukan." : "Ditandai final: belum kumpul KK.");
        render();
      });
    });

    wrap.querySelectorAll("button[data-nisn-reset]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-nisn-reset");
        Storage.updateStudent(id, { nisnIssueStatus: "" });
        render();
      });
    });

    wrap.querySelectorAll(".issue-group").forEach((groupEl, i) => {
      const btn = groupEl.querySelector("button[data-copy-msg]");
      if (!btn) return;
      btn.addEventListener("click", () => {
        Utils.copyText(buildMessage(groups[i])).then(() => {
          Utils.toast(`Pesan untuk Kelas ${groups[i].kelas} disalin — tinggal tempel ke WhatsApp.`);
        });
      });
    });
  }

  function bindToolbar() {
    document.getElementById("completenessSearch").addEventListener("input", Utils.debounce((e) => {
      state.query = e.target.value;
      render();
    }, 200));
  }

  return { render, bindToolbar, updateBadge };
})();
