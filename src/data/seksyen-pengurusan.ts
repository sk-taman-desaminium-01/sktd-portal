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

/**
 * VERSI PENGHURAI, dinaikkan setiap kali pembacaan berubah dengan ketara.
 *
 * KENAPA INI WUJUD: data yang tersimpan dibaca oleh penghurai pada HARI ia
 * dimuat naik. Pembetulan yang dibuat selepas itu tidak menyentuhnya —
 * baris lama kekal lama. Pengguna menyemak edisi yang disimpan minggu
 * lepas, melihat sampah yang sudah dibaiki, dan melaporkannya semula.
 * Itu berlaku DUA KALI, dan kedua-duanya membazir pusingan penuh.
 *
 * Dengan cap ini, skrin boleh berkata terus terang bahawa edisi itu dibaca
 * oleh versi lama — dan mencadangkan muat naik semula, bukan membiarkan
 * pengguna menyangka sistem masih rosak.
 *
 * Naikkan apabila pembacaan berubah: penapis baharu, bentuk baharu,
 * pembetulan yang mengubah baris yang dihasilkan.
 */
export const VERSI_PENGHURAI = "2026.09.17b";

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
   *  `tugas`   — senarai berbulet di bawah tajuk peranan (bidang tugas)
   *
   * `tugas` ditambah selepas m.115-116 edisi 2025 dilaporkan "tidak boleh
   * dibaca". Ia BOLEH dibaca; ia cuma tiada nama. Muka itu menyenaraikan
   * BIDANG TUGAS Guru Penasihat Ko Akademik — dan sistem yang hanya tahu
   * dua bentuk membuangnya lalu berkata "semak rapi", yang menghantar admin
   * mencari kesilapan yang tidak wujud.
   */
  bentuk: "jadual" | "senarai" | "tugas";
  /** Bolehkah seksyen ini dipapar di laman AWAM? Lalai: tidak. */
  bolehAwam: boolean;
  /** Apa yang seksyen ini boleh suapkan ke bahagian lain sistem. */
  suapan?: string;
  /**
   * Gabungkan SEMUA kemunculan jenis ini menjadi satu seksyen, walaupun
   * berselang-seli dengan jenis lain.
   *
   * Hanya untuk takwim dan mesyuarat, dan sebabnya khusus: buku sebenar
   * menyusunnya bulan demi bulan — takwim Januari, mesyuarat, takwim
   * Februari, mesyuarat — jadi setiap bulan dikesan sebagai seksyen
   * berasingan. Tetapi takwim ialah SATU kalendar, bukan dua belas. Setiap
   * baris sudah membawa tarikhnya sendiri, jadi menggabungkannya tidak
   * menghilangkan apa-apa dan memberi admin satu senarai untuk disemak,
   * bukan dua belas.
   */
  gabungSemua?: boolean;
  /**
   * Tajuk yang BERBEZA memulakan seksyen baharu, walaupun kodnya sama.
   *
   * Takwim dicetak bulan demi bulan dengan tajuk sendiri setiap bulan.
   * Dicantum menjadi satu, ia 527 baris merentas 120 muka — betul sebagai
   * data, tetapi mustahil disemak: admin membuka "Semak isi" dan menghadapi
   * setahun penuh sekaligus.
   *
   * Dipecah ikut tajuk, ia menjadi satu seksyen setiap bulan. Paparan takwim
   * tetap menggabungkannya semula (`barisIkutKod` mengumpul setiap seksyen
   * berkod sama), jadi guru tetap melihat SATU kalendar.
   */
  pecahIkutTajuk?: boolean;
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
    pecahIkutTajuk: true,
    suapan: "Menjana DRAF pengumuman untuk setiap program — admin semak dan terbit.",
  },
  {
    kod: "mesyuarat", nama: "Takwim Mesyuarat", bentuk: "jadual", bolehAwam: false,
    kunci: ["mesyuarat pengurusan", "takwim mesyuarat", "jadual mesyuarat"],
    gabungSemua: true,
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
