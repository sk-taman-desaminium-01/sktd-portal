/**
 * PANITIA MATA PELAJARAN — Unit Kurikulum, Buku Pengurusan m.80–88
 *
 * 13 panitia, sama dengan 13 subjek slip PBD (Tahun 1–6). Kod subjek sama
 * dengan yang digunakan slip supaya tiada dua sistem penamaan.
 *
 * Setiap panitia akhirnya akan ada ruang eRPM sendiri. Sekarang baharu SATU
 * yang hidup — Pendidikan Islam, di gpi.edu.my, dibina lebih awal sebagai
 * app berasingan. Yang lain disenaraikan secara jujur sebagai belum ada,
 * bukan disembunyikan: guru panitia perlu nampak giliran mereka akan sampai.
 */

export interface Panitia {
  kod: string;
  nama: string;
  /** URL eRPM panitia ini; null = belum disediakan. */
  pautan: string | null;
  catatan?: string;
}

export const PANITIA: Panitia[] = [
  {
    kod: "PAI", nama: "Pendidikan Islam", pautan: "https://gpi.edu.my",
    catatan: "Sudah hidup — eRPM penuh: tanda SP, TP, sumatif dan slip.",
  },
  { kod: "BM", nama: "Bahasa Melayu", pautan: null },
  { kod: "BI", nama: "Bahasa Inggeris", pautan: null },
  { kod: "MM", nama: "Matematik", pautan: null },
  { kod: "SAINS", nama: "Sains", pautan: null },
  { kod: "SEJ", nama: "Sejarah", pautan: null, catatan: "Tahun 4–6 sahaja." },
  { kod: "PM", nama: "Pendidikan Moral", pautan: null },
  { kod: "RBT", nama: "Reka Bentuk & Teknologi", pautan: null, catatan: "Tahun 4–6 sahaja." },
  { kod: "PJPK", nama: "Pendidikan Jasmani & Kesihatan", pautan: null },
  { kod: "PSV", nama: "Pendidikan Seni Visual", pautan: null },
  { kod: "PMZ", nama: "Pendidikan Muzik", pautan: null },
  { kod: "AR", nama: "Bahasa Arab", pautan: null },
  { kod: "BC", nama: "Bahasa Cina", pautan: null, catatan: "Guru Bahasa Cina (SK)." },
];
