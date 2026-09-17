/**
 * BAHAGIAN PORTAL — ikut Buku Pengurusan Tahunan SKTD
 * =========================================================================
 * Ditrace dari `~/Desktop/PPGB/BUKU PENGURUSAN SKTD25  25JAN25.pdf` (174 muka,
 * dibaca 16 Sep 2026).  Unit sebenar dalam buku itu:
 *
 *   m. 53–76   UNIT PENGURUSAN & PENTADBIRAN
 *   m. 77–88   UNIT KURIKULUM  (termasuk 13 panitia mata pelajaran)
 *   m. 89–106  UNIT HAL EHWAL MURID
 *   m.107–140  KOKURIKULUM  (JK Induk m.117, Unit-unit m.122)
 *
 * KENAPA FAIL INI WUJUD: sebelum ini hab memapar SATU grid rata semua app.
 * Guru terpaksa mengimbas semua kad untuk mencari satu.  Buku Pengurusan
 * sudah pun membahagikan kerja sekolah kepada unit, dan setiap guru sudah tahu
 * unit mereka — jadi hab mengikut pembahagian yang SAMA, bukan mencipta
 * pembahagian baharu yang orang perlu belajar.
 *
 * URUTAN: mengikut susunan yang pengguna tetapkan (16 Sep 2026) —
 * Pentadbiran, Kurikulum, Kokurikulum, Hal Ehwal Murid.  Buku Pengurusan
 * meletakkan HEM sebelum Kokurikulum; urutan pengguna diutamakan kerana
 * ia boleh disunting oleh admin mutlak (lihat `src/lib/kad-portal.ts`).
 *
 * DUA BAHAGIAN TAMBAHAN yang BUKAN unit dalam Buku Pengurusan, dan sengaja
 * diasingkan supaya tidak bercampur dengan unit rasmi:
 *   · `kakitangan` — urusan pengkeranian / pejabat (AKP)
 *   · `badan`      — BKGK dan PIBG: badan berasingan, bukan unit sekolah
 */

// Import relatif dengan sambungan .ts supaya fail ini boleh dijalankan terus
// oleh Node semasa ujian; Next mengendalikannya sama sahaja.
import { SEKOLAH, type AppPortal } from "./sekolah.ts";
import { boleh, type Keupayaan, type PerananBerkesan } from "../lib/peranan.ts";

export const KOD_BAHAGIAN = [
  "pentadbiran",
  "kurikulum",
  "kokurikulum",
  "hem",
  "kakitangan",
  "badan",
] as const;

export type KodBahagian = (typeof KOD_BAHAGIAN)[number];

export interface Bahagian {
  kod: KodBahagian;
  nama: string;
  /** Satu baris — kenapa bahagian ini wujud, dalam bahasa guru. */
  ringkas: string;
  /** Muka surat rujukan dalam Buku Pengurusan; null jika bukan unit rasmi. */
  muka: string | null;
}

export const BAHAGIAN: Bahagian[] = [
  {
    kod: "pentadbiran",
    nama: "Pengurusan & Pentadbiran",
    ringkas: "Urusan am sekolah, surat, mesyuarat, aset dan maklumat.",
    muka: "53–76",
  },
  {
    kod: "kurikulum",
    nama: "Kurikulum",
    ringkas: "Pentaksiran, panitia mata pelajaran, jadual waktu dan PdPc.",
    muka: "77–88",
  },
  {
    kod: "kokurikulum",
    nama: "Kokurikulum",
    ringkas: "Unit beruniform, kelab, persatuan, sukan dan PAJSK.",
    muka: "107–140",
  },
  {
    kod: "hem",
    nama: "Hal Ehwal Murid",
    ringkas: "Kehadiran, disiplin, kebajikan, bantuan dan kesihatan murid.",
    muka: "89–106",
  },
  {
    kod: "kakitangan",
    nama: "Kakitangan & Pengkeranian",
    ringkas: "Urusan pejabat: fail, perkhidmatan, cuti dan rekod kakitangan.",
    muka: null,
  },
  {
    kod: "badan",
    nama: "Badan & Persatuan",
    // Kosong dengan sengaja: nama bahagian sudah cukup memberitahu.
    ringkas: "",
    muka: null,
  },
];

/* ------------------------------------------------------------------ kad ---- */

/**
 * App yang SUDAH ada dalam `sekolah.ts`, dipetakan ke bahagiannya.
 * Disimpan berasingan daripada `sekolah.ts` supaya fail data yang dikongsi
 * dengan laman awam tidak perlu tahu apa-apa tentang susun atur hab.
 */
const BAHAGIAN_APP: Record<string, KodBahagian> = {
  urusweb: "pentadbiran",
  findelima: "pentadbiran",
  erpm: "kurikulum",
  bkgk: "badan",
  payibg: "badan",
};

/**
 * Modul yang DIPERSETUJUI tetapi belum dibina.  Ia muncul sebagai kad dengan
 * tapak pembinaan (`/bina/<id>`), bukan disembunyikan.
 *
 * SEBAB ia dipapar dan bukan disembunyikan: guru bertanya berulang kali
 * "bila sistem tempahan bilik siap?".  Kad yang jujur menjawab soalan itu
 * sekali; kad yang tiada menjadikan soalan itu berulang.
 *
 * `bina` = kerja sedang berjalan · `reka` = reka bentuk · `akan` = belum mula.
 */
/** Perkara yang modul ini akan buat — dipapar di tapak pembinaannya. */
export type KadBaharu = AppPortal & {
  bahagian: KodBahagian;
  rancangan?: string[];
  /** Keupayaan yang DIPERLUKAN untuk melihat kad ini langsung. */
  perlu?: Keupayaan;
};

export const KAD_TAMBAHAN: KadBaharu[] = [
  /* --- Pengurusan & Pentadbiran --- */
  // Kad "Buku Pengurusan" DIBUANG dari hab (17 Sep 2026): ia menunjuk ke
  // /admin/pengurusan, destinasi yang SAMA seperti alat "Buku Pengurusan"
  // dalam Urus Laman. Dua kad ke satu tempat bermakna guru membaca
  // kedua-duanya sebelum sedar ia benda yang sama.
  {
    id: "takwim", bahagian: "pentadbiran",
    nama: "Takwim", ikon: "TKW", warna: "#123561",
    fungsi: "Takwim sekolah sepanjang tahun — minggu, tarikh, hari dan program.",
    domain: "portal.sktd.edu.my/takwim", pautan: "/takwim", status: "sedia",
    // SKOP DIPENDEKKAN dengan sengaja (keputusan pengguna, 17 Sep 2026):
    // TIADA muat naik minit curai, dan TIADA nama orang yang bertindak.
    // Kad ini menjawab satu soalan sahaja — "bila mesyuarat seterusnya?" —
    // dan menjawabnya terus dari takwim Buku Pengurusan. Minit mesyuarat
    // mengandungi perbincangan dalaman; menyimpannya dalam portal ialah
    // keputusan berasingan yang belum dibuat.
    catatan: "Program dan panggilan mesyuarat digabung dalam satu kalendar. "
      + "Minit dan tindakan susulan TIDAK disimpan di sini.",
  },
  {
    id: "tempahan", bahagian: "pentadbiran",
    nama: "Tempahan Bilik Khas", ikon: "BLK", warna: "#2b5f8a",
    fungsi: "Tempah makmal komputer, bilik mesyuarat, bilik BOSS dan dewan.",
    domain: "portal.sktd.edu.my/bilik", pautan: "/bilik", status: "sedia",
    // SKOP DIPENDEKKAN dengan sengaja. Rancangan asal mengandungi
    // "kelulusan pentadbir untuk bilik tertentu" — satu aliran kelulusan
    // penuh untuk masalah yang belum wujud. Papan kenyataan yang digantikan
    // modul ini tiada kelulusan langsung; sesiapa yang menulis dahulu,
    // dapat. Modul ini melakukan perkara yang sama, cuma tanpa dua orang
    // menulis pada baris yang sama.
    catatan: "Siapa tempah dahulu, dia dapat. Tiada aliran kelulusan — "
      + "pentadbir boleh membatalkan mana-mana tempahan bila perlu.",
  },
  {
    id: "inventori", bahagian: "pentadbiran",
    nama: "Inventori ICT", ikon: "INV", warna: "#0f766e",
    fungsi: "Barang yang unit ICT selenggara, dan permohonan barang oleh guru.",
    domain: "portal.sktd.edu.my/inventori", pautan: "/inventori", status: "sedia",
    akses: "Semua guru boleh memohon · penyelia unit memutuskan",
    // SKOP KECIL dengan sengaja. Bukan sistem aset KWAPM dengan nombor siri
    // dan susut nilai — itu sistem berbeza dengan peraturan perakaunan
    // berbeza, dan membinanya separuh jalan lebih teruk daripada tidak.
    catatan: "Unit dimaklumkan setiap kali permohonan masuk. "
      + "Bukan sistem aset KWAPM — tiada nombor siri atau susut nilai.",
  },
  {
    id: "borang", bahagian: "pentadbiran",
    nama: "Borang Sekolah", ikon: "BRG", warna: "#4a4a7a",
    fungsi: "Borang rasmi dalam talian dengan tandatangan digital.",
    domain: "portal.sktd.edu.my/borang", domainCadangan: true, status: "reka",
    catatan: "Header, margin dan susun atur mesti sebijik sama dengan borang kertas asal.",
    rancangan: [
      "Borang rasmi sekolah dalam talian — header dan margin sebijik sama dengan borang kertas asal",
      "Dua cara tandatangan: tulis terus pada papan digital, ATAU muat naik gambar tandatangan",
      "Tandatangan yang dimuat naik dipotong automatik dan latarnya dibuang",
      "Cetak semula PDF bila-bila masa",
    ],
  },

  /* --- Kurikulum --- */
  // SATU KAD, dua konsep di dalamnya (keputusan pengguna, 17 Sep 2026).
  //
  // Ia pernah dipecah kepada dua kad, dan itu menjadikan hab serabut: hab
  // ialah tempat guru mencari kerja mereka, dan dua kad yang namanya hampir
  // sama memaksa mereka membaca kedua-duanya sebelum memilih. Pembahagian
  // kerja tetap wujud — ia berlaku SATU skrin ke dalam, di mana guru sudah
  // tahu mereka berada di ePBD.
  {
    id: "pbd", bahagian: "kurikulum",
    nama: "ePBD", ikon: "PBD", warna: "#1f6f5c",
    fungsi: "Guru subjek mengisi TP dan gred; guru kelas mencetak slip kelas.",
    domain: "portal.sktd.edu.my/pbd", pautan: "/pbd", status: "sedia",
    // TIADA `perlu`: setiap guru perlu membukanya. Halaman di dalamnya yang
    // menapis kelas dan subjek mana mereka boleh sentuh.
    akses: "Guru subjek, guru kelas, pentadbir & admin",
    catatan: "Penandaan Standard Prestasi kekal di eRPM setiap panitia.",
  },
  {
    id: "jadual", bahagian: "kurikulum",
    nama: "Jadual Waktu", ikon: "JDL", warna: "#1b4a80",
    fungsi: "Jadual waktu setiap kelas — ibu bapa melihatnya di laman sekolah.",
    domain: "sktd.edu.my/jadual", pautan: "/admin/jadual", status: "sedia",
    // TIADA `perlu`: guru kelas menyunting jadual kelasnya sendiri di sini.
    // Halaman itu sendiri menapis kelas mana mereka boleh sentuh.
    akses: "Guru kelas, pentadbir & admin",
  },

  /* --- Kokurikulum --- */
  {
    id: "kokurikulum", bahagian: "kokurikulum",
    nama: "Unit Kokurikulum", ikon: "KOK", warna: "#146b56",
    fungsi: "Pendaftaran ahli unit beruniform, kelab, persatuan dan sukan.",
    domain: "portal.sktd.edu.my/kokurikulum", domainCadangan: true, status: "akan",
    catatan: "Buku Pengurusan m.122 — senarai unit dan penyelaras sudah ada. "
      + "PAJSK tidak dijadikan kad berasingan: ia dibuat melalui eOperasi KPM.",
    rancangan: [
      "Pendaftaran ahli unit beruniform, kelab, persatuan dan sukan",
      "Senarai penyelaras dan guru penasihat dari Buku Pengurusan m.122",
      "Kehadiran aktiviti mingguan",
      "Laporan aktiviti untuk fail unit",
    ],
  },

  /* --- Hal Ehwal Murid --- */
  {
    id: "kehadiran", bahagian: "hem",
    nama: "Kehadiran & RMT", ikon: "HDR", warna: "#8a4b12",
    fungsi: "Kehadiran harian murid dan senarai Rancangan Makanan Tambahan.",
    domain: "portal.sktd.edu.my/kehadiran", domainCadangan: true, status: "reka",
    rancangan: [
      "Kehadiran harian mengikut kelas",
      "Senarai murid RMT dan kutipan harian",
      "Amaran murid kerap tidak hadir kepada guru kelas",
      "Laporan bulanan untuk HEM",
    ],
  },
  {
    id: "disiplin", bahagian: "hem",
    nama: "Disiplin & Sahsiah", ikon: "DSP", warna: "#9a3b3b",
    fungsi: "Rekod salah laku, tindakan dan pemantauan sahsiah murid.",
    domain: "portal.sktd.edu.my/disiplin", domainCadangan: true, status: "akan",
    catatan: "Buku Pengurusan m.89 — penyelaras disiplin sudah dilantik.",
    // Rekod salah laku murid. Bukan untuk semua kakitangan.
    perlu: "lihat_data_murid",
    rancangan: [
      "Rekod salah laku dengan tarikh, saksi dan tindakan",
      "Akses terhad — bukan semua guru boleh membaca semua rekod",
      "Pemantauan kes berulang",
      "Laporan untuk Lembaga Disiplin",
    ],
  },

  /* --- Kakitangan & Pengkeranian --- */
  {
    id: "pengkeranian", bahagian: "kakitangan",
    nama: "Urusan Pengkeranian", ikon: "AKP", warna: "#5a5a5a",
    fungsi: "Fail perkhidmatan, cuti, perakuan dan rekod kakitangan.",
    domain: "portal.sktd.edu.my/pengkeranian", domainCadangan: true, status: "akan",
    akses: "Pembantu Tadbir & pentadbir",
    rancangan: [
      "Rekod fail perkhidmatan kakitangan",
      "Permohonan dan baki cuti",
      "Surat perakuan dan pengesahan jawatan",
      "Senarai semak dokumen untuk guru baharu lapor diri",
    ],
  },
];

/**
 * Pindaan kepada kad sedia ada dalam `sekolah.ts`.
 *
 * eRPM membuka halaman panitia DALAM portal ini. Ia bukan app berasingan,
 * dan tidak akan menjadi satu: setiap panitia sudah membina ruang eRPM
 * mereka sendiri, dan tugas portal ialah mengumpulkan pautan itu.
 */
const PINDAAN: Record<string, Partial<KadPortal>> = {
  // Urus Laman menerbitkan kandungan awam — itu kuasa, bukan kemudahan.
  urusweb: { perlu: "terbit_kandungan" },
  erpm: {
    pautan: "/erpm",
    fungsi: "Ruang eRPM setiap panitia mata pelajaran.",
    akses: "Semua guru",
  },
};

/** Semua kad hab: yang sedia ada + yang tambahan, dengan bahagian masing-masing. */
export type KadPortal = AppPortal & {
  bahagian: KodBahagian;
  rancangan?: string[];
  /**
   * Keupayaan yang DIPERLUKAN untuk melihat kad ini.
   *
   * Kad tanpa `perlu` dilihat semua kakitangan. Kad dengan `perlu`
   * DISEMBUNYIKAN sepenuhnya daripada yang tiada keupayaan itu — bukan
   * dipaparkan berkunci. Guru biasa tidak sepatutnya tahu skrin pentadbiran
   * itu wujud, apatah lagi melihat namanya.
   */
  perlu?: Keupayaan;
};

export function kadAsal(): KadPortal[] {
  const sedia = (SEKOLAH.portal as AppPortal[]).map((a) => ({
    ...a,
    ...(PINDAAN[a.id] ?? {}),
    bahagian: BAHAGIAN_APP[a.id] ?? ("pentadbiran" as KodBahagian),
  }));
  return [...sedia, ...KAD_TAMBAHAN];
}

/**
 * Kad dikumpul ikut bahagian, DITAPIS mengikut kuasa pengguna.
 *
 * Kad yang pengguna tiada keupayaannya DISEMBUNYIKAN, bukan dipaparkan
 * berkunci. Keputusan pengguna (16 Sep 2026): "Guru biasa takkanlah dapat
 * tengok kad admin kan?" — dan mereka betul. Kad berkunci tetap memberitahu
 * guru biasa skrin apa yang wujud dan siapa boleh membukanya; itu maklumat
 * yang mereka tidak perlukan.
 *
 * Bahagian yang menjadi kosong selepas ditapis turut hilang, supaya tiada
 * tajuk bahagian yang menggantung tanpa isi.
 */
export function kadIkutBahagian(
  peranan: PerananBerkesan | null,
): { bahagian: Bahagian; kad: KadPortal[] }[] {
  const semua = kadAsal().filter((k) => !k.perlu || boleh(peranan, k.perlu));
  return BAHAGIAN
    .map((b) => ({ bahagian: b, kad: semua.filter((k) => k.bahagian === b.kod) }))
    .filter((x) => x.kad.length > 0);
}
