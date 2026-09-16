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

/** Nama hari, untuk mengecam lajur hari. */
function adaHari(sel: string): boolean {
  const t = (sel ?? "").trim().toUpperCase();
  return HARI.includes(t);
}

const KEPALA_TAKWIM =
  /^(MINGGU|TARIKH|HARI|BIL|PENGURUSAN|PROGRAM|AKTIVITI|CATATAN|UNIT)\b/i;

/**
 * Leraikan baris takwim menjadi acara.
 *
 * ⚠️ SATU PROGRAM BOLEH MERENTAS BEBERAPA BARIS GRID, dan tarikhnya berada
 * pada baris di TENGAH, bukan di atas. Bentuk sebenar edisi 2026:
 *
 *   ·  | ·         | ·     | ·  | MEYSUARAT SAINS,          | ·
 *   ·  | 23-Feb-26 | ISNIN | ·  | TEKNOLOGI, KEJURUTERAAN   | ·
 *   ·  | ·         | ·     | ·  | & MATEMATIK (STEM) BIL 1  | ·
 *
 * Membaca baris demi baris menghasilkan tiga "program" yang setiap satunya
 * separuh ayat, dua daripadanya tanpa tarikh dan tanpa hari. Itulah yang
 * dilaporkan pengguna: perkataan berulang, tarikh tiada, hari tiada.
 *
 * Maka setiap LAJUR unit dibaca sebagai jujukan LARIAN: sel berisi yang
 * bersambungan digabung menjadi SATU program, dan tarikhnya diambil dari
 * baris bertarikh yang paling hampir dengan TENGAH larian itu. Sel yang
 * dijajarkan di tengah secara menegak — yang menyebabkan masalah ini —
 * kini menjadi isyarat yang tepat.
 */
export function leraiTakwim(lajur: string[], baris: string[][]): AcaraTakwim[] {
  if (baris.length === 0) return [];
  // SETIAP MUKA DIHURAI BERASINGAN.
  //
  // Seksyen takwim menggabungkan 120 muka menjadi satu senarai baris, dan
  // kedudukan lajur TIDAK sama pada setiap muka — sesetengah muka ada lajur
  // kosong tambahan di hadapan. Mengesan lajur sekali untuk keseluruhan
  // seksyen bermakna 120 muka dibaca dengan kedudukan lajur satu muka, dan
  // hampir semuanya tersasar: 592 acara menjadi 294, dengan Januari tinggal
  // satu. Baris kepala yang dicetak semula pada setiap muka ialah sempadan
  // yang boleh dipercayai.
  const keping = pecahIkutMuka(baris);
  if (keping.length > 1) {
    return susunTakwim(buangPendua(keping.flatMap((k) => leraiSatuMuka(lajur, k))));
  }
  return susunTakwim(buangPendua(leraiSatuMuka(lajur, baris)));
}

/** Adakah baris ini kepala jadual yang dicetak semula pada muka baharu? */
function barisKepalaTakwim(b: string[]): boolean {
  const berisi = b.filter((c) => (c ?? "").trim() !== "");
  if (berisi.length < 2) return false;
  return berisi.filter((c) => KEPALA_TAKWIM.test(c.trim())).length >= 2;
}

function pecahIkutMuka(baris: string[][]): string[][][] {
  const keping: string[][][] = [];
  let semasa: string[][] = [];
  for (const b of baris) {
    if (barisKepalaTakwim(b)) {
      if (semasa.length > 0) keping.push(semasa);
      semasa = [];
      continue;
    }
    semasa.push(b);
  }
  if (semasa.length > 0) keping.push(semasa);
  return keping;
}

function leraiSatuMuka(lajur: string[], baris: string[][]): AcaraTakwim[] {
  if (baris.length === 0) return [];
  const lebar = Math.max(lajur.length, ...baris.map((b) => b.length));

  // Lajur dikenali dari KANDUNGAN. Tajuk lajur berubah setiap edisi;
  // tarikh dan nama hari tidak.
  let iTarikh = -1;
  let iHari = -1;
  for (let c = 0; c < lebar; c++) {
    const bilTarikh = baris.filter((b) => adaTarikh(b[c] ?? "")).length;
    const bilHari = baris.filter((b) => adaHari(b[c] ?? "")).length;
    if (iTarikh < 0 && bilTarikh >= 3) iTarikh = c;
    if (iHari < 0 && bilHari >= 3) iHari = c;
  }
  if (iTarikh < 0) return [];
  const iMinggu = iTarikh > 0 ? iTarikh - 1 : -1;

  /** Baris yang membawa tarikh, dengan minggu yang diwarisi menurun. */
  const barisTarikh: { i: number; tarikh: string | null; tarikhTeks: string; hari: string; minggu: string }[] = [];
  let minggu = "";
  for (let i = 0; i < baris.length; i++) {
    if (iMinggu >= 0) {
      const m = (baris[i][iMinggu] ?? "").trim();
      // Tajuk lajur dan tajuk bulan yang tersasar ke lajur minggu bukan
      // nombor minggu — itu yang memaparkan "TARIKH" dan "PROGRAM DAN
      // AKTIVITI BULAN MAC" sebagai minggu.
      if (m !== "" && !adaTarikh(m) && !KEPALA_TAKWIM.test(m) && m.length <= 12) minggu = m;
    }
    const sel = baris[i][iTarikh] ?? "";
    if (!adaTarikh(sel)) continue;
    const { tarikh, tarikhTeks } = pisahTarikhHari(sel);
    const hari = iHari >= 0 ? (baris[i][iHari] ?? "").trim().toUpperCase() : pisahTarikhHari(sel).hari;
    barisTarikh.push({ i, tarikh, tarikhTeks, hari: adaHari(hari) ? hari : "", minggu });
  }
  if (barisTarikh.length === 0) return [];

  /** Baris bertarikh paling hampir dengan tengah larian. */
  const hampir = (tengah: number) =>
    barisTarikh.reduce((a, b) =>
      Math.abs(b.i - tengah) < Math.abs(a.i - tengah) ? b : a,
    );

  const keluar: AcaraTakwim[] = [];
  for (let c = 0; c < lebar; c++) {
    if (c === iTarikh || c === iHari || c === iMinggu) continue;

    const adaTarikhBaris = new Set(barisTarikh.map((t) => t.i));
    let larian: { mula: number; teks: string[]; lintasTarikh: boolean; bergabung: boolean } | null = null;
    const tutup = () => {
      if (!larian) return;
      const program = larian.teks.join(" ").replace(/\s+/g, " ").trim();
      const tengah = larian.mula + (larian.teks.length - 1) / 2;
      larian = null;
      if (program.length < 3 || KEPALA_TAKWIM.test(program)) return;
      if (adaTarikh(program) || adaHari(program)) return;
      const t = hampir(tengah);
      keluar.push({
        minggu: t.minggu, tarikh: t.tarikh, tarikhTeks: t.tarikhTeks,
        hari: t.hari, program, unit: bersihUnit(lajur[c] ?? ""),
      });
    };

    let kosongBerturut = 0;
    for (let i = 0; i < baris.length; i++) {
      const nilai = (baris[i][c] ?? "").replace(/\s+/g, " ").trim();
      if (nilai === "") {
        kosongBerturut++;
        // SATU baris kosong TIDAK menamatkan serpihan yang belum selesai.
        //
        // Grid muka mempunyai lebih banyak baris daripada baris teks, jadi
        // sel bergabung menghasilkan lompang satu baris di antara barisnya.
        // Menutup larian pada lompang itu memecahkan
        // "FORMATIF 1 (12.1.2026 -" daripada "30.3.2026)" — dan itulah
        // sebabnya 25 serpihan tergantung kekal selepas percubaan pertama.
        const tergantung =
          larian !== null &&
          (/[-–—,&/(]$/.test(larian.teks[larian.teks.length - 1]) ||
            kurunganTerbuka(larian.teks.join(" ")));
        if (!tergantung || kosongBerturut > 1) tutup();
        continue;
      }
      kosongBerturut = 0;

      const barisBertarikh = adaTarikhBaris.has(i);
      // SEL BERGABUNG MERENTAS BANYAK TARIKH.
      //
      // Program bertempoh dicetak dalam satu sel yang menduduki beberapa
      // baris tarikh: "FORMATIF 1 (12.1.2026 - 30.3.2026) & MESYUARAT".
      // Memecahkannya pada setiap tarikh menghasilkan "FORMATIF 1 (12.1.2026 -"
      // dan "30.3.2026) & MESYUARAT" sebagai dua program yang kedua-duanya
      // tidak bermakna.
      //
      // Isyaratnya ada dalam teks itu sendiri: serpihan yang belum selesai
      // berakhir dengan sempang, koma, "&" atau kurungan yang belum ditutup.
      // Ayat Melayu yang lengkap tidak berakhir begitu.
      const belumSelesai =
        larian !== null &&
        (/[-–—,&/(]$/.test(larian.teks[larian.teks.length - 1]) ||
          kurunganTerbuka(larian.teks.join(" ")) ||
          /^[)\]]/.test(nilai));
      // SATU LARIAN MELINTASI SATU TARIKH SAHAJA.
      //
      // Ini peraturan yang menampung KEDUA-DUA bentuk buku tanpa mengetahui
      // edisi mana yang dibaca:
      //   · 2025 — setiap baris membawa tarikhnya sendiri, jadi setiap baris
      //     memulakan larian baharu dan satu baris = satu acara.
      //   · 2026 — teks program membalut merentas baris tanpa tarikh, dan
      //     hanya baris tengah yang bertarikh; larian itu kekal utuh.
      // Setelah larian dikenal pasti sebagai SEL BERGABUNG, hanya sel KOSONG
      // menamatkannya. Sel bergabung ialah blok teks bersambungan yang
      // menduduki beberapa baris tarikh; memecahkannya di tengah pada tarikh
      // seterusnya menghasilkan separuh ayat — dan separuh yang kedua
      // kelihatan seperti program yang berasingan.
      if (larian && barisBertarikh && larian.lintasTarikh && !belumSelesai && !larian.bergabung) {
        tutup();
      }

      if (larian) {
        if (belumSelesai && barisBertarikh) larian.bergabung = true;
        larian.teks.push(nilai);
        if (barisBertarikh) larian.lintasTarikh = true;
      } else {
        larian = { mula: i, teks: [nilai], lintasTarikh: barisBertarikh, bergabung: false };
      }
    }
    tutup();
  }

  return keluar;
}

/** Adakah teks ini mempunyai kurungan yang dibuka tetapi belum ditutup? */
function kurunganTerbuka(teks: string): boolean {
  let dalam = 0;
  for (const c of teks) {
    if (c === "(") dalam++;
    else if (c === ")") dalam = Math.max(0, dalam - 1);
  }
  return dalam > 0;
}

/**
 * Buang acara yang sama pada tarikh yang sama.
 *
 * Takwim dibaca dari DUA seksyen (program dan mesyuarat) yang bertindih
 * dalam buku, jadi acara yang sama boleh masuk dua kali. Ia juga berlaku
 * apabila satu program dicetak merentas dua lajur unit.
 */
function buangPendua(senarai: AcaraTakwim[]): AcaraTakwim[] {
  const dilihat = new Set<string>();
  const keluar: AcaraTakwim[] = [];
  for (const a of senarai) {
    const kunci = `${a.tarikh ?? a.tarikhTeks}|${a.program.toUpperCase()}`;
    if (dilihat.has(kunci)) continue;
    dilihat.add(kunci);
    keluar.push(a);
  }
  return keluar;
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
