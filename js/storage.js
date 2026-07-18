/* ==========================================================
   storage.js
   Data layer backed by Supabase (shared cloud Postgres) instead
   of LocalStorage, so every coworker looking at the app sees the
   same data. An in-memory cache mirrors the DB so the rest of
   the app can keep reading data synchronously (getStudents(),
   getSchools(), ...) exactly like before; writes update the
   cache immediately and push to Supabase in the background.
   Requires js/supabase-client.js (defines the `SB` client) to be
   loaded first.
   ========================================================== */

const Storage = (() => {

  const TABLES = {
    students: "students",
    schools: "schools",
    dailyChecks: "daily_checks",
  };

  // In-memory mirror of the database.
  let cache = { students: [], schools: [], dailyChecks: {} };
  let realtimeChannel = null;

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  // ---------- row <-> model mapping (DB is snake_case, app is camelCase) ----------
  function rowToStudent(r) {
    return {
      id: r.id,
      nama: r.nama,
      nisn: r.nisn,
      asal_sekolah: r.asal_sekolah,
      kelas_paralel: r.kelas_paralel,
      emisStatus: r.emis_status,
      fatherName: r.father_name || "",
      fatherNik: r.father_nik || "",
      motherName: r.mother_name || "",
      motherNik: r.mother_nik || "",
      kk: r.kk || "",
      phone: r.phone || "",
      guardianPhone: r.guardian_phone || "",
      address: r.address || "",
    };
  }
  function studentToRow(s) {
    return {
      id: s.id,
      nama: s.nama,
      nisn: s.nisn,
      asal_sekolah: s.asal_sekolah,
      kelas_paralel: s.kelas_paralel,
      emis_status: s.emisStatus,
      father_name: s.fatherName || "",
      father_nik: s.fatherNik || "",
      mother_name: s.motherName || "",
      mother_nik: s.motherNik || "",
      kk: s.kk || "",
      phone: s.phone || "",
      guardian_phone: s.guardianPhone || "",
      address: s.address || "",
    };
  }
  function rowToSchool(r) {
    return {
      schoolName: r.school_name,
      emisAvailable: !!r.emis_available,
      schoolType: r.school_type || "Lainnya",
      nsm: r.nsm || "",
    };
  }
  function schoolToRow(s) {
    return {
      school_name: s.schoolName,
      emis_available: !!s.emisAvailable,
      school_type: s.schoolType || "Lainnya",
      nsm: s.nsm || "",
    };
  }

  function notifyError(action, error) {
    console.error(action, error);
    Utils.toast(`Gagal ${action}. Cek koneksi internet.`);
  }

  // ---------- CONNECT ----------
  // Fetches the current state of every table into the cache. Must be
  // awaited once before the rest of the app starts reading/rendering.
  async function connect() {
    const [studentsRes, schoolsRes, dailyRes] = await Promise.all([
      SB.from(TABLES.students).select("*"),
      SB.from(TABLES.schools).select("*"),
      SB.from(TABLES.dailyChecks).select("*").eq("check_date", todayStr()),
    ]);
    if (studentsRes.error) throw studentsRes.error;
    if (schoolsRes.error) throw schoolsRes.error;
    if (dailyRes.error) throw dailyRes.error;

    cache.students = (studentsRes.data || []).map(rowToStudent);
    cache.schools = (schoolsRes.data || []).map(rowToSchool);
    cache.dailyChecks = {};
    (dailyRes.data || []).forEach((r) => { cache.dailyChecks[r.school_name] = r.check_date; });
  }

  // Subscribes to live changes from Supabase Realtime so every open tab
  // (including a coworker's) picks up edits made elsewhere. `onChange` is
  // called after the cache has been refreshed for the affected table.
  function subscribeRealtime(onChange) {
    if (realtimeChannel) return;
    realtimeChannel = SB.channel("emis-tracker-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLES.students }, async () => {
        const { data, error } = await SB.from(TABLES.students).select("*");
        if (!error) cache.students = (data || []).map(rowToStudent);
        onChange();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: TABLES.schools }, async () => {
        const { data, error } = await SB.from(TABLES.schools).select("*");
        if (!error) cache.schools = (data || []).map(rowToSchool);
        onChange();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: TABLES.dailyChecks }, async () => {
        const { data, error } = await SB.from(TABLES.dailyChecks).select("*").eq("check_date", todayStr());
        if (!error) {
          cache.dailyChecks = {};
          (data || []).forEach((r) => { cache.dailyChecks[r.school_name] = r.check_date; });
        }
        onChange();
      })
      .subscribe();
  }

  // ---------- STUDENTS ----------
  function getStudents() {
    return cache.students;
  }

  // Updates the cache immediately (so the UI feels instant) and pushes the
  // full updated row to Supabase in the background.
  function updateStudent(id, patch) {
    const idx = cache.students.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    cache.students[idx] = { ...cache.students[idx], ...patch };

    SB.from(TABLES.students).update(studentToRow(cache.students[idx])).eq("id", id)
      .then(({ error }) => { if (error) notifyError("menyimpan data siswa", error); });

    return true;
  }

  // ---------- SCHOOLS ----------
  function getSchools() {
    return cache.schools;
  }

  function updateSchool(schoolName, patch) {
    const idx = cache.schools.findIndex((s) => s.schoolName === schoolName);
    if (idx === -1) return false;
    cache.schools[idx] = { ...cache.schools[idx], ...patch };

    SB.from(TABLES.schools).update(schoolToRow(cache.schools[idx])).eq("school_name", schoolName)
      .then(({ error }) => { if (error) notifyError("menyimpan data sekolah", error); });

    return true;
  }

  // ---------- DAILY CHECK ----------
  // A school counts as "checked" only if it has a daily_checks row dated
  // today, so the list naturally resets every new day.
  function isCheckedToday(schoolName) {
    return !!cache.dailyChecks[schoolName];
  }

  function setCheckedToday(schoolName, checked) {
    if (checked) {
      cache.dailyChecks[schoolName] = todayStr();
      SB.from(TABLES.dailyChecks)
        .upsert({ school_name: schoolName, check_date: todayStr() }, { onConflict: "school_name,check_date" })
        .then(({ error }) => { if (error) notifyError("menyimpan status cek harian", error); });
    } else {
      delete cache.dailyChecks[schoolName];
      SB.from(TABLES.dailyChecks).delete()
        .eq("school_name", schoolName).eq("check_date", todayStr())
        .then(({ error }) => { if (error) notifyError("menghapus status cek harian", error); });
    }
    return true;
  }

  // ---------- BULK (Excel import / reset) ----------
  function isEmpty() {
    return cache.students.length === 0;
  }

  async function insertChunked(table, rows, size = 500) {
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size);
      if (!chunk.length) continue;
      const { error } = await SB.from(table).insert(chunk);
      if (error) notifyError(`menyimpan data ke ${table}`, error);
    }
  }

  // Fully replaces the students & schools tables (used on Excel import and
  // on Reset Data) — deletes everything currently stored, then inserts the
  // new set, and updates the cache to match.
  async function replaceAll(students, schools) {
    cache.students = students;
    cache.schools = schools;

    await Promise.all([
      SB.from(TABLES.students).delete().not("id", "is", null),
      SB.from(TABLES.schools).delete().not("school_name", "is", null),
    ]);

    await Promise.all([
      insertChunked(TABLES.students, students.map(studentToRow)),
      insertChunked(TABLES.schools, schools.map(schoolToRow)),
    ]);
  }

  // Wipes ALL shared data (students, schools, daily-check history) —
  // affects every coworker using the same database.
  async function clearAll() {
    cache = { students: [], schools: [], dailyChecks: {} };
    await Promise.all([
      SB.from(TABLES.students).delete().not("id", "is", null),
      SB.from(TABLES.schools).delete().not("school_name", "is", null),
      SB.from(TABLES.dailyChecks).delete().not("school_name", "is", null),
    ]);
  }

  return {
    connect, subscribeRealtime,
    getStudents, updateStudent,
    getSchools, updateSchool,
    isCheckedToday, setCheckedToday, todayStr,
    isEmpty, replaceAll, clearAll,
  };
})();
