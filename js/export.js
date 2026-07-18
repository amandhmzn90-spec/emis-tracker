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
      "NISN": s.nisn,
      "Sekolah Asal": s.asal_sekolah,
      "Kelas": s.kelas_paralel,
      "Status Sekolah": schoolStatus[s.asal_sekolah] ? "Tersedia di EMIS" : "Belum Tersedia",
      "Status Siswa": s.emisStatus === "entered" ? "Sudah Masuk EMIS" : "Belum Masuk EMIS",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 26 }, { wch: 16 }, { wch: 30 }, { wch: 16 }, { wch: 20 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Progres EMIS");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `progres-emis-${stamp}.xlsx`);
    Utils.toast("File Excel berhasil diunduh.");
  }

  return { exportToExcel };
})();
