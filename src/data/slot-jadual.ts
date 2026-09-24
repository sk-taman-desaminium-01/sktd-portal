import { namaSubjek } from "./subjek.ts";

/**
 * SATU PETAK JADUAL BOLEH MEMBAWA LEBIH DARIPADA SATU SUBJEK.
 *
 * Dua perkara yang jadual sekolah ini tunjukkan, dan kedua-duanya bermakna:
 *
 * 1. SERENTAK — Pendidikan Islam dan Pendidikan Moral berjalan pada waktu
 *    yang SAMA. Murid Islam ke kelas PI, murid bukan Islam ke kelas Moral,
 *    guru berlainan. Jadual rasmi mencetaknya sebagai satu petak dibahagi
 *    dua tingkat. Menyimpan salah satu sahaja bermakna separuh kelas melihat
 *    jadual yang salah.
 *
 * 2. VARIAN — kurungan pada "P.ISLAM (Q)" bukan hiasan. Q ialah Quran,
 *    J ialah Jawi, U ialah Ulum; jadual mencetak nama penuhnya di atas petak
 *    dan hurufnya dalam kurungan. Moral membawa huruf yang sama
 *    ("MORAL-Q"), kerana kedua-dua kumpulan berpecah pada waktu yang sama.
 *    Guru perlu tahu komponen mana yang diajar pada waktu itu.
 *
 * Modul ini menukar antara bentuk data ({subjek, varian, seiring}) dan satu
 * kod rentetan yang boleh disimpan dalam satu <select> — supaya grid
 * pentadbir kekal satu kawalan sepetak dan bukan tiga.
 *
 * Kembarnya di laman awam: `sktd-web/src/data/slot-jadual.ts`.
 * Kalau satu diubah, ubah kedua-duanya.
 */

/** Huruf dalam kurungan → nama penuh yang dicetak jadual di atas petak. */
export const VARIAN: Record<string, string> = {
  Q: "Quran",
  J: "Jawi",
  U: "Ulum",
};

export interface IsiSlot {
  subjek: string;
  /** "Q" | "J" | "U" — komponen Pendidikan Islam pada waktu itu. */
  varian?: string;
  /** Kod subjek yang berjalan SERENTAK untuk kumpulan murid yang lain. */
  seiring?: string;
}

/** {PAI, Q, PM} → "PAI:Q+PM". Satu nilai untuk satu <select>. */
export function kodSlot(s: IsiSlot): string {
  if (!s.subjek) return "";
  return `${s.subjek}${s.varian ? `:${s.varian}` : ""}${s.seiring ? `+${s.seiring}` : ""}`;
}

/** "PAI:Q+PM" → {PAI, Q, PM}. Kod yang tidak dikenali dipulangkan seadanya. */
export function huraiKodSlot(kod: string): IsiSlot {
  if (!kod) return { subjek: "" };
  const [kiri, seiring] = kod.split("+");
  const [subjek, varian] = kiri.split(":");
  return { subjek, ...(varian ? { varian } : {}), ...(seiring ? { seiring } : {}) };
}

/**
 * Nama untuk dipapar: "Pendidikan Islam (Quran) / Pendidikan Moral".
 *
 * Nama PENUH, bukan kod. Ibu bapa dan guru membaca jadual ini; "PAI:Q+PM"
 * bermakna kepada pangkalan data sahaja.
 */
export function namaSlot(s: IsiSlot): string {
  if (!s.subjek) return "";
  const varian = s.varian && VARIAN[s.varian] ? ` (${VARIAN[s.varian]})` : "";
  const utama = `${namaSubjek(s.subjek)}${varian}`;
  return s.seiring ? `${utama} / ${namaSubjek(s.seiring)}` : utama;
}

/** Versi pendek untuk petak sempit: "PI (Quran) / Moral". */
export function namaSlotPendek(s: IsiSlot): string {
  if (!s.subjek) return "";
  const pendek = (kod: string) =>
    kod === "PAI" ? "P. Islam" : kod === "PM" ? "Moral" : namaSubjek(kod);
  const varian = s.varian && VARIAN[s.varian] ? ` (${VARIAN[s.varian]})` : "";
  return `${pendek(s.subjek)}${varian}${s.seiring ? ` / ${pendek(s.seiring)}` : ""}`;
}

/**
 * Varian hanya bermakna untuk Pendidikan Islam (dan Moral yang seiring
 * dengannya). Menawarkan "Matematik (Jawi)" dalam senarai pilihan hanya
 * mengelirukan.
 */
export function bolehVarian(kod: string): boolean {
  return kod === "PAI";
}
