/**
 * Jenis seksyen yang sistem faham dalam Buku Pengurusan.
 *
 * ⚠️ TIADA NOMBOR MUKA SURAT DI SINI, DAN TIDAK BOLEH ADA.
 * Buku pengurusan tahun depan tidak semestinya sama dengan tahun ini —
 * susunan berubah, muka surat beranjak, tajuk ditulis semula. Apa-apa yang
 * bergantung pada "seksyen guru kelas ada di muka 73" akan pecah senyap pada
 * edisi berikutnya, dan pecahnya hanya disedari selepas data salah tersebar.
 *
 * Maka seksyen dikenali melalui KATA KUNCI dalam tajuknya, bukan kedudukan.
 * Kalau pengecaman gagal, admin memilih sendiri jenis seksyen itu di skrin —
 * meneka adalah pilihan yang lebih teruk daripada bertanya.
 */

export type KodSeksyen =
  | "guru"          // senarai nama guru
  | "gurukelas"     // guru kelas mengikut kelas
  | "panitia"       // ketua panitia setiap subjek
  | "jawatankuasa"  // unit / JK dan ahlinya
  | "takwim"        // takwim persekolahan & program
  | "mesyuarat"     // takwim mesyuarat
  | "kokurikulum"   // unit beruniform, kelab, sukan
  | "lain";

export interface JenisSeksyen {
  kod: KodSeksyen;
  nama: string;
  /** Kata kunci dalam tajuk. Dipadan sebagai frasa, huruf besar diabaikan. */
  kunci: string[];
  /**
   * Bentuk data yang dijangka:
   *  `jadual` — baris dan lajur (senarai guru, takwim)
   *  `senarai` — baris "PERANAN : NAMA" (jawatankuasa, panitia)
   */
  bentuk: "jadual" | "senarai";
  /** Bolehkah seksyen ini dipapar di laman AWAM? Lalai: tidak. */
  bolehAwam: boolean;
  /** Apa yang seksyen ini boleh suapkan ke bahagian lain sistem. */
  suapan?: string;
}

export const JENIS_SEKSYEN: JenisSeksyen[] = [
  {
    kod: "gurukelas", nama: "Guru Kelas", bentuk: "jadual", bolehAwam: false,
    kunci: ["guru kelas", "guru tingkatan", "senarai guru kelas"],
    suapan: "Menetapkan guru kelas — membuka kunci penyuntingan jadual waktu, dan ePBD kemudian.",
  },
  {
    kod: "guru", nama: "Senarai Guru", bentuk: "jadual", bolehAwam: false,
    kunci: ["senarai nama guru", "senarai guru", "nama guru"],
    suapan: "Mengisi senarai akses portal lebih awal, jadi guru tidak perlu menunggu kelulusan selepas log masuk pertama.",
  },
  {
    kod: "panitia", nama: "Ketua Panitia", bentuk: "senarai", bolehAwam: false,
    kunci: ["ketua panitia", "panitia mata pelajaran", "unit kurikulum"],
    suapan: "Nama ketua panitia untuk halaman eRPM dan nama guru subjek dalam jadual.",
  },
  {
    kod: "jawatankuasa", nama: "Jawatankuasa & Unit", bentuk: "senarai", bolehAwam: false,
    kunci: ["jawatankuasa", "unit pengurusan", "unit kurikulum",
            "unit hal ehwal murid", "carta organisasi"],
    suapan: "Struktur unit sekolah — asas kepada kad bahagian dalam hab.",
  },
  {
    kod: "takwim", nama: "Takwim & Program", bentuk: "jadual", bolehAwam: true,
    kunci: ["takwim", "program dan aktiviti", "program & aktiviti",
            "penggal persekolahan", "hari kelepasan"],
    suapan: "Menjana DRAF pengumuman untuk setiap program — admin semak dan terbit.",
  },
  {
    kod: "mesyuarat", nama: "Takwim Mesyuarat", bentuk: "jadual", bolehAwam: false,
    kunci: ["mesyuarat pengurusan", "takwim mesyuarat", "jadual mesyuarat"],
    suapan: "Menghidupkan kad Mesyuarat: takwim, kehadiran dan minit.",
  },
  {
    kod: "kokurikulum", nama: "Kokurikulum", bentuk: "senarai", bolehAwam: false,
    kunci: ["unit beruniform", "unit-unit kokurikulum", "guru penasihat",
            "kelab dan persatuan", "sukan dan permainan"],
    suapan: "Senarai unit dan guru penasihat untuk kad Unit Kokurikulum.",
  },
];

/** Padan tajuk kepada jenis seksyen. Null bila tidak yakin. */
export function kesanJenis(tajuk: string): JenisSeksyen | null {
  const t = ` ${tajuk.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
  let terbaik: { jenis: JenisSeksyen; panjang: number } | null = null;
  for (const j of JENIS_SEKSYEN) {
    for (const k of j.kunci) {
      const kk = ` ${k.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
      // Padanan kunci TERPANJANG menang: "unit hal ehwal murid" mesti
      // mengalahkan "unit" yang terkandung dalam banyak tajuk lain.
      if (t.includes(kk) && (!terbaik || kk.length > terbaik.panjang)) {
        terbaik = { jenis: j, panjang: kk.length };
      }
    }
  }
  return terbaik?.jenis ?? null;
}
