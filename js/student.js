/* ==========================================================
   student.js
   Student list page: search, filter by EMIS status, sort A-Z,
   inline status toggle, and opens the detail modal.
   ========================================================== */

const StudentModule = (() => {

  let state = { query: "", filter: "all", sort: "az" };

  function applyFilters(students) {
    let out = students;

    if (state.query) {
      const q = Utils.norm(state.query);
      out = out.filter((s) =>
        Utils.norm(s.nama).includes(q) ||
        Utils.norm(s.nisn).includes(q) ||
        Utils.norm(s.asal_sekolah).includes(q)
      );
    }

    if (state.filter === "entered") out = out.filter((s) => s.emisStatus === "entered");
    if (state.filter === "not_entered") out = out.filter((s) => s.emisStatus !== "entered");

    out = [...out].sort((a, b) =>
      state.sort === "az" ? a.nama.localeCompare(b.nama) : b.nama.localeCompare(a.nama)
    );

    return out;
  }

  function rowHtml(s) {
    const entered = s.emisStatus === "entered";
    return `
      <tr>
        <td class="cell-strong">${Utils.esc(s.nisn)}</td>
        <td>${Utils.esc(s.nama)}</td>
        <td class="cell-muted">${Utils.esc(s.asal_sekolah)}</td>
        <td class="cell-muted">${Utils.esc(s.kelas_paralel)}</td>
        <td>
          <label class="switch-row">
            <span class="switch">
              <input type="checkbox" data-student="${s.id}" ${entered ? "checked" : ""}>
              <span class="slider"></span>
            </span>
            ${entered
              ? `<span class="badge badge-success"><span class="badge-dot"></span>Sudah Masuk</span>`
              : `<span class="badge badge-warning"><span class="badge-dot"></span>Belum Masuk</span>`}
          </label>
        </td>
        <td><button class="link-btn" data-detail="${s.id}">Lihat Detail →</button></td>
      </tr>
    `;
  }

  function render() {
    const students = Storage.getStudents();
    const rows = applyFilters(students);
    const body = document.getElementById("studentTableBody");

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6"><div class="empty-state">Tidak ada siswa yang cocok dengan pencarian/filter.</div></td></tr>`;
      return;
    }

    body.innerHTML = rows.map(rowHtml).join("");

    body.querySelectorAll("input[data-student]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const id = e.target.getAttribute("data-student");
        const status = e.target.checked ? "entered" : "not_entered";
        Storage.updateStudent(id, { emisStatus: status });
        Utils.toast("Status siswa diperbarui.");
        render();
        DashboardModule.render();
        if (typeof SchoolModule !== "undefined") SchoolModule.render();
        if (typeof QueueModule !== "undefined") QueueModule.updateBadge();
      });
    });

    body.querySelectorAll("button[data-detail]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        ModalModule.open(e.target.getAttribute("data-detail"));
      });
    });
  }

  function bindToolbar() {
    document.getElementById("studentSearch").addEventListener("input", Utils.debounce((e) => {
      state.query = e.target.value;
      render();
    }, 150));
    document.getElementById("studentFilter").addEventListener("change", (e) => {
      state.filter = e.target.value;
      render();
    });
    document.getElementById("studentSort").addEventListener("change", (e) => {
      state.sort = e.target.value;
      render();
    });
  }

  function setQuery(q) {
    state.query = q;
    document.getElementById("studentSearch").value = q;
    render();
  }

  return { render, bindToolbar, setQuery };
})();
