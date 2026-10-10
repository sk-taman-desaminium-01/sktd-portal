/**
 * Logik TULEN untuk menghurai fail jadual: padanan subjek dan pembinaan draf.
 *
 * Diasingkan daripada `baca-jadual.ts` (yang melakukan muat naik dan storan)
 * kerana logik ini ialah bahagian yang paling mudah silap, dan memisahkannya
 * bermakna ia boleh dijalankan dan diuji terus tanpa Supabase, Clerk atau
 * fail sebenar. Lihat `scripts/uji-huraian.mts`.
 *
 * Import di sini RELATIF dan bukan alias `@/` supaya fail ini boleh dijalankan
 * terus oleh Node semasa ujian; alias hanya difahami oleh penyusun Next.
 */

import { KOD_SUBJEK } from "../data/subjek.ts";
import {
  HARI, NAMA_HARI,
  type Hari, type KelasJadual, type Waktu,
} from "../data/jadual-jenis.ts";

/* ----------------------------------------------------------- padanan subjek */

/**
 * Nama lain yang muncul dalam jadual sebenar. Sengaja longgar — memadankan
 * "b.melayu" kepada Bahasa Melayu jauh lebih berguna daripada gagal senyap,
 * dan guru kelas menyemak hasilnya sebelum apa-apa disimpan.
 */
const ALIAS: Record<string, string[]> = {
  // Kod pendek di bawah diambil terus dari jadual rasmi sekolah (2 MAJU
  // sesi petang, dan jadual guru sesi pagi) — bukan tekaan. Sekolah menulis
  // MT untuk Matematik, SN untuk Sains, PJ/PK untuk PJPK, BA untuk Bahasa
  // Arab, dan PER untuk Perhimpunan.
  BM: ["bahasa melayu", "b melayu", "b.melayu", "bm", "bmm", "melayu"],
  BI: ["bahasa inggeris", "b inggeris", "b.inggeris", "bi", "english", "inggeris"],
  MM: ["matematik", "math", "mm", "mt"],
  SAINS: ["sains", "science", "sn"],
  SEJ: ["sejarah", "sej", "sj"],
  PAI: [
    "pendidikan islam", "p islam", "p.islam", "pai", "agama islam", "islam",
    // Sekolah memecahkan Pendidikan Islam kepada komponen: (Q) Al-Quran,
    // (U) Ulum Syariah, (J) Jawi. Semuanya subjek yang sama pada slip.
    "p islam q", "p islam u", "p islam j", "pai ppki", "al quran", "ulum jawi",
  ],
  PM: ["pendidikan moral", "p moral", "pm", "moral"],
  RBT: ["reka bentuk", "rbt", "reka bentuk dan teknologi"],
  PJPK: ["pendidikan jasmani", "pjpk", "pj", "pjk", "jasmani", "kesihatan", "pk"],
  PSV: ["pendidikan seni", "psv", "seni visual", "seni"],
  PMZ: ["pendidikan muzik", "pmz", "muzik"],
  AR: ["bahasa arab", "b arab", "arab", "ar", "bar", "ba"],
  BC: ["bahasa cina", "b cina", "cina", "bc"],
  PERHIMPUNAN: ["perhimpunan", "himpunan", "per"],
  TASMIK: ["tasmik"],
  PSS: ["pusat sumber", "pss", "perpustakaan", "nilam"],
  KOKO: ["kokurikulum", "koko", "ko-kurikulum"],
  PAK21: ["pak21", "pak 21"],
};

/**
 * Normalkan teks: huruf kecil, aksara bukan alfanumerik jadi ruang, dan
 * dibalut ruang di kedua-dua hujung. Balutan itulah yang membolehkan
 * padanan SEMPADAN PERKATAAN di bawah.
 */
function normal(teks: string): string {
  return ` ${teks.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

/** Alias dinormalkan sekali sahaja, supaya "b.melayu" menjadi "b melayu". */
const ALIAS_NORMAL: [string, string][] = Object.entries(ALIAS).flatMap(
  ([kod, senarai]) => senarai.map((a) => [kod, normal(a).trim()] as [string, string]),
);

/**
 * Padan satu petak teks kepada kod subjek. Null jika tiada padanan yakin.
 *
 * MENGAPA SEMPADAN PERKATAAN, BUKAN SUBTEKS BIASA:
 * versi pertama menggunakan `includes(alias)` tanpa sempadan, dan ujian
 * menangkap dua kegagalan sebenar serta-merta —
 *   · "Bilik 4A" dipadankan dengan BI, kerana "bilik" mengandungi "bi"
 *   · "ISNIN"    dipadankan dengan SAINS, kerana "isnin" mengandungi "sn"
 * Kedua-duanya akan mengisi jadual ibu bapa dengan subjek yang tidak pernah
 * wujud, daripada perkataan yang bukan subjek langsung.
 */
export function padanSubjek(teks: string): string | null {
  const t = normal(teks);
  if (t.trim() === "") return null;

  let terbaik: { kod: string; panjang: number } | null = null;
  for (const [kod, a] of ALIAS_NORMAL) {
    // Padanan terpanjang menang: "bahasa melayu" mesti mengalahkan "bm"
    // apabila kedua-duanya hadir dalam petak yang sama.
    if (t.includes(` ${a} `) && (!terbaik || a.length > terbaik.panjang)) {
      terbaik = { kod, panjang: a.length };
    }
  }
  return terbaik?.kod ?? null;
}

const KOD_SAH = new Set(KOD_SUBJEK);


/* ------------------------------------------------------------ bina cadangan */

/**
 * Bahagikan teks mengikut hari, kemudian isi subjek yang dikenali mengikut
 * URUTAN ke dalam slot PdP hari itu.
 *
 * Ini heuristik, bukan penghuraian jadual sebenar. Susun atur fail jadual
 * berbeza-beza antara sekolah dan antara tahun, jadi menuntut satu bentuk
 * tetap akan gagal pada fail sebenar pertama. Urutan ialah andaian yang
 * paling selamat, dan skor keyakinan memberitahu guru kelas sejauh mana ia
 * boleh dipercayai sebelum mereka menyemak sel demi sel.
 */
export function binaDraf(teks: string, senaraiWaktu: Waktu[]): HasilHuraian {
  const waktu = senaraiWaktu.filter((w) => !w.rehat);
  const baris = teks.split(/\r?\n/);

  // Cari baris permulaan setiap hari.
  const mula: Partial<Record<Hari, number>> = {};
  baris.forEach((b, i) => {
    const h = padanHari(b);
    if (h && mula[h] === undefined) mula[h] = i;
  });

  const hari: KelasJadual["hari"] = {};
  let dikenal = 0;

  const urutan = HARI.filter((h) => mula[h] !== undefined)
    .sort((a, b) => (mula[a]! - mula[b]!));

  urutan.forEach((h, n) => {
    const dari = mula[h]!;
    const hingga = n + 1 < urutan.length ? mula[urutan[n + 1]]! : baris.length;
    const petak = baris.slice(dari, hingga).join(" ").split(/\s{2,}|\||\t|,/);

    const kod: string[] = [];
    for (const p of petak) {
      const k = padanSubjek(p);
      if (k && KOD_SAH.has(k)) kod.push(k);
    }

    const slot: Record<string, { subjek: string }> = {};
    kod.slice(0, waktu.length).forEach((k, i) => {
      slot[waktu[i].id] = { subjek: k };
      dikenal++;
    });
    if (Object.keys(slot).length > 0) hari[h] = slot;
  });

  const jumlah = waktu.length * HARI.length;
  return { draf: { hari }, dikenal, jumlah, kosong: Math.max(0, jumlah - dikenal), tidakDikenali: 0 };
}



/**
 * Hasil satu percubaan menghurai.
 *
 * `kosong` dan `tidakDikenali` dipisahkan dengan sengaja: "44 daripada 45"
 * kelihatan seperti sesuatu terlepas, sedangkan waktu ke-45 itu mungkin
 * memang kosong dalam jadual sekolah. Pentadbir tidak sepatutnya memburu
 * sesuatu yang tidak wujud.
 */
export interface HasilHuraian {
  draf: KelasJadual;
  dikenal: number;
  jumlah: number;
  /** Waktu yang tiada sebarang teks dalam fail. */
  kosong: number;
  /** Ada teks tetapi subjeknya tidak dikenali. Inilah kegagalan sebenar. */
  tidakDikenali: number;
  /**
   * Perkara yang MESTI disemak mata manusia sebelum disimpan.
   *
   * Wujud kerana kiraan slot terbukti bukan bukti: jadual Tahap 2 dilapor
   * "48/50" sedangkan Moral hilang dan guru bertukar antara petak. Setiap
   * amaran di sini ialah PELANGGARAN satu sifat yang jadual sah sentiasa
   * penuhi — teks yang tidak dimiliki mana-mana petak, petak tanpa guru,
   * dua petak bertindih. Bacaan yang salah hampir mustahil melepasi
   * semuanya serentak. Kosong = tiada yang dikesan.
   */
  amaran?: string[];
}

/* ----------------------------------------------------------------- hari */

/**
 * Nama hari dalam DUA BAHASA dan bentuk pendek.
 *
 * Sekolah menjana jadual dalam dua versi: satu Bahasa Melayu penuh
 * ("ISNIN"), satu lagi bentuk pendek Inggeris ("Mo", "Tu"). Fail aSc sebenar
 * yang diberi sekolah menggunakan yang KEDUA — dan kerana penghurai hanya
 * tahu nama Melayu penuh, ia mengenal pasti SIFAR daripada 45 slot. Fail yang
 * betul, penghurai yang buta.
 *
 * Dipadankan sebagai perkataan penuh (lihat `normal`), jadi "th" tidak
 * memadankan perkataan lain yang mengandunginya.
 */
const HARI_ALIAS: Record<Hari, string[]> = {
  isnin:  ["isnin", "isn", "monday", "mon", "mo", "m"],
  selasa: ["selasa", "sel", "tuesday", "tues", "tue", "tu"],
  rabu:   ["rabu", "rab", "wednesday", "wed", "we", "w"],
  khamis: ["khamis", "kha", "kham", "thursday", "thur", "thu", "th"],
  jumaat: ["jumaat", "jumat", "jum", "friday", "fri", "fr", "f"],
};

/** Hari yang dirujuk oleh satu petak teks, jika ada. */
export function padanHari(teks: string): Hari | null {
  const t = normal(teks);
  if (t.trim() === "") return null;
  let terbaik: { hari: Hari; panjang: number } | null = null;
  for (const [hari, senarai] of Object.entries(HARI_ALIAS) as [Hari, string[]][]) {
    for (const a of senarai) {
      // Padanan terpanjang menang, supaya "isnin" mengalahkan "isn".
      if (t.includes(` ${a} `) && (!terbaik || a.length > terbaik.panjang)) {
        terbaik = { hari, panjang: a.length };
      }
    }
  }
  return terbaik?.hari ?? null;
}

/* ------------------------------------------------------------- nama guru */

/**
 * Gelaran yang muncul di hadapan nama guru dalam jadual sekolah.
 * Dipadankan sebagai perkataan penuh — "en" tidak boleh memadankan "enam".
 */
const GELARAN = [
  "pn", "puan", "en", "encik", "cik", "tn", "tuan",
  "hj", "hjh", "haji", "hajah", "dr", "ustaz", "ustazah",
  "mr", "mrs", "ms", "madam", "sir", "tuan hj", "puan hjh",
];

// Kumpulan pertama menangkap gelaran BERSAMA titiknya — membina semula nama
// dari bahagian yang berasingan menjatuhkan titik itu ("PN. SITI" menjadi
// "PN SITI"), dan itu bukan cara sekolah menulisnya.
const RE_GELARAN = new RegExp(`\\b((?:${GELARAN.join("|")})\\b\\.?)\\s*(.+)`, "i");

/**
 * Cari nama guru dalam satu sel jadual.
 *
 * Dalam jadual sekolah sebenar, sel biasanya mengandungi subjek DAN guru —
 * "BAHASA MELAYU / PN. SITI" atau subjek pada satu baris dan nama di bawahnya.
 * Nama itu sudah ada; memintanya ditaip semula 13 kali setiap kelas ialah
 * kerja yang tidak perlu.
 *
 * DUA CARA, mengikut keyakinan:
 *  1. Ada gelaran (PN., EN., USTAZ …) → ambil dari gelaran hingga hujung.
 *     Ini yang paling boleh dipercayai.
 *  2. Tiada gelaran → buang teks subjek, dan terima yang tinggal HANYA jika
 *     ia kelihatan seperti nama: sekurang-kurangnya dua perkataan, huruf
 *     sahaja. Itu menolak "BILIK 4A", "M2", "2 WAKTU" dan seumpamanya.
 */
export function namaGuruDariSel(sel: string, kod: string | null): string | null {
  const teks = sel.replace(/\s+/g, " ").trim();
  if (!teks) return null;

  const g = RE_GELARAN.exec(teks);
  if (g) return kemasNama(`${g[1]} ${g[2]}`);

  if (!kod) return null;

  // Buang setiap alias subjek itu daripada teks, kemudian nilai yang tinggal.
  let baki = ` ${teks.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
  for (const [k, a] of ALIAS_NORMAL) {
    if (k === kod) baki = baki.split(` ${a} `).join(" ");
  }
  baki = baki.replace(/\s+/g, " ").trim();

  const perkataan = baki.split(" ").filter((w) => w.length > 1 && /^[a-z]+$/.test(w));

  // SATU perkataan sudah memadai.
  //
  // Jadual rasmi sekolah menulis nama guru sebagai satu nama sahaja di bawah
  // subjek — "WAN", "SRI", "SUHAILA", "NASSER". Menuntut dua perkataan (versi
  // pertama) akan TERLEPAS hampir setiap guru dalam fail sebenar mereka.
  //
  // Yang perlu ditolak ialah KOD KELAS dan kod bilik, yang muncul di tempat
  // sama dalam jadual GURU: "6 INT", "5 SUK", "M2". Semuanya mengandungi
  // digit atau ialah singkatan pendek yang menyertai digit, jadi ujian di
  // bawah membuangnya tanpa membuang nama sebenar.
  if (perkataan.length === 0) return null;
  if (perkataan.length === 1) {
    const w = perkataan[0];
    // Nama sebenar jarang sependek 2 huruf; kod bilik selalu begitu.
    if (w.length < 3) return null;
    // Kalau teks asal mempunyai digit bersebelahan perkataan itu, ia hampir
    // pasti kod kelas ("6 INT") dan bukan nama.
    if (/\d/.test(teks)) return null;
    // Perkataan yang ialah alias subjek lain bukan nama.
    for (const [, a] of ALIAS_NORMAL) if (a === w) return null;
  }

  // Cari semula dalam teks ASAL supaya huruf besar/kecil asal dikekalkan.
  const corak = new RegExp(perkataan.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^a-zA-Z]+"), "i");
  const padan = corak.exec(teks);
  return kemasNama(padan ? padan[0] : perkataan.join(" "));
}

/**
 * Kemas nama: buang pembungkus dan tanda baca di hujung, hadkan panjang.
 *
 * Kurungan penutup termasuk dalam senarai kerana sel selalunya ditulis
 * "MATEMATIK (EN AHMAD)" — tanpa ini, nama guru berakhir dengan ")".
 * Titik TIDAK dibuang dari dalam nama, hanya dari hujung sekali.
 */
function kemasNama(nama: string): string | null {
  const bersih = nama
    .replace(/^[\s([{<"\u2018\u201c]+/, "")
    .replace(/[\s.,;:/|)\]}>"\u2019\u201d-]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  // Had bawah 3, bukan 4: jadual sebenar sekolah mengandungi nama guru
  // sependek "WAN" dan "SRI". Had 4 menolaknya secara senyap, dan ujian
  // menangkapnya hanya selepas kod sekolah sebenar dimasukkan.
  if (bersih.length < 3 || bersih.length > 70) return null;
  return bersih;
}

/** Nama yang paling kerap muncul bagi setiap subjek sepanjang minggu. */
function guruTerbanyak(kutipan: Map<string, string[]>): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const [kod, senarai] of kutipan) {
    const kira = new Map<string, number>();
    for (const n of senarai) kira.set(n, (kira.get(n) ?? 0) + 1);
    let terbaik: [string, number] | null = null;
    for (const e of kira) if (!terbaik || e[1] > terbaik[1]) terbaik = e;
    if (terbaik) hasil[kod] = terbaik[0];
  }
  return hasil;
}

/* ------------------------------------------------- draf dari GRID sebenar */

/** Alihkan baris↔lajur, untuk jadual yang menyenaraikan hari menegak. */
function alih(grid: string[][]): string[][] {
  const lebar = Math.max(0, ...grid.map((b) => b.length));
  return Array.from({ length: lebar }, (_, c) => grid.map((b) => b[c] ?? ""));
}

/** Cari baris yang mengandungi nama hari, dan lajur mana milik hari mana. */
function cariBarisHari(grid: string[][]): { baris: number; lajur: Partial<Record<Hari, number>> } | null {
  for (let r = 0; r < grid.length; r++) {
    const lajur: Partial<Record<Hari, number>> = {};
    grid[r].forEach((sel, c) => {
      const h = padanHari(sel);
      if (h && lajur[h] === undefined) lajur[h] = c;
    });
    // Tiga hari sudah cukup untuk yakin ini baris kepala, dan ia membenarkan
    // jadual yang hanya meliputi sebahagian minggu.
    if (Object.keys(lajur).length >= 3) return { baris: r, lajur };
  }
  return null;
}

/**
 * Bina draf daripada GRID sebenar (Excel, CSV, jadual DOCX).
 *
 * Jauh lebih dipercayai daripada versi teks rata: di sini kita tahu sel mana
 * berada di bawah lajur "ISNIN" dan pada baris yang mana, jadi padanan
 * menjadi KEDUDUKAN dan bukan tekaan urutan. Teks rata terpaksa menganggap
 * subjek muncul mengikut turutan, yang gagal sebaik sesuatu fail menyusun
 * hari secara menegak atau menyelitkan lajur waktu di tengah.
 *
 * Kedua-dua orientasi disokong: hari melintang (biasa) dan hari menegak.
 */
export function binaDrafDariGrid(
  helaian: string[][][],
  senaraiWaktu: Waktu[],
): HasilHuraian | null {
  const waktu = senaraiWaktu.filter((w) => !w.rehat);

  for (const asal of helaian) {
    for (const grid of [asal, alih(asal)]) {
      const kepala = cariBarisHari(grid);
      if (!kepala) continue;

      const hari: KelasJadual["hari"] = {};
      const kutipan = new Map<string, string[]>();
      let dikenal = 0;
      let slotKe = 0;

      for (let r = kepala.baris + 1; r < grid.length && slotKe < waktu.length; r++) {
        const jumpa: [Hari, string][] = [];
        for (const h of HARI) {
          const c = kepala.lajur[h];
          if (c === undefined) continue;
          const sel = grid[r][c] ?? "";
          const kod = padanSubjek(sel);
          if (!kod) continue;
          jumpa.push([h, kod]);

          // Nama guru selalunya berada dalam sel yang SAMA dengan subjek.
          const guru = namaGuruDariSel(sel, kod);
          if (guru) kutipan.set(kod, [...(kutipan.get(kod) ?? []), guru]);
        }
        // Baris tanpa sebarang subjek ialah rehat, baris kosong, atau tajuk —
        // ia dilangkau TANPA menggunakan slot, supaya waktu selepasnya tidak
        // teranjak satu tempat.
        if (jumpa.length === 0) continue;

        for (const [h, kod] of jumpa) {
          hari[h] = { ...(hari[h] ?? {}), [waktu[slotKe].id]: { subjek: kod } };
          dikenal++;
        }
        slotKe++;
      }

      if (dikenal > 0) {
        const guruSubjek = guruTerbanyak(kutipan);
        const jumlah = waktu.length * HARI.length;
        return {
          draf: {
            hari,
            ...(Object.keys(guruSubjek).length > 0 ? { guruSubjek } : {}),
          },
          dikenal,
          jumlah,
          kosong: Math.max(0, jumlah - dikenal),
          tidakDikenali: 0,
        };
      }
    }
  }
  return null;
}

/* ------------------------------------------- draf dari KOORDINAT PDF ----- */

/**
 * Serpihan teks dengan kedudukannya. Sama bentuk dengan `ItemTeks`.
 *
 * `h` (tinggi fon) dan `f` (nama fon) pilihan: PDF memberinya, OCR tidak.
 * Bila ada, `f` membezakan SUBJEK (fon tebal besar) daripada NAMA GURU (fon
 * condong kecil) tanpa perlu meneka daripada teksnya.
 */
export interface Kedudukan { str: string; x: number; y: number; w?: number; h?: number; f?: string }

const RE_MASA = /(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/;
const RE_REHAT = /^(rehat|rest|break|recess)$/i;

/** Label kumpulan kecil yang aSc cetak pada petak: bukan subjek, bukan guru. */
const RE_LABEL_VARIAN = /^(quran|jawi|ulum|moral\s*-\s*[qju])$/i;

/**
 * Huruf komponen Pendidikan Islam daripada teks petak.
 *
 * Jadual menulisnya dua cara pada petak yang sama: dalam kurungan pada
 * subjek ("P.ISLAM (Q)") dan bersambung pada Moral ("MORAL-Q"). Kedua-duanya
 * diterima; huruf itu sama kerana kedua-dua kumpulan berpecah serentak.
 */
function varianDariTeks(teks: string): string | null {
  const m = /\((Q|J|U)\)/i.exec(teks) ?? /\bMORAL\s*-\s*(Q|J|U)\b/i.exec(teks)
    ?? /^\s*(Q)URAN\s*$/i.exec(teks) ?? /^\s*(J)AWI\s*$/i.exec(teks) ?? /^\s*(U)LUM\s*$/i.exec(teks);
  return m ? m[1].toUpperCase() : null;
}

/** Nilai yang paling kerap; seri dimenangi yang muncul dahulu. */
function terkerap<T>(senarai: T[]): T | undefined {
  const kira = new Map<T, number>();
  for (const v of senarai) kira.set(v, (kira.get(v) ?? 0) + 1);
  let terbaik: [T, number] | undefined;
  for (const e of kira) if (!terbaik || e[1] > terbaik[1]) terbaik = e;
  return terbaik?.[0];
}

/**
 * Cantum baris-baris nama guru dalam SATU petak menjadi satu nama.
 *
 * aSc mematahkan nama yang tidak muat, dengan tiga rupa — semuanya diukur
 * pada jadual Tahun 4–6 (16.8.2026):
 *   · "AKRAM /" ⏎ "IRHAMI /" ⏎ "IBRAHIM"   pemisah dikekalkan
 *   · "SYAKIRAH / JAZMA" ⏎ "RASHIDAH"      pemisah DIGUGURKAN pada patahan
 *   · "ABDURRAHM" ⏎ "AN"                   SATU nama dipatah di tengah
 * Yang ketiga dikenali daripada ekornya: baris bawah BERMULA dengan satu–dua
 * huruf sahaja ("AN", atau "AN / SHUZAN"), di bawah baris satu perkataan.
 *
 * Dan yang keempat, dari jadual petang: "ADHLINA / ANIS" ⏎ "SYUHADA" ialah
 * DUA orang (Adhlina, Anis Syuhada), bukan tiga — nama dua perkataan dipatah
 * pada ruangnya. Sekolah ini ada guru "ANIS" DAN guru "ANIS SYUHADA", jadi
 * tiada peraturan ejaan boleh membezakannya. Yang membezakan ialah dokumen
 * itu sendiri: `namaBerganda` mengandungi setiap nama berbilang perkataan
 * yang tercetak UTUH pada satu baris di mana-mana dalam fail.
 */
function cantumGuru(kepingan: Kedudukan[], namaBerganda: Set<string>): string {
  const susun = [...kepingan].sort((a, b) => (Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x));
  let keluar = "";
  let dulu: Kedudukan | null = null;
  for (const k of susun) {
    const t = k.str.trim();
    if (!t) continue;
    if (!dulu) keluar = t;
    else if (Math.abs(dulu.y - k.y) <= 3 || /\/\s*$/.test(keluar) || /^\//.test(t)) keluar += ` ${t}`;
    else {
      // Ekor satu–dua huruf selepas perkataan tunggal = nama dipatah di
      // tengah. LEBAR baris atas tidak boleh dijadikan tanda: "HALIMATUN"
      // memenuhi petak sempit tetapi baris di bawahnya ("AMALINA") ialah
      // guru LAIN — diukur pada 4 USAHA, yang terbaca "HALIMATUNAMALINA".
      const tengahKata = !/[\s/]/.test(dulu.str.trim()) && /^[A-Za-z]{1,2}(\s*\/|$)/.test(t);
      const hujung = keluar.split("/").pop()!.trim();
      const pangkal = t.split("/")[0].trim();
      const satuNama = namaBerganda.has(`${hujung} ${pangkal}`.toUpperCase());
      keluar += tengahKata ? t : satuNama ? ` ${t}` : ` / ${t}`;
    }
    dulu = k;
  }
  return keluar.replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").trim();
}

/**
 * Bina draf daripada KOORDINAT teks PDF.
 *
 * KENAPA CARA INI WUJUD: jadual aSc — yang sekolah ini gunakan — tidak
 * berbentuk baris-dan-lajur yang kemas. Label hari ("Mo", "Tu") duduk pada
 * barisnya SENDIRI di lajur kiri, manakala subjek dan nama guru berada pada
 * baris yang berlainan. Koordinat menyelesaikannya: setiap hari menduduki
 * JALUR y, setiap waktu menduduki JALUR x, dan petak ialah persilangannya.
 *
 * DITULIS SEMULA 11 Okt 2026 selepas jadual Tahun 4–6 (16.8.2026) dibaca
 * salah walaupun kiraannya "48/50". Empat punca, semuanya diukur pada fail
 * itu, dan setiap satu kini dikira daripada geometri — bukan diteka:
 *
 *  1. SEMPADAN BARIS HARI. Dahulu: titik tengah antara dua label hari. Tetapi
 *     garis dasar label besar duduk DI BAWAH pusat barisnya, jadi sempadan
 *     itu ~12pt terlalu rendah — baris guru teratas petak PAI/Moral hari
 *     Selasa (y 394.4) jatuh ke hari Isnin (sempadan sebenar 405). Kini pusat
 *     baris dikira daripada label, dan baris = pusat ± separuh tinggi.
 *
 *  2. NAMA GURU IKUT TEPI KANAN, bukan pusat teks. aSc merapatkan nama guru
 *     ke tepi KANAN petak; nama panjang melimpah ke KIRI ke atas petak jiran.
 *     Padanan ikut pusat memberi nama itu kepada jiran — itulah "guru
 *     tertukar". Lajur yang mengandungi tepi kanan nama = lajur terakhir
 *     petak pemiliknya.
 *
 *  3. LEBAR PETAK. Pusat subjek + tepi kanan guru memberi rentang tepat
 *     (1, 2, 3 atau 4 waktu) — pusat sahaja tidak membezakan 1 daripada 3.
 *
 *  4. PETAK DUA TINGKAT (Pendidikan Islam di atas, Moral di bawah) dibahagi
 *     pada PUSAT BARIS. Dalam bentuk ini guru Moral dicetak DI ATAS perkataan
 *     "P. MORAL", jadi membahagi pada kedudukan perkataan itu memberi guru
 *     Moral kepada PAI. Dan dalam petak sempit "P. MORAL" patah menjadi
 *     "P. MOR" ⏎ "AL" — dua serpihan yang mesti dicantum sebelum dipadankan.
 */
export function binaDrafDariKedudukan(
  halaman: Kedudukan[][],
  senaraiWaktu: Waktu[],
  /**
   * SEMUA muka dokumen, bila `halaman` hanya satu daripadanya. Digunakan
   * untuk mengenal nama guru berbilang perkataan (lihat `cantumGuru`) —
   * nama yang patah pada muka ini mungkin tercetak utuh pada muka lain.
   */
  seluruhDokumen: Kedudukan[][] = halaman,
): HasilHuraian | null {
  const namaBerganda = new Set<string>();
  for (const muka of seluruhDokumen) {
    for (const i of muka) {
      if (i.str.includes(":")) continue; // "Guru kelas : NAMA PENUH BIN …"
      for (const n of i.str.split("/")) {
        const t = n.replace(/\s+/g, " ").trim().toUpperCase();
        if (/^[A-Z.']+( [A-Z.']+)+$/.test(t)) namaBerganda.add(t);
      }
    }
  }
  const waktuPdP = senaraiWaktu.filter((w) => !w.rehat);
  const jumlah = waktuPdP.length * HARI.length;
  const kanan = (i: Kedudukan) => i.x + (i.w ?? 0);
  const tengah = (i: Kedudukan) => i.x + (i.w ?? 0) / 2;

  for (const item of halaman) {
    // --- Lajur waktu: dikenali daripada sel julat masa ("01:00 - 01:30") ---
    const lajurMasa = item
      .filter((i) => RE_MASA.test(i.str))
      .sort((a, b) => a.x - b.x);
    if (lajurMasa.length < 3) continue;

    // --- Baris hari: label pendek di KIRI lajur waktu pertama ---
    const adalahLabelHari = (i: Kedudukan) =>
      i.str.trim().length <= 12 && padanHari(i.str) !== null && tengah(i) < lajurMasa[0].x;
    const labelHari = item.filter(adalahLabelHari).sort((a, b) => b.y - a.y); // atas ke bawah
    if (labelHari.length < 3) continue;

    // PUSAT setiap lajur, dikira dari label masa itu sendiri: label
    // dipusatkan dalam lajurnya, jadi pusat label = pusat lajur.
    const pusatLajur = lajurMasa.map(tengah);
    const L = pusatLajur.length > 1
      ? (pusatLajur[pusatLajur.length - 1] - pusatLajur[0]) / (pusatLajur.length - 1)
      : 60;
    const kiriLajur = (i: number) => pusatLajur[i] - L / 2;
    const kananLajur = (i: number) => pusatLajur[i] + L / 2;
    /** Lajur yang mengandungi titik x; -1 jika di luar jadual. */
    const lajurPada = (x: number): number => {
      for (let i = 0; i < pusatLajur.length; i++) if (x > kiriLajur(i) && x <= kananLajur(i)) return i;
      return -1;
    };

    // Tinggi baris = jarak antara label hari berturutan (yang terkecil, supaya
    // hari yang tiada labelnya tidak menggandakan tinggi itu).
    const jarak: number[] = [];
    for (let i = 0; i < labelHari.length - 1; i++) {
      const d = labelHari[i].y - labelHari[i + 1].y;
      if (d > 1) jarak.push(d);
    }
    const T = jarak.length > 0 ? Math.min(...jarak) : 90;
    // Label dipusatkan menegak dalam barisnya; garis dasarnya duduk kira-kira
    // sepertiga tinggi fon di bawah pusat itu (diukur: 11.2pt bagi fon 33pt,
    // iaitu 0.12 daripada tinggi baris bila tinggi fon tidak diketahui).
    const pusatBaris = (l: Kedudukan) => l.y + (l.h ? l.h * 0.34 : T * 0.12);

    // Jangan ambil apa-apa dari baris masa ke atas — itu kepala jadual.
    const hadAtas = Math.max(...lajurMasa.map((m) => m.y));

    // Fon SUBJEK: fon yang paling kerap membawa teks subjek. Dengan itu
    // serpihan seperti "P. MOR" dan "AL" dikenali sebagai subjek walaupun
    // teksnya sendiri tidak memadankan apa-apa.
    const badan = item.filter((i) =>
      i.y < hadAtas && !RE_MASA.test(i.str) && !adalahLabelHari(i) && !RE_REHAT.test(i.str.trim()));
    const fonSubjek = terkerap(
      badan.filter((i) => i.f && padanSubjek(i.str) !== null).map((i) => i.f!),
    );
    const adalahSubjek = (i: Kedudukan) =>
      fonSubjek ? i.f === fonSubjek : padanSubjek(i.str) !== null;

    const hari: KelasJadual["hari"] = {};
    /** kod subjek → nama guru, SATU entri bagi setiap waktu yang diajar. */
    const kutipan = new Map<string, string[]>();
    const guruSlot: { hari: Hari; id: string; kod: string; guru: string }[] = [];
    let dikenal = 0;
    let tidakDikenali = 0;
    const amaran: string[] = [];
    let petakBerguru = 0;
    const petakTanpaGuru: string[] = [];

    for (const label of labelHari) {
      const h = padanHari(label.str)!;
      if (hari[h]) continue; // label hari yang sama dua kali: yang pertama dipakai
      const pusatY = pusatBaris(label);
      const baris = badan.filter((i) => i.y > pusatY - T / 2 && i.y <= pusatY + T / 2);

      const labelVarian = baris.filter((i) => RE_LABEL_VARIAN.test(i.str.trim()));
      const isi = baris.filter((i) => !RE_LABEL_VARIAN.test(i.str.trim()));

      // --- Subjek: cantum serpihan yang patah baris ("P. MOR" ⏎ "AL") ---
      interface Subjek { teks: string; c: number; y: number; bawah: number; tinggi: number; kod: string | null }
      const subjek: Subjek[] = [];
      for (const s of isi.filter(adalahSubjek).sort((a, b) => b.y - a.y)) {
        const c = tengah(s);
        const tinggi = s.h ?? 16;
        const induk = fonSubjek
          ? subjek.find((u) => Math.abs(u.c - c) <= 2 && u.bawah - s.y > 0 && u.bawah - s.y <= u.tinggi * 1.4)
          : undefined;
        if (induk) {
          const rapat = induk.teks + s.str.trim();
          induk.teks = padanSubjek(rapat) !== null ? rapat : `${induk.teks} ${s.str.trim()}`;
          induk.bawah = s.y;
          induk.kod = padanSubjek(induk.teks);
        } else {
          subjek.push({ teks: s.str.trim(), c, y: s.y, bawah: s.y, tinggi, kod: padanSubjek(s.str) });
        }
      }
      const guru = isi.filter((i) => !adalahSubjek(i));
      /** Lajur tempat setiap nama guru BERAKHIR = lajur terakhir petaknya. */
      const hujungGuru = new Set(guru.map((g) => lajurPada(kanan(g) - 1)).filter((i) => i >= 0));

      // --- Rentang setiap subjek: [a..b] ---
      const tol = L * 0.2;
      const rentang = (s: Subjek): [number, number] | null => {
        const calon: [number, number][] = [];
        for (let n = 1; n <= 4; n++) {
          for (let a = 0; a + n - 1 < pusatLajur.length; a++) {
            const b = a + n - 1;
            if (Math.abs((pusatLajur[a] + pusatLajur[b]) / 2 - s.c) > tol) continue;
            // Petak tidak merentasi rehat, dan tidak menelan subjek lain.
            let sah = true;
            for (let i = a; i <= b; i++) if (senaraiWaktu[i]?.rehat && n > 1) sah = false;
            for (const o of subjek) {
              if (o === s || Math.abs(o.c - s.c) <= tol) continue;
              if (o.c > kiriLajur(a) && o.c < kananLajur(b)) sah = false;
            }
            if (sah) calon.push([a, b]);
          }
        }
        if (calon.length === 0) return null;
        return calon.find(([, b]) => hujungGuru.has(b)) ?? calon[0];
      };

      // --- Petak: subjek yang berkongsi rentang ialah tingkat-tingkat SATU petak ---
      interface Petak { a: number; b: number; tingkat: Subjek[] }
      const petak: Petak[] = [];
      for (const s of subjek) {
        const r = rentang(s);
        if (!r) {
          tidakDikenali++;
          amaran.push(`${NAMA_HARI[h]}: "${s.teks}" tidak dapat ditempatkan pada mana-mana waktu.`);
          continue;
        }
        const ada = petak.find((p) => p.a <= r[1] && r[0] <= p.b);
        if (ada) {
          // Tingkat SATU petak berkongsi rentang yang sama persis. Rentang
          // yang hanya bertindih sebahagian bermakna salah satunya salah.
          if (ada.a !== r[0] || ada.b !== r[1]) {
            amaran.push(`${NAMA_HARI[h]}: "${s.teks}" bertindih dengan "${ada.tingkat[0].teks}" — semak waktu ${ada.a + 1}–${ada.b + 1}.`);
          }
          ada.tingkat.push(s);
        } else petak.push({ a: r[0], b: r[1], tingkat: [s] });
      }

      const dilitupi = new Set<number>();
      for (const p of petak) {
        for (let i = p.a; i <= p.b; i++) dilitupi.add(i);
        p.tingkat.sort((x, y) => y.y - x.y);
        const atas = p.tingkat[0];
        const bawah = p.tingkat.find((t) => t.kod !== atas.kod && t.kod !== null);
        if (new Set(p.tingkat.map((t) => t.kod)).size > 2) {
          amaran.push(`${NAMA_HARI[h]} waktu ${p.a + 1}: lebih daripada dua subjek dalam satu petak (${p.tingkat.map((t) => t.teks).join(", ")}) — hanya dua disimpan.`);
        }
        const milik = guru.filter((g) => {
          const e = lajurPada(kanan(g) - 1);
          return e >= p.a && e <= p.b;
        });
        const teksLabel = labelVarian
          .filter((v) => { const e = lajurPada(tengah(v)); return e >= p.a && e <= p.b; })
          .map((v) => v.str);
        const varian = [...p.tingkat.map((t) => t.teks), ...teksLabel]
          .map(varianDariTeks).find((v) => v !== null) ?? null;

        // Dua tingkat dibahagi pada PUSAT BARIS — lihat nota 4 di atas.
        const namaAtas = cantumGuru(bawah ? milik.filter((g) => g.y > pusatY) : milik, namaBerganda);
        const namaBawah = bawah ? cantumGuru(milik.filter((g) => g.y <= pusatY), namaBerganda) : "";
        // Digit atau "*" bermakna KOD KELAS, bukan orang: aSc mencetak
        // "6 EFK*" di tempat nama guru bagi Perhimpunan 6 EFEKTIF.
        const bersih = (teks: string, kod: string) =>
          !teks || /[\d*]/.test(teks) ? null : fonSubjek ? kemasNama(teks) : namaGuruDariSel(teks, kod);
        if (atas.kod) {
          const tempat = `${NAMA_HARI[h]} waktu ${p.a + 1} (${atas.teks})`;
          if (namaAtas) petakBerguru++; else petakTanpaGuru.push(tempat);
          if (bawah?.kod) {
            if (namaBawah) petakBerguru++; else petakTanpaGuru.push(`${NAMA_HARI[h]} waktu ${p.a + 1} (${bawah.teks})`);
          }
        }

        for (let i = p.a; i <= p.b; i++) {
          const w = senaraiWaktu[i];
          if (!w || w.rehat) continue;
          if (!atas.kod) { tidakDikenali++; continue; }
          hari[h] = {
            ...(hari[h] ?? {}),
            [w.id]: {
              subjek: atas.kod,
              ...(bawah?.kod ? { seiring: bawah.kod } : {}),
              ...(varian ? { varian } : {}),
            },
          };
          dikenal++;
          const gAtas = bersih(namaAtas, atas.kod);
          if (gAtas) {
            kutipan.set(atas.kod, [...(kutipan.get(atas.kod) ?? []), gAtas]);
            guruSlot.push({ hari: h, id: w.id, kod: atas.kod, guru: gAtas });
          }
          const gBawah = bawah?.kod ? bersih(namaBawah, bawah.kod) : null;
          if (gBawah) kutipan.set(bawah!.kod!, [...(kutipan.get(bawah!.kod!) ?? []), gBawah]);
        }
      }

      // Ada teks pada waktu PdP yang tiada petak memilikinya: itu kegagalan
      // sebenar, dan pentadbir mesti diberitahu — bukan disenyapkan.
      const yatim = new Set<number>();
      for (const g of guru) {
        const e = lajurPada(kanan(g) - 1);
        if (dilitupi.has(e)) continue;
        if (e >= 0 && senaraiWaktu[e] && !senaraiWaktu[e].rehat) yatim.add(e);
        amaran.push(`${NAMA_HARI[h]}: teks "${g.str.trim()}" tidak dimiliki mana-mana petak.`);
      }
      tidakDikenali += yatim.size;
    }

    // PETAK TANPA GURU. Dalam jadual aSc setiap petak membawa nama gurunya.
    // Bila kebanyakan petak berguru tetapi beberapa tidak, hampir pasti nama
    // itu telah diberi kepada petak JIRAN — iaitu rupa sebenar "guru tertukar".
    // Jadual yang memang tiada nama guru langsung tidak mencetuskan ini.
    if (petakBerguru > 0 && petakTanpaGuru.length > 0 && petakBerguru >= petakTanpaGuru.length * 4) {
      amaran.push(`Petak tanpa nama guru: ${petakTanpaGuru.slice(0, 6).join("; ")}${petakTanpaGuru.length > 6 ? "; …" : ""}.`);
    }

    if (dikenal > 0) {
      const guruSubjek = guruTerbanyak(kutipan);
      // Waktu yang gurunya BERBEZA daripada guru lazim subjek itu membawa
      // namanya sendiri (`Slot.guru`). Contoh sebenar: PAI 4 SUKSES diajar
      // "SYAKIRAH" pada Rabu tetapi "SYAKIRAH / JAZMA / RASHIDAH" pada Khamis.
      for (const g of guruSlot) {
        const slot = hari[g.hari]?.[g.id];
        if (slot && slot.subjek === g.kod && guruSubjek[g.kod] !== g.guru) slot.guru = g.guru;
      }
      // Guru yang sama mengajar Pendidikan Islam DAN Moral dalam kelas yang
      // sama tidak berlaku — kedua-duanya berjalan serentak. Kalau ia muncul,
      // dua tingkat satu petak telah bercampur.
      const tokenNama = (n?: string) => new Set((n ?? "").toUpperCase().split(/\s*\/\s*/).filter(Boolean));
      const pai = tokenNama(guruSubjek.PAI);
      for (const n of tokenNama(guruSubjek.PM)) {
        if (pai.has(n)) amaran.push(`"${n}" terbaca sebagai guru Pendidikan Islam DAN Moral — semak petak dua tingkat.`);
      }
      for (const [kod, n] of Object.entries(guruSubjek)) {
        if (/jadual|\basc\b|rehat/i.test(n) || padanSubjek(n) !== null) {
          amaran.push(`Nama guru ${kod} kelihatan bukan nama: "${n}".`);
        }
      }
      return {
        draf: { hari, ...(Object.keys(guruSubjek).length > 0 ? { guruSubjek } : {}) },
        dikenal,
        jumlah,
        // Waktu yang tiada sebarang teks dalam fail. Membezakannya daripada
        // kegagalan penting: "44 daripada 45" kelihatan seperti sesuatu
        // terlepas, sedangkan waktu ke-45 itu memang kosong dalam jadual
        // sekolah — dan pentadbir tidak sepatutnya memburu sesuatu yang
        // tidak wujud.
        kosong: Math.max(0, jumlah - dikenal - tidakDikenali),
        tidakDikenali,
        ...(amaran.length > 0 ? { amaran: [...new Set(amaran)] } : {}),
      };
    }
  }
  return null;
}
