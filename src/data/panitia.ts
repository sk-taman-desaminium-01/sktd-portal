/**
 * PANITIA MATA PELAJARAN — Unit Kurikulum, Buku Pengurusan m.80–88
 *
 * 13 panitia, sama dengan 13 subjek slip PBD (Tahun 1–6). Kod subjek sama
 * dengan yang digunakan slip supaya tiada dua sistem penamaan.
 *
 * SEMUA panitia kini ada ruang eRPM (dikemas kini 17 Sep 2026). Pendidikan
 * Islam dibina sebagai app penuh di gpi.edu.my — tanda SP, TP, sumatif dan
 * slip. Yang lain ialah ruang yang panitia masing-masing bina sendiri:
 * Google Drive, Google Sites, Canva, Linktree dan pemendek pautan.
 *
 * Kita hanya MEMAUTKANNYA. Ruang itu milik panitia, dan mereka yang
 * mengemas kininya — jadi pautan yang mati di sini bermakna panitia itu
 * memindahkan ruangnya, bukan sistem kita rosak.
 *
 * Parameter penjejakan `?usp=drive_link` dibuang dari setiap pautan Google
 * Drive. Ia tidak diperlukan untuk membuka folder, dan ia menanda dari mana
 * pautan itu dikongsi.
 */

export interface Panitia {
  kod: string;
  nama: string;
  /** URL eRPM panitia ini; null = belum disediakan. */
  pautan: string | null;
  catatan?: string;
  /**
   * Panitia ini BUKAN mata pelajaran dalam jadual waktu.
   *
   * Prasekolah ialah peringkat, bukan subjek — ia tiada slot dalam jadual
   * waktu mana-mana kelas. Tetapi ia MEMANG ada ruang eRPM sendiri, jadi ia
   * tergolong dalam senarai ini. Bendera ini menghalangnya daripada masuk
   * ke `SUBJEK`, yang memacu penghurai jadual waktu: satu kod palsu di sana
   * menjadi padanan palsu pada setiap jadual yang mengandungi perkataan itu.
   */
  bukanSubjek?: boolean;
}

export const PANITIA: Panitia[] = [
  {
    kod: "PAI", nama: "Pendidikan Islam", pautan: "https://gpi.edu.my",
    catatan: "Sudah hidup — eRPM penuh: tanda SP, TP, sumatif dan slip.",
  },
  { kod: "BM", nama: "Bahasa Melayu", pautan: "https://sktdplus.com/lamanbahasa" },
  {
    kod: "BI", nama: "Bahasa Inggeris",
    pautan: "https://drive.google.com/drive/folders/1KxfxRf5Sy7vTsYS47Dpy6YSRQJ09fHYp",
  },
  { kod: "MM", nama: "Matematik", pautan: "https://mylink.la/matematiksktd" },
  { kod: "SAINS", nama: "Sains", pautan: "https://linktr.ee/cikgusaidal" },
  {
    kod: "SEJ", nama: "Sejarah", catatan: "Tahun 4–6 sahaja.",
    pautan: "https://drive.google.com/drive/folders/1s6EM13FjKjQHCJFBGnADWNFSFUQWTY51",
  },
  { kod: "PM", nama: "Pendidikan Moral", pautan: "https://tinyurl.com/bd87ds6f" },
  {
    kod: "RBT", nama: "Reka Bentuk & Teknologi", catatan: "Tahun 4–6 sahaja.",
    pautan: "https://mylink.la/cikgurbtsktd",
  },
  {
    kod: "PJPK", nama: "Pendidikan Jasmani & Kesihatan",
    pautan: "https://drive.google.com/drive/folders/1PXIY1VVnT_0ttFyqcRY7pPekCCnQn_If",
  },
  {
    kod: "PSV", nama: "Pendidikan Seni Visual", pautan: "https://shorturl.at/TwMoe",
    // ⚠️ Satu-satunya pautan yang tidak dapat disahkan automatik:
    // shorturl.at memulangkan 403 kepada setiap permintaan bukan-pelayar,
    // termasuk dengan User-Agent pelayar. Ia berkemungkinan besar berfungsi
    // dalam pelayar sebenar — tetapi ia BELUM disahkan, dan amaran ini
    // kekal sehingga seseorang membukanya.
    catatan: "Pautan belum disahkan — shorturl.at menyekat semakan automatik.",
  },
  { kod: "PMZ", nama: "Pendidikan Muzik", pautan: "https://mylink.la/cikguparames27" },
  {
    kod: "AR", nama: "Bahasa Arab",
    pautan: "https://panitiabahasaarabsktd.my.canva.site/pbe/e--rpm-bahasa-arab",
  },
  {
    kod: "BC", nama: "Bahasa Cina", catatan: "Guru Bahasa Cina (SK).",
    pautan: "https://panitiabahasaarabsktd.my.canva.site/pbe/e-rpm-bahasa-cina",
  },
  // Dua subjek Pendidikan Khas (PPKI) dan satu peringkat — ketiga-tiganya
  // mempunyai ruang eRPM sendiri, dan ketiga-tiganya tiada dalam senarai 13
  // panitia asal.
  {
    kod: "KHA", nama: "Kemahiran Hidup Asas",
    pautan: "https://sites.google.com/moe-dl.edu.my/panitia-kh-tmk/home",
  },
  {
    kod: "PKH", nama: "Pengurusan Kehidupan",
    pautan: "https://sites.google.com/moe-dl.edu.my/panitiapengurusankehidupan/home",
  },
  {
    kod: "PRA", nama: "Prasekolah", bukanSubjek: true,
    pautan: "https://tinyurl.com/ERPMPrasekolah",
    catatan: "Peringkat, bukan mata pelajaran — tiada slot dalam jadual waktu.",
  },
];
