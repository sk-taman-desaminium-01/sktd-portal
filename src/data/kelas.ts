import { SEKOLAH } from "./sekolah";

/**
 * Senarai kelas penuh: Tahun 1–6 × nama kelas.
 *
 * Tahun 1–3 menggunakan set `tahap1` (ada kelas MAJU), Tahun 4–6 menggunakan
 * `tahap2` (tiada MAJU) — pembahagian itu datang dari `sekolah.ts` dan bukan
 * diulang di sini, supaya menambah kelas dilakukan di SATU tempat sahaja.
 */
export function semuaKelas(): string[] {
  const senarai: string[] = [];
  for (let tahun = 1; tahun <= 6; tahun++) {
    const nama = tahun <= 3 ? SEKOLAH.kelasBase.tahap1 : SEKOLAH.kelasBase.tahap2;
    for (const n of nama) senarai.push(`${tahun} ${n}`);
  }
  return senarai;
}

/**
 * Kelas Pendidikan Khas (PPKI) — nama bunga, bukan tahun 1–6.
 *
 * Ditambah 18 Sep 2026 (permintaan pengguna I): Jadual Waktu sebelum ini
 * hanya menjana kelas perdana, jadi PPKI tidak pernah muncul untuk disunting
 * atau dilihat ibu bapa. Label "PPKI <NAMA>" — bukan nombor tahun — kerana
 * PPKI bukan dikumpulkan ikut tahun seperti kelas perdana. `tahunKelas()`
 * mengenali awalan ini dan memulangkan 0, supaya ia tetap dapat satu set
 * waktu (lihat `TAHUN_SET_LALAI[0]` dalam `jadual-jenis.ts`).
 */
export function semuaKelasPPKI(): string[] {
  return SEKOLAH.kelasKhas.map((n) => `PPKI ${n}`);
}

