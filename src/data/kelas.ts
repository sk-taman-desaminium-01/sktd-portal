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
