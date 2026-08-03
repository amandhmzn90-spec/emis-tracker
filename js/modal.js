/* ==========================================================
   modal.js
   Student detail modal: full profile view, printable layout.
   ========================================================== */

const ModalModule = (() => {

  // Renders one label/value row. When `tracker` is passed, this field
  // counts toward the completeness summary: tracker.total is incremented,
  // and if the value is empty the label is pushed into tracker.missing.
  function field(label, value, tracker, opts = {}) {
    const empty = !value || !String(value).trim();
    if (tracker) {
      tracker.total++;
      if (empty) tracker.missing.push(label);
    }
    return `
      <div class="detail-item ${empty ? "detail-item-missing" : ""}" ${opts.fullWidth ? 'style="grid-column:1/-1;"' : ""}>
        <span>${Utils.esc(label)}</span>
        <b>${empty ? '<span class="badge badge-danger"><span class="badge-dot"></span>Kosong</span>' : Utils.esc(value)}</b>
      </div>`;
  }

  function incomeField(label, category, range) {
    const value = category
      ? `Kategori ${category} <span class="cell-muted">(${Utils.esc(range)})</span>`
      : '<span class="cell-muted">Belum bisa diestimasi (pekerjaan kosong)</span>';
    return `
      <div class="detail-item">
        <span>${Utils.esc(label)}</span>
        <b>${value}</b>
      </div>`;
  }

  function completenessSummary(tracker) {
    const { total, missing } = tracker;
    const filled = total - missing.length;
    const pct = total ? Math.round((filled / total) * 100) : 100;
    return `
      <div class="detail-section" style="grid-column:1/-1; margin-top:0;">
        <div class="completeness-summary">
          <div class="completeness-bar-wrap">
            <div class="completeness-bar-track"><div class="completeness-bar-fill" style="width:${pct}%"></div></div>
            <div class="completeness-bar-label"><b>${filled}/${total}</b> kolom data diri terisi (${pct}%)</div>
          </div>
          ${missing.length
            ? `<div class="completeness-missing"><b>Masih kosong:</b> ${missing.map((m) => `<span class="chip-missing">${Utils.esc(m)}</span>`).join("")}</div>`
            : `<div class="completeness-missing complete">✅ Semua kolom data diri sudah terisi.</div>`}
        </div>
      </div>`;
  }

  function open(studentId) {
    const student = Storage.getStudents().find((s) => s.id === studentId);
    if (!student) return;

    document.getElementById("modalStudentName").textContent = student.nama;

    // Fields tracked for the completeness summary. Sekolah/Kelas/Status
    // EMIS/estimated-income fields aren't included here — they're either
    // always populated by the import itself, or computed rather than
    // directly filled in.
    const tracker = { total: 0, missing: [] };

    const dataSiswa = `
        ${field("Nama Siswa", student.nama, tracker)}
        ${field("Nomor Induk Siswa (NIS)", student.nis, tracker)}
        ${field("NISN", student.nisn === "-" ? "" : student.nisn, tracker)}
        ${field("NIK Siswa", student.siswaNik, tracker)}
        ${field("Jenis Kelamin", student.jenisKelamin, tracker)}
        ${field("Tempat Lahir", student.siswaTempatLahir, tracker)}
        ${field("Tanggal Lahir", student.siswaTanggalLahir, tracker)}
        ${field("Sekolah Asal", student.asal_sekolah)}
        ${field("Kelas", student.kelas_paralel)}
        ${field("Jumlah Saudara", student.jumlahSaudara, tracker)}
        ${field("Anak Ke", student.anakKe, tracker)}
        <div class="detail-item">
          <span>Status EMIS</span>
          <b>${student.emisStatus === "entered"
            ? '<span class="badge badge-success"><span class="badge-dot"></span>Sudah Masuk</span>'
            : '<span class="badge badge-warning"><span class="badge-dot"></span>Belum Masuk</span>'}</b>
        </div>`;

    const dataKeluarga = `
        ${field("No. Kartu Keluarga (KK)", student.kk, tracker)}
        ${field("Nama Kepala Keluarga", student.kepalaKeluarga, tracker)}`;

    const dataAyah = `
        ${field("Nama Ayah", student.fatherName, tracker)}
        ${field("Status Ayah", student.fatherStatus, tracker)}
        ${field("NIK Ayah", student.fatherNik, tracker)}
        ${field("Tempat Lahir Ayah", student.fatherBirthplace, tracker)}
        ${field("Tanggal Lahir Ayah", student.fatherBirthdate, tracker)}
        ${field("Pendidikan Terakhir Ayah", student.fatherEducation, tracker)}
        ${field("Pekerjaan Ayah", student.fatherJob, tracker)}
        ${field("No. HP Ayah", student.fatherPhone, tracker)}
        ${incomeField("Estimasi Penghasilan Ayah", student.fatherIncomeCategory, student.fatherIncomeRange)}`;

    const dataIbu = `
        ${field("Nama Ibu", student.motherName, tracker)}
        ${field("Status Ibu", student.motherStatus, tracker)}
        ${field("NIK Ibu", student.motherNik, tracker)}
        ${field("Tempat Lahir Ibu", student.motherBirthplace, tracker)}
        ${field("Tanggal Lahir Ibu", student.motherBirthdate, tracker)}
        ${field("Pendidikan Terakhir Ibu", student.motherEducation, tracker)}
        ${field("Pekerjaan Ibu", student.motherJob, tracker)}
        ${field("No. HP Ibu", student.motherPhone, tracker)}
        ${incomeField("Estimasi Penghasilan Ibu", student.motherIncomeCategory, student.motherIncomeRange)}`;

    const kontakAlamat = `
        ${field("No. Telepon Wali", student.guardianPhone, tracker)}
        ${field("Alamat Lengkap", student.address, tracker, { fullWidth: true })}`;

    document.getElementById("modalBody").innerHTML = `
      <div class="detail-grid">

        ${completenessSummary(tracker)}

        <div class="detail-section">
          <h4>Data Siswa</h4>
        </div>
        ${dataSiswa}

        <div class="detail-section">
          <h4>Data Keluarga</h4>
        </div>
        ${dataKeluarga}

        <div class="detail-section">
          <h4>Data Ayah</h4>
        </div>
        ${dataAyah}

        <div class="detail-section">
          <h4>Data Ibu</h4>
        </div>
        ${dataIbu}

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
        ${kontakAlamat}
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
