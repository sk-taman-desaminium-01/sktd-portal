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

import { PANITIA } from "../data/panitia.ts";
import {
  HARI, NAMA_HARI, WAKTU_LALAI,
  type Hari, type KelasJadual, type Sesi,
} from "../data/jadual-jenis.ts";

/* ----------------------------------------------------------- padanan subjek */

/**
 * Nama lain yang muncul dalam jadual sebenar. Sengaja longgar — memadankan
 * "b.melayu" kepada Bahasa Melayu jauh lebih berguna daripada gagal senyap,
 * dan guru kelas menyemak hasilnya sebelum apa-apa disimpan.
 */
const ALIAS: Record<string, string[]> = {
  BM: ["bahasa melayu", "b melayu", "b.melayu", "bm", "bmm", "melayu"],
  BI: ["bahasa inggeris", "b inggeris", "b.inggeris", "bi", "english", "inggeris"],
  MM: ["matematik", "math", "mm", "mt"],
  SAINS: ["sains", "science", "sn"],
  SEJ: ["sejarah", "sej", "sj"],
  PAI: ["pendidikan islam", "p islam", "p.islam", "pai", "agama islam", "islam"],
  PM: ["pendidikan moral", "p moral", "pm", "moral"],
  RBT: ["reka bentuk", "rbt", "reka bentuk dan teknologi"],
  PJPK: ["pendidikan jasmani", "pjpk", "pj", "pjk", "jasmani", "kesihatan"],
  PSV: ["pendidikan seni", "psv", "seni visual", "seni"],
  PMZ: ["pendidikan muzik", "pmz", "muzik"],
  AR: ["bahasa arab", "b arab", "arab", "ar", "bar"],
  BC: ["bahasa cina", "b cina", "cina", "bc"],
  PERHIMPUNAN: ["perhimpunan", "himpunan"],
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

const KOD_SAH = new Set([...PANITIA.map((p) => p.kod), "PERHIMPUNAN", "PSS", "KOKO", "PAK21"]);


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
export function binaDraf(teks: string, sesi: Sesi): { draf: KelasJadual; dikenal: number; jumlah: number } {
  const waktu = WAKTU_LALAI[sesi].filter((w) => !w.rehat);
  const baris = teks.split(/\r?\n/);

  // Cari baris permulaan setiap hari.
  const mula: Partial<Record<Hari, number>> = {};
  baris.forEach((b, i) => {
    const t = b.toLowerCase();
    for (const h of HARI) {
      if (mula[h] === undefined && t.includes(NAMA_HARI[h].toLowerCase())) mula[h] = i;
    }
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

  return { draf: { sesi, hari }, dikenal, jumlah: waktu.length * HARI.length };
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
  if (perkataan.length < 2) return null;

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
  if (bersih.length < 4 || bersih.length > 70) return null;
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
      const t = sel.toLowerCase();
      for (const h of HARI) {
        if (lajur[h] === undefined && t.includes(NAMA_HARI[h].toLowerCase())) lajur[h] = c;
      }
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
  sesi: Sesi,
): { draf: KelasJadual; dikenal: number; jumlah: number } | null {
  const waktu = WAKTU_LALAI[sesi].filter((w) => !w.rehat);

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
        return {
          draf: {
            sesi, hari,
            ...(Object.keys(guruSubjek).length > 0 ? { guruSubjek } : {}),
          },
          dikenal,
          jumlah: waktu.length * HARI.length,
        };
      }
    }
  }
  return null;
}
