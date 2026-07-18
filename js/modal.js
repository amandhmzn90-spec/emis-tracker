/* ==========================================================
   modal.js
   Student detail modal: full profile view, printable layout.
   ========================================================== */

const ModalModule = (() => {

  function field(label, value) {
    return `
      <div class="detail-item">
        <span>${Utils.esc(label)}</span>
        <b>${value ? Utils.esc(value) : "—"}</b>
      </div>`;
  }

  function open(studentId) {
    const student = Storage.getStudents().find((s) => s.id === studentId);
    if (!student) return;

    document.getElementById("modalStudentName").textContent = student.nama;

    document.getElementById("modalBody").innerHTML = `
      <div class="detail-grid">

        <div class="detail-section">
          <h4>Data Siswa</h4>
        </div>
        ${field("Nama Siswa", student.nama)}
        ${field("NISN", student.nisn)}
        ${field("Sekolah Asal", student.asal_sekolah)}
        ${field("Kelas", student.kelas_paralel)}
        <div class="detail-item">
          <span>Status EMIS</span>
          <b>${student.emisStatus === "entered"
            ? '<span class="badge badge-success"><span class="badge-dot"></span>Sudah Masuk</span>'
            : '<span class="badge badge-warning"><span class="badge-dot"></span>Belum Masuk</span>'}</b>
        </div>

        <div class="detail-section">
          <h4>Data Orang Tua</h4>
        </div>
        ${field("Nama Ayah", student.fatherName)}
        ${field("NIK Ayah", student.fatherNik)}
        ${field("Nama Ibu", student.motherName)}
        ${field("NIK Ibu", student.motherNik)}

        <div class="detail-section">
          <h4>Data Keluarga & Kontak</h4>
        </div>
        ${field("No. Kartu Keluarga", student.kk)}
        ${field("No. Telepon", student.phone)}
        ${field("No. Telepon Wali", student.guardianPhone)}

        <div class="detail-section">
          <h4>Alamat</h4>
        </div>
        <div class="detail-item" style="grid-column:1/-1;">
          <span>Alamat Lengkap</span>
          <b>${student.address ? Utils.esc(student.address) : "—"}</b>
        </div>
      </div>
    `;

    document.getElementById("modalOverlay").classList.add("open");
  }

  function close() {
    document.getElementById("modalOverlay").classList.remove("open");
  }

  function bind() {
    document.getElementById("modalClose").addEventListener("click", close);
    document.getElementById("modalOverlay").addEventListener("click", (e) => {
      if (e.target.id === "modalOverlay") close();
    });
    document.getElementById("btnPrintModal").addEventListener("click", () => window.print());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  return { open, close, bind };
})();
