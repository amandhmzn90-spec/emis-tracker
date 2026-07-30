/* ==========================================================
   export.js
   Exports the current progress (students + status) to an
   .xlsx file using SheetJS, downloaded straight to the browser.
   ========================================================== */

const ExportModule = (() => {

  function exportToExcel() {
    const students = Storage.getStudents();
    const schools = Storage.getSchools();
    const schoolStatus = {};
    schools.forEach((s) => (schoolStatus[s.schoolName] = s.emisAvailable));

    if (!students.length) {
      Utils.toast("Tidak ada data untuk diekspor.");
      return;
    }

    const rows = students.map((s) => ({
      "Nama Siswa": s.nama,
      "NIS": s.nis || "",
      "NISN": s.nisn,
      "Jenis Kelamin": s.jenisKelamin || "",
      "Sekolah Asal": s.asal_sekolah,
      "Kelas": s.kelas_paralel,
      "Jumlah Saudara": s.jumlahSaudara || "",
      "Anak Ke": s.anakKe || "",
      "No. KK": s.kk || "",
      "Nama Kepala Keluarga": s.kepalaKeluarga || "",
      "Nama Ayah": s.fatherName || "",
      "Status Ayah": s.fatherStatus || "",
      "NIK Ayah": s.fatherNik || "",
      "Tempat Lahir Ayah": s.fatherBirthplace || "",
      "Tanggal Lahir Ayah": s.fatherBirthdate || "",
      "Pendidikan Ayah": s.fatherEducation || "",
      "Pekerjaan Ayah": s.fatherJob || "",
      "No. HP Ayah": s.fatherPhone || "",
      "Nama Ibu": s.motherName || "",
      "Status Ibu": s.motherStatus || "",
      "NIK Ibu": s.motherNik || "",
      "Tempat Lahir Ibu": s.motherBirthplace || "",
      "Tanggal Lahir Ibu": s.motherBirthdate || "",
      "Pendidikan Ibu": s.motherEducation || "",
      "Pekerjaan Ibu": s.motherJob || "",
      "No. HP Ibu": s.motherPhone || "",
      "Alamat": s.address || "",
      "Estimasi Penghasilan Ortu (Kategori)": s.avgIncomeCategory || "",
      "Estimasi Penghasilan Ortu (Rentang)": s.avgIncomeRange || "",
      "Status Sekolah": schoolStatus[s.asal_sekolah] ? "Tersedia di EMIS" : "Belum Tersedia",
      "Status Siswa": s.emisStatus === "entered" ? "Sudah Masuk EMIS" : "Belum Masuk EMIS",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = new Array(30).fill({ wch: 20 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Progres EMIS");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `progres-emis-${stamp}.xlsx`);
    Utils.toast("File Excel berhasil diunduh.");
  }

  return { exportToExcel };
})();
