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

export const PERANAN = [
  "admin",
  "pentadbir",
  "juruteknik",
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
  juruteknik: "Juruteknik",
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
  juruteknik:
    "Lihat status sistem dan diagnostik. TIDAK boleh lihat data murid atau terbitkan kandungan.",
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
  | "urus_admin";

const KEUPAYAAN: Record<PerananBerkesan, Keupayaan[]> = {
  admin_mutlak: ["urus_akses", "terbit_kandungan", "lihat_data_murid",
                 "lihat_diagnostik", "urus_portal", "urus_admin"],
  // Admin TIDAK dapat `urus_admin` — lihat nota "Jawatankuasa admin" di bawah.
  admin:        ["urus_akses", "terbit_kandungan", "lihat_data_murid", "lihat_diagnostik"],
  // Pentadbir (GB, PK, guru kanan) BOLEH urus akses — keputusan pengguna
  // 16 Sep 2026. Menentukan siapa dapat masuk ialah keputusan pentadbiran
  // sekolah, bukan keputusan teknikal, jadi ia milik mereka.
  pentadbir:    ["urus_akses", "terbit_kandungan", "lihat_data_murid"],
  // Juruteknik sengaja TIADA lihat_data_murid. Kerja teknikal tidak
  // memerlukan No. KP atau gred murid, jadi ia tidak diberi.
  juruteknik:   ["lihat_diagnostik"],
  kakitangan:   [],
  guru:         [],
};

export function boleh(p: PerananBerkesan | null, k: Keupayaan): boolean {
  if (!p) return false;
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
