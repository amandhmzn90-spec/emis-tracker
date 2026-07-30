/* ==========================================================
   income.js
   Implements the "PENGHASILAN ORANG TUA" business rules:
   estimates an income category (1-10) from a parent's job
   title (pekerjaan), for Kabupaten Kediri / private-school
   context, as specified in the rules document supplied by
   the school.

   Usage:
     IncomeRules.classify("Karyawan Swasta")
       -> { kategori: 6, range: "3.500.001 - 4.800.000", label: "Kategori 6" }
     IncomeRules.classify("")   // unknown / not provided
       -> { kategori: null, range: "", label: "Data pekerjaan tidak tersedia" }

   Notes on priority handling:
   The source document lists rules unordered, then gives an
   explicit priority list for the few jobs that can match more
   than one rule at once (e.g. "Dokter PNS" -> Dokter, not PNS).
   Rules not named in that explicit list are inserted here in
   the same descending-category spirit, grouped next to their
   closest documented neighbour. A generic "OWNER" keyword was
   added to the Pengusaha (Kategori 9) rule — not literally in
   the source keyword list — because the document's own example
   ("Owner Toko" -> hasil Pengusaha, bukan Pedagang) only works
   if a bare "OWNER" prefix is treated as business ownership.
   ========================================================== */

const IncomeRules = (() => {

  const RANGES = {
    1: "< 800.000",
    2: "800.000 - 1.200.000",
    3: "1.200.001 - 1.800.000",
    4: "1.800.001 - 2.500.000",
    5: "2.500.001 - 3.500.000",
    6: "3.500.001 - 4.800.000",
    7: "4.800.001 - 6.500.000",
    8: "6.500.001 - 10.000.000",
    9: "10.000.001 - 20.000.000",
    10: "> 20.000.000",
  };

  // Ordered highest-priority first. First matching rule wins.
  const RULES = [
    { kategori: 10, keywords: ["CEO", "KOMISARIS", "OWNER PABRIK", "PEMILIK PERUSAHAAN"] },
    { kategori: 9, keywords: ["PENGUSAHA", "DIREKTUR", "KONTRAKTOR", "OWNER"] },
    { kategori: 9, keywords: ["DOKTER"] },
    { kategori: 8, keywords: ["BUMN"] },
    { kategori: 8, keywords: ["APOTEKER"] },
    { kategori: 8, keywords: ["DOSEN"] },
    { kategori: 8, keywords: ["PROGRAMMER", "SOFTWARE ENGINEER", "GAME PROGRAMMER", "WEB DEVELOPER", "BACKEND", "FRONTEND", "IT"] },
    { kategori: 7, keywords: ["PNS", "ASN"] },
    { kategori: 7, keywords: ["TNI", "POLRI"] },
    { kategori: 7, keywords: ["BUMD"] },
    { kategori: 7, keywords: ["PERAWAT"] },
    { kategori: 7, keywords: ["BIDAN"] },
    { kategori: 7, keywords: ["KOMINFO", "PEMERINTAH DAERAH", "PEMDA"] },
    { kategori: 6, keywords: ["GURU"] },
    { kategori: 6, keywords: ["KARYAWAN SWASTA", "PEGAWAI SWASTA", "STAFF", "ADMIN"] },
    { kategori: 6, keywords: ["WIRASWASTA", "USAHA SENDIRI", "ENTREPRENEUR"] },
    { kategori: 5, keywords: ["PEDAGANG", "PENJUAL", "WARUNG", "TOKO"] },
    { kategori: 4, keywords: ["PETANI"] },
    { kategori: 4, keywords: ["NELAYAN"] },
    { kategori: 4, keywords: ["PETERNAK"] },
    { kategori: 4, keywords: ["SOPIR", "DRIVER", "GOJEK", "GRAB"] },
    { kategori: 4, keywords: ["HONORER"] },
    { kategori: 3, keywords: ["BURUH", "BURUH HARIAN", "BURUH LEPAS", "KULI"] },
    { kategori: 1, keywords: ["TIDAK BEKERJA", "PENGANGGUR", "BELUM BEKERJA"] },
    { kategori: 1, keywords: ["IBU RUMAH TANGGA", "IRT", "MENGURUS RUMAH TANGGA"] },
  ];

  // Normalize per the doc: uppercase, strip periods/commas, collapse spaces.
  function normalize(raw) {
    return String(raw ?? "")
      .toUpperCase()
      .replace(/[.,]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function rangeFor(kategori) {
    return RANGES[kategori] || "";
  }

  // Classifies a single job title. Returns kategori:null when the
  // job field itself is empty (no data to estimate from), rather
  // than silently guessing via the fallback rule.
  function classify(pekerjaanRaw) {
    const n = normalize(pekerjaanRaw);
    if (!n) return { kategori: null, range: "", label: "Data pekerjaan tidak tersedia" };

    for (const rule of RULES) {
      if (rule.keywords.some((kw) => n.includes(kw))) {
        return { kategori: rule.kategori, range: rangeFor(rule.kategori), label: `Kategori ${rule.kategori}` };
      }
    }

    // Fallback rule.
    const kategori = n.includes("USAHA") ? 6 : 5;
    return { kategori, range: rangeFor(kategori), label: `Kategori ${kategori}` };
  }

  // Combines father + mother estimates into one household figure.
  // Heuristic: the higher-earning known category represents the
  // household better than an arithmetic blend of two ordinal bands.
  function combine(fatherKategori, motherKategori) {
    const vals = [fatherKategori, motherKategori].filter((v) => v !== null && v !== undefined);
    if (!vals.length) return { kategori: null, range: "" };
    const kategori = Math.max(...vals);
    return { kategori, range: rangeFor(kategori) };
  }

  return { classify, combine, rangeFor, RANGES };
})();
