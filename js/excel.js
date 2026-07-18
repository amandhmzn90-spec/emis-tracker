/* ==========================================================
   excel.js
   Handles turning raw Excel rows (from SheetJS or the bundled
   seed file) into the app's student/school data model, and
   wires up the "Upload Excel" button.
   ========================================================== */

const ExcelModule = (() => {

  // Column names expected in the source workbook (EMIS export format).
  // Every uploaded file must use these exact header names.
  const COL = {
    nama: "siswadaftar1_nama",
    nisn: "siswa_nisn",
    asalSekolah: "sekolahasal_nama",
    kelasNama: "kelas_nama",
    kelasParalel: "kelaspararel_nama",
    kk: "kartukeluarga_nomor",
    ayahNama: "ayah_nama",
    ayahNik: "ayah_nik",
    ayahTelepon: "ayah_telepon",
    ibuNama: "ibu_nama",
    ibuNik: "ibu_nik",
    waliTelepon: "wali_telepon",
    alamat: "siswa_alamat",
    domisili: "domisili_alamat",
    regId: "siswabarudaftar_id",
  };

  // Build the human-readable class label, e.g. "KELAS 1 - 3".
  function buildKelasParalel(row) {
    const a = Utils.clean(row[COL.kelasNama]);
    const b = Utils.clean(row[COL.kelasParalel]);
    if (a && b) return `${a} - ${b}`;
    return a || b || "Belum Ada Kelas";
  }

  // Map one raw Excel row into the student data model.
  function mapRowToStudent(row, existingStatusMap) {
    const nama = Utils.clean(row[COL.nama]);
    if (!nama) return null; // skip blank rows

    const nisn = Utils.clean(row[COL.nisn]);
    const asalSekolah = Utils.clean(row[COL.asalSekolah]) || "Belum Diketahui";
    const kelasParalel = buildKelasParalel(row);
    const regId = Utils.clean(row[COL.regId]);
    const id = regId || nisn || Utils.uid("siswa");

    // Preserve a previously-set EMIS status if this student already existed
    // (e.g. re-uploading a file shouldn't wipe admin toggles).
    const prevStatus = existingStatusMap && existingStatusMap[id];

    return {
      id,
      nama,
      nisn: nisn || "-",
      asal_sekolah: asalSekolah,
      kelas_paralel: kelasParalel,
      emisStatus: prevStatus || "not_entered", // "entered" | "not_entered"
      fatherName: Utils.clean(row[COL.ayahNama]),
      fatherNik: Utils.clean(row[COL.ayahNik]),
      motherName: Utils.clean(row[COL.ibuNama]),
      motherNik: Utils.clean(row[COL.ibuNik]),
      kk: Utils.clean(row[COL.kk]),
      phone: Utils.clean(row[COL.ayahTelepon]),
      guardianPhone: Utils.clean(row[COL.waliTelepon]),
      address: Utils.clean(row[COL.alamat]) || Utils.clean(row[COL.domisili]),
    };
  }

  // Detect the administrative type of a school from its name.
  // TK (Taman Kanak-kanak) sits under Dinas Pendidikan, RA (Raudhatul Athfal)
  // sits under Kemenag and requires an NSM (Nomor Statistik Madrasah) for
  // EMIS entry, KB (Kelompok Bermain) is treated separately too.
  function detectSchoolType(name) {
    const n = Utils.clean(name).toUpperCase();
    if (/^RA\b/.test(n) || n.includes("RAUDHATUL")) return "RA";
    if (/^KB\b/.test(n)) return "KB";
    if (/^TK\b/.test(n)) return "TK";
    return "Lainnya";
  }

  // Build school list from students, merging with any existing status,
  // school type override, and NSM value so re-uploading never wipes them.
  function buildSchoolsFromStudents(students, existingSchools) {
    const prevMap = {};
    (existingSchools || []).forEach((s) => (prevMap[s.schoolName] = s));

    const names = [...new Set(students.map((s) => s.asal_sekolah))];
    return names.map((schoolName) => {
      const prev = prevMap[schoolName];
      return {
        schoolName,
        emisAvailable: prev ? !!prev.emisAvailable : false,
        schoolType: (prev && prev.schoolType) || detectSchoolType(schoolName),
        nsm: (prev && prev.nsm) || "",
      };
    });
  }

  // Turn an array of raw rows into { students, schools } and persist.
  async function ingestRows(rows) {
    const existingStudents = Storage.getStudents();
    const existingSchools = Storage.getSchools();
    const statusMap = {};
    existingStudents.forEach((s) => (statusMap[s.id] = s.emisStatus));

    const students = rows
      .map((r) => mapRowToStudent(r, statusMap))
      .filter(Boolean);

    const schools = buildSchoolsFromStudents(students, existingSchools);

    await Storage.replaceAll(students, schools);
    return { students, schools };
  }

  // Load the very first time the app runs (shared database empty) using
  // the bundled sample dataset in js/seed-data.js (SEED_DATA global).
  async function loadSeedIfEmpty() {
    if (!Storage.isEmpty()) return false;
    try {
      const rows = typeof SEED_DATA !== "undefined" ? SEED_DATA : [];
      if (!rows.length) throw new Error("SEED_DATA is empty");
      await ingestRows(rows);
      return true;
    } catch (e) {
      console.warn("No seed data loaded:", e.message);
      return false;
    }
  }

  // Handle a user-selected .xlsx/.xls file via SheetJS.
  function handleFileUpload(file, onDone) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rows.length) {
          Utils.toast("File kosong atau format tidak sesuai.");
          return;
        }

        Utils.toast("Menyimpan ke database...");
        await ingestRows(rows);
        Utils.toast(`Berhasil impor ${rows.length} baris data.`);
        if (onDone) onDone();
      } catch (err) {
        console.error(err);
        Utils.toast("Gagal membaca atau menyimpan file Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return { ingestRows, loadSeedIfEmpty, handleFileUpload, COL };
})();
