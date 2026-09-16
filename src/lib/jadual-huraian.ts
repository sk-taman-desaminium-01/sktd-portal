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
export function binaDraf(teks: string, senaraiWaktu: Waktu[]): { draf: KelasJadual; dikenal: number; jumlah: number } {
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

  return { draf: { hari }, dikenal, jumlah: waktu.length * HARI.length };
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
): { draf: KelasJadual; dikenal: number; jumlah: number } | null {
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
        return {
          draf: {
            hari,
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

/* ------------------------------------------- draf dari KOORDINAT PDF ----- */

/** Serpihan teks dengan kedudukannya. Sama bentuk dengan `ItemTeks`. */
export interface Kedudukan { str: string; x: number; y: number; w?: number }

const RE_MASA = /(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/;

/**
 * Bina draf daripada KOORDINAT teks PDF.
 *
 * KENAPA CARA INI WUJUD: jadual aSc — yang sekolah ini gunakan — tidak
 * berbentuk baris-dan-lajur yang kemas. Label hari ("Mo", "Tu") duduk pada
 * barisnya SENDIRI di lajur kiri, manakala subjek dan nama guru berada pada
 * baris yang berlainan di bawahnya. Penghurai grid menganggap satu sel = satu
 * baris + satu lajur, jadi ia mengenal pasti SIFAR daripada 45 slot pada fail
 * sebenar sekolah. Penghurai teks rata lagi teruk: teks keluar mengikut
 * susunan ia disimpan, bukan susunan ia kelihatan.
 *
 * Koordinat menyelesaikannya: setiap hari menduduki JALUR y, setiap waktu
 * menduduki JALUR x. Sel ialah persilangan kedua-duanya — sama seperti yang
 * dilihat mata.
 */
export function binaDrafDariKedudukan(
  halaman: Kedudukan[][],
  senaraiWaktu: Waktu[],
): { draf: KelasJadual; dikenal: number; jumlah: number } | null {
  const waktuPdP = senaraiWaktu.filter((w) => !w.rehat);
  const jumlah = waktuPdP.length * HARI.length;

  for (const item of halaman) {
    // --- Lajur waktu: dikenali daripada sel julat masa ("01:00 - 01:30") ---
    const lajurMasa = item
      .filter((i) => RE_MASA.test(i.str))
      .sort((a, b) => a.x - b.x);
    // --- Baris hari: label pendek yang memadankan nama hari ---
    const labelHari = item
      .filter((i) => i.str.trim().length <= 12 && padanHari(i.str) !== null)
      .sort((a, b) => b.y - a.y); // atas ke bawah

    if (lajurMasa.length < 3 || labelHari.length < 3) continue;

    // Sempadan jalur hari: titik tengah antara label berturutan. Jalur
    // pertama bermula sedikit di ATAS labelnya, kerana baris subjek hari itu
    // selalunya berada di atas label (label duduk di tengah bloknya).
    const sempadan: number[] = [];
    for (let i = 0; i < labelHari.length - 1; i++) {
      sempadan.push((labelHari[i].y + labelHari[i + 1].y) / 2);
    }
    const jalurHari = labelHari.map((l, i) => ({
      hari: padanHari(l.str)!,
      atas: i === 0 ? Infinity : sempadan[i - 1],
      bawah: i === labelHari.length - 1 ? -Infinity : sempadan[i],
    }));

    // PUSAT setiap lajur, dikira dari label masa itu sendiri: label
    // dipusatkan dalam lajurnya, jadi pusat label = pusat lajur. Mengukurnya
    // begini bermakna tiada nombor ajaib — ia menyesuaikan diri dengan
    // sebarang saiz fon atau susun atur.
    const pusatLajur = lajurMasa.map((m) => m.x + (m.w ?? 0) / 2);
    const lebarLajur =
      pusatLajur.length > 1
        ? (pusatLajur[pusatLajur.length - 1] - pusatLajur[0]) / (pusatLajur.length - 1)
        : 60;

    // Jangan ambil apa-apa dari baris masa ke atas — itu kepala jadual.
    const hadAtas = Math.max(...lajurMasa.map((m) => m.y));

    const sel = new Map<string, string[]>();
    for (const it of item) {
      if (it.y >= hadAtas) continue;
      if (RE_MASA.test(it.str)) continue;
      if (it.str.trim().length <= 12 && padanHari(it.str) !== null) continue;
      // Label rehat dilukis sebagai teks besar MERENTASI lajur rehat. Tanpa
      // baris ini ia jatuh ke dalam sel jiran dan berakhir sebagai sebahagian
      // NAMA GURU — "SYAIFUL / ANIS SYUHADA REHAT" pada fail sebenar sekolah.
      if (/^(rehat|rest|break|recess)$/i.test(it.str.trim())) continue;

      const h = jalurHari.find((j) => it.y <= j.atas && it.y > j.bawah);
      if (!h) continue;

      /* SEL BERGABUNG DIKIRA, BUKAN DITEKA.
         aSc memusatkan teks dalam selnya. Diukur pada fail sebenar sekolah:
           · sel tunggal  → pusat teks jatuh TEPAT pada pusat lajur
                            (PMZ 425.0 vs pusat lajur 425)
           · sel bergabung→ pusat teks jatuh TEPAT pada titik tengah antara
                            dua pusat lajur (BM 240.75 vs titik tengah 241)
         Jadi sel dimiliki oleh setiap lajur yang pusatnya berada dalam
         0.6 lebar lajur dari pusat teks: itu merangkumi kedua-dua lajur bagi
         sel bergabung (jarak setengah lebar) dan hanya satu bagi sel tunggal
         (jiran berada satu lebar penuh, di luar julat). */
      const pusat = it.x + (it.w ?? 0) / 2;
      const milik: number[] = [];
      for (let i = 0; i < pusatLajur.length; i++) {
        if (Math.abs(pusatLajur[i] - pusat) <= lebarLajur * 0.6) milik.push(i);
      }
      if (milik.length === 0) continue;

      for (const idx of milik) {
        const kunci = `${h.hari}|${idx}`;
        sel.set(kunci, [...(sel.get(kunci) ?? []), it.str.trim()]);
      }
    }

    // --- Tukar sel kepada slot ---
    const hari: KelasJadual["hari"] = {};
    const kutipan = new Map<string, string[]>();
    let dikenal = 0;

    for (const [kunci, kepingan] of sel) {
      const [namaHari, idxStr] = kunci.split("|");
      const idx = Number(idxStr);
      // Lajur masa termasuk rehat; senarai waktu kita juga. Padanan ikut
      // URUTAN, jadi kedua-duanya sejajar tanpa perlu meneka waktu mana rehat.
      const w = senaraiWaktu[idx];
      if (!w || w.rehat) continue;

      const teks = kepingan.join(" ");
      const kod = padanSubjek(teks);
      if (!kod) continue;

      const h = namaHari as Hari;
      hari[h] = { ...(hari[h] ?? {}), [w.id]: { subjek: kod } };
      dikenal++;

      const guru = namaGuruDariSel(teks, kod);
      if (guru) kutipan.set(kod, [...(kutipan.get(kod) ?? []), guru]);
    }

    if (dikenal > 0) {
      const guruSubjek = guruTerbanyak(kutipan);
      return {
        draf: { hari, ...(Object.keys(guruSubjek).length > 0 ? { guruSubjek } : {}) },
        dikenal,
        jumlah,
      };
    }
  }
  return null;
}
