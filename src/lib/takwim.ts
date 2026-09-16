/**
 * Menormalkan baris takwim daripada Buku Pengurusan menjadi senarai yang
 * boleh disusun.
 *
 * BENTUK MENTAH dari buku (lajur seperti dicetak):
 *
 *   MINGGU | TARIKH HARI      | PENGURUSAN PENTADBIRAN | PENGURUSAN KURIKULUM | HEM | KOKURIKULUM
 *   PERTAMA| 1-Jan-25 RABU    | CUTI TAHUN BARU        |                      |     |
 *          | 9-Jan-25 KHAMIS  | MESYUARAT KEWANGAN 1   |                      |     |
 *
 * Tiga masalah dengan bentuk itu bila dipapar terus, dan ketiga-tiganya
 * dilaporkan pengguna sebagai "berselerak":
 *
 *   1. Tarikh dan hari BERCANTUM dalam satu sel.
 *   2. Nombor minggu hanya ditulis pada baris PERTAMA setiap minggu; baris
 *      lain kosong, jadi menyusun ikut minggu memberi lompang.
 *   3. Program bertaburan merentas EMPAT lajur unit, dan hampir semuanya
 *      kosong — jadi mata perlu mengimbas secara mendatar untuk mencari
 *      satu program.
 *
 * Modul ini membetulkan ketiga-tiganya: tarikh dipisah dari hari, minggu
 * diwarisi menurun, dan empat lajur unit dileraikan menjadi satu senarai
 * program yang setiap satunya membawa nama unitnya sendiri.
 *
 * Import relatif dengan .ts supaya ia boleh diuji terus dengan Node.
 */

export interface AcaraTakwim {
  /** Nombor atau nama minggu, diwarisi dari baris di atas bila kosong. */
  minggu: string;
  /** ISO `YYYY-MM-DD` bila tarikh difahami; null bila tidak. */
  tarikh: string | null;
  /** Teks tarikh seperti dicetak, untuk dipapar bila penghuraian gagal. */
  tarikhTeks: string;
  hari: string;
  program: string;
  /** Unit yang bertanggungjawab, dari nama lajur. Kosong bila tiada. */
  unit: string;
}

const HARI = [
  "ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT", "SABTU", "AHAD",
];

const BULAN: Record<string, number> = {
  JAN: 1, FEB: 2, MAC: 3, MAR: 3, APR: 4, MEI: 5, MAY: 5, JUN: 6,
  JUL: 7, OGO: 8, AUG: 8, AUGUST: 8, SEP: 9, OKT: 10, OCT: 10,
  NOV: 11, DIS: 12, DEC: 12,
};

/**
 * Asingkan tarikh dan hari daripada satu sel.
 *
 * Bentuk yang benar-benar muncul: "1-Jan-25 RABU", "25-Jun-25 RABU",
 * "9-Feb-25 AHAD". Nama hari boleh berada di hadapan atau di belakang —
 * kedua-duanya berlaku dalam buku yang sama.
 */
export function pisahTarikhHari(sel: string): { tarikh: string | null; tarikhTeks: string; hari: string } {
  const teks = (sel ?? "").replace(/\s+/g, " ").trim();
  if (teks === "") return { tarikh: null, tarikhTeks: "", hari: "" };

  let hari = "";
  let baki = teks;
  for (const h of HARI) {
    const re = new RegExp(`\\b${h}\\b`, "i");
    if (re.test(baki)) {
      hari = h;
      baki = baki.replace(re, " ").replace(/\s+/g, " ").trim();
      break;
    }
  }

  // "1-Jan-25" atau "1/1/25" atau "1 Jan 2025"
  const m = /(\d{1,2})\s*[-/ ]\s*([A-Za-z]{3,9}|\d{1,2})\s*[-/ ]\s*(\d{2,4})/.exec(baki);
  let iso: string | null = null;
  if (m) {
    const hariBulan = Number(m[1]);
    const bulanMentah = m[2].toUpperCase();
    const bulan = /^\d+$/.test(bulanMentah)
      ? Number(bulanMentah)
      : BULAN[bulanMentah.slice(0, 3)] ?? 0;
    let tahun = Number(m[3]);
    // "25" bermakna 2025, bukan tahun 25. Buku menulis tahun dua digit.
    if (tahun < 100) tahun += 2000;
    if (bulan >= 1 && bulan <= 12 && hariBulan >= 1 && hariBulan <= 31) {
      iso = `${tahun}-${String(bulan).padStart(2, "0")}-${String(hariBulan).padStart(2, "0")}`;
    }
  }

  return { tarikh: iso, tarikhTeks: baki.trim() || teks, hari };
}

/** Adakah sel ini kelihatan seperti membawa tarikh? */
function adaTarikh(sel: string): boolean {
  return /\d{1,2}\s*[-/ ]\s*([A-Za-z]{3,9}|\d{1,2})\s*[-/ ]\s*\d{2,4}/.test(sel ?? "");
}

/**
 * Leraikan baris takwim menjadi acara.
 *
 * `lajur` ialah nama lajur seperti dibaca dari buku. Ia diperlukan untuk
 * memberi nama unit kepada setiap program — tanpa itu, "MESYUARAT KURIKULUM
 * BIL 1" dan "GOTONG-ROYONG PERDANA" kelihatan sama walaupun satu milik
 * Kurikulum dan satu lagi milik HEM.
 */
export function leraiTakwim(lajur: string[], baris: string[][]): AcaraTakwim[] {
  // Cari lajur minggu dan lajur tarikh dari KANDUNGAN, bukan dari tajuk —
  // tajuk lajur berubah setiap edisi, kandungan tidak.
  let iTarikh = -1;
  for (let c = 0; c < (lajur.length || 8); c++) {
    const berapa = baris.filter((b) => adaTarikh(b[c] ?? "")).length;
    if (berapa > baris.length * 0.3) { iTarikh = c; break; }
  }
  if (iTarikh < 0) {
    // Tiada lajur tarikh: cari tarikh di mana-mana sel setiap baris.
    iTarikh = 0;
  }
  const iMinggu = iTarikh > 0 ? iTarikh - 1 : -1;

  const keluar: AcaraTakwim[] = [];
  let minggu = "";

  for (const b of baris) {
    if (iMinggu >= 0) {
      const m = (b[iMinggu] ?? "").trim();
      // Minggu diwarisi MENURUN: buku hanya menulisnya pada baris pertama
      // setiap minggu, dan baris lain dibiarkan kosong.
      if (m !== "" && !adaTarikh(m)) minggu = m;
    }

    // Sel tarikh: yang ditetapkan, atau mana-mana sel yang membawa tarikh.
    const selTarikh = adaTarikh(b[iTarikh] ?? "")
      ? b[iTarikh]
      : b.find((c) => adaTarikh(c)) ?? "";
    const { tarikh, tarikhTeks, hari } = pisahTarikhHari(selTarikh);

    // Setiap lajur unit yang BERISI menjadi acaranya sendiri. Satu baris
    // boleh membawa program dalam dua unit pada hari yang sama.
    for (let c = 0; c < b.length; c++) {
      if (c === iMinggu) continue;
      const nilai = (b[c] ?? "").replace(/\s+/g, " ").trim();
      if (nilai === "" || nilai === tarikhTeks || nilai === selTarikh.trim()) continue;
      if (adaTarikh(nilai)) continue;
      if (nilai === minggu) continue;
      if (HARI.includes(nilai.toUpperCase())) continue;
      if (nilai.length < 3) continue;

      keluar.push({
        minggu,
        tarikh,
        tarikhTeks,
        hari,
        program: nilai,
        unit: bersihUnit(lajur[c] ?? ""),
      });
    }
  }

  return susunTakwim(keluar);
}

/** "PENGURUSAN HAL EHWAL MURID" → "Hal Ehwal Murid". */
function bersihUnit(nama: string): string {
  const t = nama.replace(/^PENGURUSAN\s+/i, "").replace(/\s+/g, " ").trim();
  if (t === "" || /MINGGU|TARIKH|HARI|BIL/i.test(t)) return "";
  return t
    .toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (x) => x.toUpperCase());
}

/**
 * Susun ikut tarikh.
 *
 * Acara tanpa tarikh yang difahami diletakkan di HUJUNG, bukan dibuang:
 * ia tetap program sekolah, dan membuangnya bermakna sesuatu hilang senyap
 * daripada takwim yang guru bergantung padanya.
 */
export function susunTakwim(senarai: AcaraTakwim[]): AcaraTakwim[] {
  return [...senarai].sort((a, b) => {
    if (a.tarikh && b.tarikh) return a.tarikh.localeCompare(b.tarikh);
    if (a.tarikh) return -1;
    if (b.tarikh) return 1;
    return a.program.localeCompare(b.program, "ms");
  });
}

/** Kumpulkan ikut bulan, untuk paparan yang tidak menjadi satu senarai panjang. */
export function ikutBulan(senarai: AcaraTakwim[]): { bulan: string; acara: AcaraTakwim[] }[] {
  const NAMA_BULAN = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember",
  ];
  const peta = new Map<string, AcaraTakwim[]>();
  for (const a of senarai) {
    const kunci = a.tarikh ? a.tarikh.slice(0, 7) : "zz";
    const ada = peta.get(kunci);
    if (ada) ada.push(a);
    else peta.set(kunci, [a]);
  }
  return [...peta.entries()]
    .sort((x, y) => x[0].localeCompare(y[0]))
    .map(([kunci, acara]) => ({
      bulan:
        kunci === "zz"
          ? "Tiada tarikh"
          : `${NAMA_BULAN[Number(kunci.slice(5, 7)) - 1]} ${kunci.slice(0, 4)}`,
      acara,
    }));
}
