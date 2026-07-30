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

  function incomeField(label, category, range) {
    const value = category
      ? `Kategori ${category} <span class="cell-muted">(${Utils.esc(range)})</span>`
      : "—";
    return `
      <div class="detail-item">
        <span>${Utils.esc(label)}</span>
        <b>${value}</b>
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
        ${field("Nomor Induk Siswa (NIS)", student.nis)}
        ${field("NISN", student.nisn)}
        ${field("Jenis Kelamin", student.jenisKelamin)}
        ${field("Sekolah Asal", student.asal_sekolah)}
        ${field("Kelas", student.kelas_paralel)}
        ${field("Jumlah Saudara", student.jumlahSaudara)}
        ${field("Anak Ke", student.anakKe)}
        <div class="detail-item">
          <span>Status EMIS</span>
          <b>${student.emisStatus === "entered"
            ? '<span class="badge badge-success"><span class="badge-dot"></span>Sudah Masuk</span>'
            : '<span class="badge badge-warning"><span class="badge-dot"></span>Belum Masuk</span>'}</b>
        </div>

        <div class="detail-section">
          <h4>Data Keluarga</h4>
        </div>
        ${field("No. Kartu Keluarga (KK)", student.kk)}
        ${field("Nama Kepala Keluarga", student.kepalaKeluarga)}

        <div class="detail-section">
          <h4>Data Ayah</h4>
        </div>
        ${field("Nama Ayah", student.fatherName)}
        ${field("Status Ayah", student.fatherStatus)}
        ${field("NIK Ayah", student.fatherNik)}
        ${field("Tempat Lahir Ayah", student.fatherBirthplace)}
        ${field("Tanggal Lahir Ayah", student.fatherBirthdate)}
        ${field("Pendidikan Terakhir Ayah", student.fatherEducation)}
        ${field("Pekerjaan Ayah", student.fatherJob)}
        ${field("No. HP Ayah", student.fatherPhone)}
        ${incomeField("Estimasi Penghasilan Ayah", student.fatherIncomeCategory, student.fatherIncomeRange)}

        <div class="detail-section">
          <h4>Data Ibu</h4>
        </div>
        ${field("Nama Ibu", student.motherName)}
        ${field("Status Ibu", student.motherStatus)}
        ${field("NIK Ibu", student.motherNik)}
        ${field("Tempat Lahir Ibu", student.motherBirthplace)}
        ${field("Tanggal Lahir Ibu", student.motherBirthdate)}
        ${field("Pendidikan Terakhir Ibu", student.motherEducation)}
        ${field("Pekerjaan Ibu", student.motherJob)}
        ${field("No. HP Ibu", student.motherPhone)}
        ${incomeField("Estimasi Penghasilan Ibu", student.motherIncomeCategory, student.motherIncomeRange)}

        <div class="detail-section">
          <h4>Rata-Rata Penghasilan Orang Tua (Estimasi)</h4>
        </div>
        ${incomeField("Rata-Rata Penghasilan Ortu", student.avgIncomeCategory, student.avgIncomeRange)}
        <div class="detail-item">
          <span>Catatan</span>
          <b class="cell-muted" style="font-weight:500;">Estimasi otomatis dari pekerjaan, mengacu standar Kabupaten Kediri. Tetap periksa manual sebelum input ke EMIS.</b>
        </div>

        <div class="detail-section">
          <h4>Kontak & Alamat</h4>
        </div>
        ${field("No. Telepon Wali", student.guardianPhone)}
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
