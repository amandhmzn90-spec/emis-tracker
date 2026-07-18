/* ==========================================================
   dashboard.js
   Renders the summary cards and the two dashboard charts.
   Charts are drawn with plain HTML/CSS (bar rows + donut) so
   no external charting library is required.
   ========================================================== */

const DashboardModule = (() => {

  function computeStats() {
    const students = Storage.getStudents();
    const schools = Storage.getSchools();

    const totalSchools = schools.length;
    const schoolsAvailable = schools.filter((s) => s.emisAvailable).length;
    const schoolsNotAvailable = totalSchools - schoolsAvailable;

    const totalStudents = students.length;
    const studentsEntered = students.filter((s) => s.emisStatus === "entered").length;
    const studentsNotEntered = totalStudents - studentsEntered;

    return {
      totalSchools, schoolsAvailable, schoolsNotAvailable,
      totalStudents, studentsEntered, studentsNotEntered,
      students, schools,
    };
  }

  function renderCards(stats) {
    const wrap = document.getElementById("dashboardCards");
    const cards = [
      { icon: "🏫", cls: "blue", label: "Total Sekolah (TK)", value: stats.totalSchools },
      { icon: "✅", cls: "green", label: "Sekolah Tersedia di EMIS", value: stats.schoolsAvailable },
      { icon: "⏳", cls: "amber", label: "Sekolah Belum Tersedia", value: stats.schoolsNotAvailable },
      { icon: "🧑‍🎓", cls: "blue", label: "Total Siswa", value: stats.totalStudents },
      { icon: "✅", cls: "green", label: "Siswa Sudah Masuk EMIS", value: stats.studentsEntered },
      { icon: "⏳", cls: "amber", label: "Siswa Belum Masuk EMIS", value: stats.studentsNotEntered },
    ];

    wrap.innerHTML = cards.map((c) => `
      <div class="stat-card">
        <div class="stat-icon ${c.cls}">${c.icon}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${Utils.esc(c.label)}</div>
      </div>
    `).join("");
  }

  function renderStudentsPerSchoolChart(stats) {
    const box = document.getElementById("chartStudentsPerSchool");
    const counts = {};
    stats.students.forEach((s) => {
      counts[s.asal_sekolah] = (counts[s.asal_sekolah] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (!entries.length) {
      box.innerHTML = `<div class="empty-state">Belum ada data siswa.</div>`;
      return;
    }
    const max = Math.max(...entries.map((e) => e[1]));

    box.innerHTML = entries.map(([name, count]) => `
      <div class="bar-row">
        <div class="bar-label" title="${Utils.esc(name)}">${Utils.esc(name)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
        <div class="bar-value">${count}</div>
      </div>
    `).join("");
  }

  function donutSvg(percent, color) {
    const r = 46, c = 2 * Math.PI * r;
    const offset = c - (percent / 100) * c;
    return `
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="#eef2f7" stroke-width="14"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="14"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"
          transform="rotate(-90 60 60)" style="transition:stroke-dashoffset .6s ease"/>
        <text x="60" y="66" text-anchor="middle" font-size="22" font-weight="800" fill="#0f172a">${Math.round(percent)}%</text>
      </svg>`;
  }

  function renderEmisProgressChart(stats) {
    const box = document.getElementById("chartEmisProgress");
    const schoolPct = stats.totalSchools ? (stats.schoolsAvailable / stats.totalSchools) * 100 : 0;
    const studentPct = stats.totalStudents ? (stats.studentsEntered / stats.totalStudents) * 100 : 0;

    box.innerHTML = `
      <div class="donut-wrap">
        <div style="text-align:center">
          ${donutSvg(schoolPct, "#2563eb")}
          <div class="small muted" style="margin-top:4px; font-weight:600;">Sekolah di EMIS</div>
        </div>
        <div style="text-align:center">
          ${donutSvg(studentPct, "#16a34a")}
          <div class="small muted" style="margin-top:4px; font-weight:600;">Siswa di EMIS</div>
        </div>
        <div class="legend">
          <div class="legend-item"><span class="legend-dot" style="background:#2563eb"></span> ${stats.schoolsAvailable}/${stats.totalSchools} sekolah sudah tersedia</div>
          <div class="legend-item"><span class="legend-dot" style="background:#16a34a"></span> ${stats.studentsEntered}/${stats.totalStudents} siswa sudah masuk</div>
        </div>
      </div>
    `;
  }

  function render() {
    const stats = computeStats();
    renderCards(stats);
    renderStudentsPerSchoolChart(stats);
    renderEmisProgressChart(stats);
  }

  return { render };
})();
