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

