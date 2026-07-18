/* ==========================================================
   queue.js
   "Antrian Input" page: a task-list of schools whose EMIS
   status is already "Tersedia" but that still have students
   not yet entered — i.e. what the admin should work on next,
   sorted by how many students are still pending.
   ========================================================== */

const QueueModule = (() => {

  function computeQueue() {
    const students = Storage.getStudents();
    const schools = Storage.getSchools();

    return schools
      .map((school) => {
        const list = students.filter((s) => s.asal_sekolah === school.schoolName);
        const entered = list.filter((s) => s.emisStatus === "entered").length;
        return {
          schoolName: school.schoolName,
          schoolType: school.schoolType || "Lainnya",
          nsm: school.nsm || "",
          emisAvailable: !!school.emisAvailable,
          total: list.length,
          entered,
          notEntered: list.length - entered,
        };
      })
      .filter((r) => r.emisAvailable && r.notEntered > 0)
      .sort((a, b) => b.notEntered - a.notEntered);
  }

  function updateBadge() {
    const count = computeQueue().length;
    const badge = document.getElementById("queueNavBadge");
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-flex" : "none";
  }

  function render() {
    const rows = computeQueue();
    document.getElementById("queueCount").textContent = rows.length;
    updateBadge();

    const wrap = document.getElementById("queueList");

    if (!rows.length) {
      wrap.innerHTML = `<div class="empty-state">🎉 Tidak ada antrian. Semua sekolah yang sudah tersedia di EMIS sudah selesai diinput semua siswanya.</div>`;
      return;
    }

    wrap.innerHTML = rows.map((r, i) => {
      const pct = r.total ? Math.round((r.entered / r.total) * 100) : 0;
      const nsmNote = r.schoolType === "RA"
        ? (r.nsm ? `NSM: ${Utils.esc(r.nsm)}` : `<span style="color:var(--warning)">NSM belum diisi</span>`)
        : "";

      return `
        <div class="queue-item">
          <div class="queue-rank">${i + 1}</div>
          <div class="queue-info">
            <div class="queue-name">
              ${Utils.esc(r.schoolName)}
              <span class="badge-type badge-type-${r.schoolType.toLowerCase()}">${r.schoolType}</span>
            </div>
            <div class="queue-sub small muted">
              ${nsmNote ? nsmNote + " &middot; " : ""}${r.entered}/${r.total} siswa sudah masuk EMIS
            </div>
            <div class="bar-track" style="margin-top:7px;">
              <div class="bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="queue-count">
            <b>${r.notEntered}</b>
            <span>Belum Diinput</span>
          </div>
          <button class="btn btn-primary btn-sm" data-open="${Utils.esc(r.schoolName)}">Lanjut Input →</button>
        </div>
      `;
    }).join("");

    wrap.querySelectorAll("button[data-open]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const schoolName = e.target.getAttribute("data-open");
        // Switch to the Schools page, then jump straight into that
        // school's detail view so the admin can continue entering.
        document.querySelector('.nav-item[data-page="schools"]').click();
        SchoolModule.openDetail(schoolName);
      });
    });
  }

  return { render, updateBadge };
})();
