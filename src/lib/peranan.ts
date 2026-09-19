/**
 * Peranan dalam portal — dan siapa boleh buat apa.
 *
 * DUA LAPISAN, SENGAJA BERBEZA:
 *
 * 1. ADMIN MUTLAK — daripada env `ADMIN_EMAILS`, bukan pangkalan data.
 *    Mereka TIDAK boleh dibuang oleh sesiapa melalui UI, termasuk oleh admin
 *    lain. Sebabnya: kalau semua kebenaran hidup dalam DB, satu kesilapan
 *    (atau satu orang yang marah) boleh mengunci semua orang keluar dari
 *    portal sekolah selamanya. Env ialah kunci pendua yang sentiasa ada.
 *
 * 2. SEMUA YANG LAIN — dalam `pbd_guru` (peranan + dibenarkan), diurus oleh
 *    admin melalui skrin Akses. Ini yang berubah kerap, jadi ia perlu boleh
 *    diubah tanpa deploy.
 *
 * Admin mutlak BUKAN sekadar "admin yang lain". Ia peranan berasingan.
 */

/**
 * Peranan SENGAJA SEDIKIT.
 *
 * "Juruteknik" pernah ada di sini dan dibuang atas permintaan pengguna
 * (16 Sep 2026): senarai jawatan yang panjang menjadikan skrin akses semak
 * dan menyukarkan keputusan mudah. Kerja teknikal dilakukan oleh admin.
 * Setiap peranan baharu mesti membawa perbezaan kuasa yang NYATA, bukan
 * sekadar nama jawatan yang berbeza.
 *
 * `kerani` dan `unit_ict` ditambah (18 Sep 2026) atas permintaan pengguna,
 * dan KEDUA-DUANYA lulus ujian di atas:
 *   · `kerani` — satu-satunya peranan yang memproses peti masuk Urusan
 *     Pejabat (nombor rujukan surat rasmi) sebelum ia diberikan juga
 *     kepada pentadbir/admin (permintaan B.4 — bukan menggantikan kerani).
 *   · `unit_ict` — urus tempahan bilik khas, kuasa yang sebelum ini terkunci
 *     kepada pentadbir ke atas sahaja.
 */
export const PERANAN = [
  "admin",
  "pentadbir",
  "kerani",
  "unit_ict",
  "kakitangan",
  "guru",
] as const;

export type Peranan = (typeof PERANAN)[number];

/** Peranan berkesan seseorang, termasuk lapisan mutlak. */
export type PerananBerkesan = Peranan | "admin_mutlak";

export const NAMA_PERANAN: Record<PerananBerkesan, string> = {
  admin_mutlak: "Admin Mutlak",
  admin: "Admin",
  pentadbir: "Pentadbir",
  kerani: "Kerani",
  unit_ict: "Unit ICT",
  kakitangan: "Kakitangan",
  guru: "Guru",
};

export const HURAIAN_PERANAN: Record<PerananBerkesan, string> = {
  admin_mutlak:
    "Kuasa penuh. Ditetapkan dalam env, tidak boleh dibuang melalui portal — ini kunci pendua supaya sekolah tidak boleh terkunci keluar.",
  admin:
    "Urus kandungan laman, urus senarai akses, dan semua fungsi pentadbir.",
  pentadbir:
    "Urus kandungan laman web dan lihat laporan. Tidak boleh ubah senarai akses.",
  kerani: "Proses surat rasmi di Urusan Pejabat — beri nombor rujukan kami.",
  unit_ict: "Urus tempahan bilik khas dan permintaan peralatan ICT.",
  kakitangan: "Guna aplikasi kakitangan. Tiada akses pentadbiran.",
  guru: "Guna aplikasi guru. Tiada akses pentadbiran.",
};

/* ---------------------------------------------------------------- keupayaan */

/**
 * Keupayaan dinyatakan sebagai senarai putih per peranan, BUKAN sebagai
 * "aras" berangka. Aras berangka menggoda orang menulis `aras >= 3`, dan itu
 * memberi kuasa baharu kepada peranan lama secara senyap setiap kali peranan
 * baharu disisipkan di tengah.
 */
export type Keupayaan =
  | "urus_akses"      // tambah/buang orang, tukar peranan
  | "terbit_kandungan" // tulis & terbit pos laman awam
  | "lihat_data_murid"
  | "lihat_diagnostik"
  // Susun atur hab: bahagian, urutan dan status kad. Admin MUTLAK sahaja —
  // ini menukar apa yang SEMUA orang nampak, jadi ia bukan kerja harian.
  | "urus_portal"
  // Lantik / buang ahli jawatankuasa admin. Admin MUTLAK sahaja.
  | "urus_admin"
  // Tetapkan SIAPA guru kelas bagi setiap kelas. Pentadbir ke atas.
  // Ini keputusan pentadbiran sekolah, bukan keputusan teknikal.
  | "urus_guru_kelas"
  // Muat naik dan sahkan Buku Pengurusan Tahunan. Pentadbir ke atas.
  //
  // BUKAN `urus_portal` (admin mutlak sahaja): buku pengurusan ialah dokumen
  // rasmi sekolah, dan orang yang menyusunnya ialah pentadbir. Mengunci ia
  // kepada admin mutlak bermakna orang yang menulis buku itu tidak boleh
  // memuat naiknya.
  | "urus_pengurusan"
  // Menempah bilik ialah kerja harian setiap guru, bukan kuasa pentadbiran.
  // Yang dipagar ialah MENGURUS senarai bilik dan membatalkan tempahan
  // orang lain.
  | "urus_bilik"
  // Beri nombor rujukan kami & proses surat rasmi Urusan Pejabat.
  // Kerani, DAN pentadbir/admin (permintaan pengguna B.4: "apa yang diberi
  // kuasa kepada kerani, ia juga diberi kuasa kepada pentadbir dan admin" —
  // supaya urusan pejabat tidak tersekat bila kerani tiada).
  | "urus_pejabat"
  // Rekod & baca salah laku murid. BUKAN sama dengan `lihat_data_murid`:
  // guru biasa boleh MEREKOD (semua guru), tetapi hanya guru disiplin,
  // pentadbir dan admin boleh MEMBACA rekod orang lain (permintaan F.3).
  | "urus_disiplin";

const KEUPAYAAN: Record<PerananBerkesan, Keupayaan[]> = {
  admin_mutlak: ["urus_akses", "terbit_kandungan", "lihat_data_murid",
                 "lihat_diagnostik", "urus_portal", "urus_admin",
                 "urus_guru_kelas", "urus_pengurusan", "urus_bilik",
                 "urus_pejabat", "urus_disiplin"],
  // Admin TIDAK dapat `urus_admin` — lihat nota "Jawatankuasa admin" di bawah.
  admin:        ["urus_akses", "terbit_kandungan", "lihat_data_murid",
                 "lihat_diagnostik", "urus_guru_kelas", "urus_pengurusan", "urus_bilik",
                 "urus_pejabat", "urus_disiplin"],
  // Pentadbir (GB, PK, guru kanan) BOLEH urus akses — keputusan pengguna
  // 16 Sep 2026. Menentukan siapa dapat masuk ialah keputusan pentadbiran
  // sekolah, bukan keputusan teknikal, jadi ia milik mereka.
  pentadbir:    ["urus_akses", "terbit_kandungan", "lihat_data_murid",
                 "urus_guru_kelas", "urus_pengurusan", "urus_bilik",
                 "urus_pejabat", "urus_disiplin"],
  // Kerani: HANYA `urus_pejabat`. Tiada akses data murid, tiada urus akses.
  kerani:       ["urus_pejabat"],
  // Unit ICT: urus bilik khas & peralatan — kuasa yang sebelum ini terkunci
  // kepada pentadbir ke atas sahaja.
  unit_ict:     ["urus_bilik"],
  kakitangan:   [],
  guru:         [],
};

export function boleh(p: PerananBerkesan | null, k: Keupayaan): boolean {
  if (!p) return false;

  // 1. Admin Mutlak (Super Admin) - Bypass semua
  if (p === "admin_mutlak") return true;

  // 2. Admin (Bawah Mutlak) - Mempunyai akses penuh ke hampir semua keupayaan
  // Nota: Admin tidak mempunyai 'urus_admin' (khas untuk mutlak)
  if (p === "admin") {
      if (k === "urus_admin") return false;
      return true;
  }

  // 3. Pentadbir (Bawah Admin) - Mempunyai akses ke fungsi pentadbiran asas
  if (p === "pentadbir") {
      const keupayaanPentadbir: Keupayaan[] = [
          "terbit_kandungan", "lihat_data_murid", "urus_guru_kelas",
          "urus_pengurusan", "urus_bilik", "urus_pejabat", "urus_disiplin"
      ];
      return keupayaanPentadbir.includes(k);
  }

  return KEUPAYAAN[p].includes(k);
}

/** Admin mutlak tidak boleh diturunkan pangkat atau dibuang melalui UI. */
export function bolehDiubah(p: PerananBerkesan): boolean {
  return p !== "admin_mutlak";
}

/* ------------------------------------------- jawatankuasa admin: dirahsiakan */

/**
 * Peranan yang seseorang boleh BERIKAN kepada orang lain.
 *
 * Keputusan pengguna (16 Sep 2026): keahlian jawatankuasa admin — dan wujudnya
 * lapisan admin mutlak — dirahsiakan daripada admin lain, "agar tiada gila
 * kuasa".  Maka:
 *
 *   · hanya admin mutlak boleh melantik `admin`
 *   · senarai akses menyembunyikan baris `admin` daripada bukan-mutlak
 *   · `admin_mutlak` tidak pernah muncul sebagai pilihan kepada sesiapa —
 *     ia hidup dalam env, bukan dalam DB
 *
 * Ini kerahsiaan melalui PENAPISAN PAPARAN, bukan kawalan keselamatan; kuasa
 * sebenar tetap ditentukan `KEUPAYAAN` di atas pada setiap tindakan pelayan.
 */
export function perananBolehDiberi(oleh: PerananBerkesan | null): Peranan[] {
  if (oleh === "admin_mutlak") return [...PERANAN];
  return PERANAN.filter((r) => r !== "admin");
}

/** Baris yang patut disembunyikan daripada `oleh`. */
export function sembunyiBaris(oleh: PerananBerkesan | null, peranan: Peranan): boolean {
  return peranan === "admin" && oleh !== "admin_mutlak";
}
