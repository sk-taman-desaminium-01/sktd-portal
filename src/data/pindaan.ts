import { kunciNama } from "../lib/nama.ts";

/**
 * PINDAAN — pembetulan yang KEKAL merentas edisi buku.
 *
 * MASALAH YANG INI SELESAIKAN. Buku Pengurusan dicetak sekali setahun dan
 * ia sentiasa sedikit ketinggalan berbanding sekolah sebenar. Edisi 2026
 * menyenaraikan Guru Besar yang bersara pada 7 Januari 2026 sebagai
 * pengerusi SETIAP unit — kerana pada hari ia dicetak, itu memang benar.
 * Penghurai tidak boleh "membetulkan" itu: ia membaca dengan tepat apa yang
 * tercetak, dan itulah kerjanya.
 *
 * Membetulkannya dengan tangan dalam skrin admin menyelesaikan edisi ini
 * sahaja. Bila buku 2027 dimuat naik, kerja yang sama bermula semula dari
 * kosong. Pengguna menyebutnya terus: pembetulan berulang memakan kuota
 * dan masa, jadi pembetulan hari ini mesti menjadi PENGAJARAN untuk esok.
 *
 * Maka setiap pembetulan disimpan sebagai pindaan, dan pindaan dikenakan
 * automatik pada setiap muat naik seterusnya. Admin membetulkan sesuatu
 * SEKALI.
 *
 * ── SATU BAHAYA YANG MESTI DIINGAT ──────────────────────────────────────
 *
 * "SHABARIAH" juga muncul dalam nama khas **Bilik i-Shabariah**. Bilik itu
 * kekal bernama begitu selepas pemiliknya bersara — itu memang niatnya.
 * Pindaan yang memadan SUBRENTETAN akan menamakan semula bilik itu
 * mengikut Guru Besar baharu, dan tiada siapa akan perasan sehingga papan
 * tanda dicetak.
 *
 * Sebab itu padanan di sini ialah **SELURUH SEL**, dinormalkan melalui
 * `kunciNama()` — bukan `includes()`, bukan regex. "BILIK i-SHABARIAH"
 * bukan "SHABARIAH BINTI ISMAIL", jadi ia tidak pernah disentuh.
 */

export type JenisPindaan =
  | "ganti_nama"   // orang digantikan orang lain (pertukaran, kenaikan pangkat)
  | "buang_nama"   // orang sudah tiada di sekolah — baris yang menamakannya digugurkan
  | "ganti_teks";  // pembetulan teks seluruh sel (jawatan tersalah eja dalam buku)

export interface Pindaan {
  id: string;
  jenis: JenisPindaan;
  dari: string;
  kepada: string | null;
  sebab: string | null;
  aktif: boolean;
  oleh: string | null;
  dicipta: string;
}

/** Normalkan sel untuk perbandingan teks — bukan nama. */
function kunciTeks(t: string): string {
  return (t ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export interface KesanPindaan {
  /** Sel selepas pindaan. Sama objek kalau tiada apa berubah. */
  sel: string[];
  /** Baris ini patut DIGUGURKAN sepenuhnya. */
  gugur: boolean;
  /** Pindaan mana yang mengenainya — untuk laporan, bukan hiasan. */
  kena: string[];
}

/**
 * Kenakan semua pindaan pada satu baris.
 *
 * Urutan disengajakan: gantian dahulu, buangan kemudian. Seseorang yang
 * digantikan bukan seseorang yang dibuang, dan memeriksa buangan dahulu
 * akan menggugurkan baris yang sepatutnya hanya bertukar nama.
 */
export function kenakanPindaan(sel: string[], pindaan: Pindaan[]): KesanPindaan {
  const aktif = pindaan.filter((p) => p.aktif);
  if (aktif.length === 0) return { sel, gugur: false, kena: [] };

  const kena: string[] = [];
  let keluar = sel;

  for (const p of aktif) {
    if (p.jenis === "buang_nama") continue;
    const kunciDari = p.jenis === "ganti_nama" ? kunciNama(p.dari) : kunciTeks(p.dari);
    if (kunciDari === "") continue;

    let sentuh = false;
    const baharu = keluar.map((c) => {
      const k = p.jenis === "ganti_nama" ? kunciNama(c ?? "") : kunciTeks(c ?? "");
      if (k !== kunciDari) return c;
      sentuh = true;
      return p.kepada ?? "";
    });
    if (sentuh) {
      keluar = baharu;
      kena.push(p.id);
    }
  }

  for (const p of aktif) {
    if (p.jenis !== "buang_nama") continue;
    const kunciDari = kunciNama(p.dari);
    if (kunciDari === "") continue;
    if (keluar.some((c) => kunciNama(c ?? "") === kunciDari)) {
      if (!kena.includes(p.id)) kena.push(p.id);
      return { sel: keluar, gugur: true, kena };
    }
  }

  return { sel: keluar, gugur: false, kena };
}

export interface RingkasPindaan {
  baris: string[][];
  /** Bilangan baris yang berubah. */
  diubah: number;
  /** Bilangan baris yang digugurkan sepenuhnya. */
  digugur: number;
}

/** Kenakan pindaan pada seluruh senarai baris, dengan kiraan untuk dilaporkan. */
export function kenakanPindaanBanyak(baris: string[][], pindaan: Pindaan[]): RingkasPindaan {
  if (pindaan.filter((p) => p.aktif).length === 0) {
    return { baris, diubah: 0, digugur: 0 };
  }
  const keluar: string[][] = [];
  let diubah = 0;
  let digugur = 0;
  for (const b of baris) {
    const kesan = kenakanPindaan(b, pindaan);
    if (kesan.gugur) { digugur++; continue; }
    if (kesan.kena.length > 0) diubah++;
    keluar.push(kesan.sel);
  }
  return { baris: keluar, diubah, digugur };
}

/* ------------------------------------------------------------ pewarisan */

export interface Pewaris {
  jawatan: string;
  lama: string;
  baharu: string;
}

/**
 * PERTUKARAN PENTADBIR DIKENAKAN SENDIRI.
 *
 * Keputusan pengguna (17 Sep 2026): "PGB dan para PK tak perlu tekan. Auto
 * jer selepas update nama-nama mereka di kad pentadbir."
 *
 * Mereka betul, dan sebabnya lebih kuat daripada kemudahan. Menukar nama
 * Guru Besar dalam kad Pentadbir dan MELUPAKAN untuk membetulkan
 * jawatankuasa menghasilkan portal yang bercakap dua perkara berbeza tentang
 * siapa Guru Besar — dan tiada siapa akan perasan, kerana kedua-dua skrin
 * kelihatan betul apabila dilihat berasingan.
 *
 * Jadi satu tindakan, bukan dua: nama ditukar di kad Pentadbir, dan setiap
 * baris Buku Pengurusan yang menamakan orang lama menyusul sendiri.
 *
 * DUA PAGAR yang menjadikan ini selamat:
 *
 *  · Padanan SELURUH SEL melalui `kunciNama()`. "BILIK i-SHABARIAH" bukan
 *    "SHABARIAH BINTI ISMAIL", jadi bilik itu tidak dinamakan semula
 *    mengikut Guru Besar baharu. Itu bahaya yang sebenar, bukan teori.
 *
 *  · Ejaan yang dikemaskan BUKAN pertukaran orang. "PN. SHABARIAH BT ISMAIL"
 *    menjadi "SHABARIAH BINTI ISMAIL" ialah orang yang SAMA; `kunciNama()`
 *    menyeragamkan penanda nasab, jadi tiada pindaan dicipta.
 */
export function kesanPewaris(lama: Pentadbir[], baharu: Pentadbir[]): Pewaris[] {
  const petaLama = new Map(lama.map((o) => [o.jawatan.trim().toLowerCase(), o.nama]));
  const keluar: Pewaris[] = [];

  for (const b of baharu) {
    const sebelum = petaLama.get(b.jawatan.trim().toLowerCase());
    if (!sebelum) continue;                       // jawatan baharu, bukan pertukaran
    if (sebelum.trim() === "" || b.nama.trim() === "") continue;
    if (kunciNama(sebelum) === kunciNama(b.nama)) continue;   // ejaan sahaja
    keluar.push({ jawatan: b.jawatan.trim(), lama: sebelum.trim(), baharu: b.nama.trim() });
  }
  return keluar;
}

/** Bentuk seorang pentadbir, seperti dalam kad Pentadbir. */
export interface Pentadbir {
  jawatan: string;
  nama: string;
}
