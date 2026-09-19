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
 * SATU BAHAGIAN TAMBAHAN yang BUKAN unit dalam Buku Pengurusan:
 *   · `badan` — BKGK dan PIBG: badan berasingan, bukan unit sekolah
 *
 * `kakitangan` ("Kakitangan & Pengkeranian") DIBUANG (18 Sep 2026, permintaan
 * pengguna B.2): kad "Urusan Pejabat" (dahulu "Urusan Pengkeranian")
 * dipindah ke `pentadbiran`, terus selepas "Urus Laman" — urusan pejabat
 * ialah sebahagian pentadbiran sekolah, bukan bahagian berasingan yang
 * hanya membawa satu kad.
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
    // Dahulu "Urusan Pengkeranian" dalam bahagian `kakitangan` berasingan.
    // Dinamakan semula & dipindah (18 Sep 2026, permintaan pengguna B.1/B.2):
    // "Urusan Pejabat" lebih profesional, dan ia kini kad KEDUA dalam
    // Pengurusan & Pentadbiran — terus selepas Urus Laman.
    id: "pejabat", bahagian: "pentadbiran",
    nama: "Urusan Pejabat", ikon: "PEJ", warna: "#5a5a5a",
    fungsi: "Peti masuk surat rasmi — beri nombor rujukan kami, dan rekod kakitangan.",
    domain: "portal.sktd.edu.my/pejabat", pautan: "/pejabat", status: "bina",
    // Kad ini HANYA untuk kerani, pentadbir & admin (permintaan B.4: kuasa
    // kerani turut diberi kepada pentadbir & admin). Guru biasa menghantar
    // surat rasmi melalui kad "Borang Sekolah" — mereka tidak perlu tahu
    // skrin pemprosesan ini wujud.
    perlu: "urus_pejabat",
    akses: "Kerani, pentadbir & admin",
    catatan: "Setiap surat rasmi yang dihantar dari Borang Sekolah tiba di sini "
      + "untuk diberi nombor rujukan kami.",
    rancangan: [
      "Rekod fail perkhidmatan kakitangan",
      "Permohonan dan baki cuti",
      "Senarai semak dokumen untuk guru baharu lapor diri",
    ],
  },
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
    nama: "Tempahan & Inventori", ikon: "BLK", warna: "#2b5f8a",
    fungsi: "Tempah bilik khas, dan minta peralatan ICT untuk tempahan itu.",
    domain: "portal.sktd.edu.my/bilik", pautan: "/bilik", status: "sedia",
    // SKOP DIPENDEKKAN dengan sengaja. Rancangan asal mengandungi
    // "kelulusan pentadbir untuk bilik tertentu" — satu aliran kelulusan
    // penuh untuk masalah yang belum wujud. Papan kenyataan yang digantikan
    // modul ini tiada kelulusan langsung; sesiapa yang menulis dahulu,
    // dapat. Modul ini melakukan perkara yang sama, cuma tanpa dua orang
    // menulis pada baris yang sama.
    // INVENTORI ICT ADA DI DALAM KAD INI, bukan kad sendiri. Keputusan
    // pengguna: menempah bilik dan meminta peralatan untuk bilik itu ialah
    // satu kerja, dan dua kad untuk satu kerja "semak dan serabut je".
    // Unit ICT (peranan baharu, 18 Sep 2026 — permintaan M) turut menguruskan
    // tempahan bilik khas, sama seperti pentadbir/admin.
    catatan: "Termasuk permohonan peralatan ICT untuk bilik yang ditempah. "
      + "Siapa tempah dahulu, dia dapat — pentadbir & Unit ICT boleh membatalkan bila perlu.",
  },
  {
    id: "borang", bahagian: "pentadbiran",
    nama: "Borang Sekolah", ikon: "BRG", warna: "#4a4a7a",
    fungsi: "Borang rasmi dalam talian dengan tandatangan digital.",
    domain: "portal.sktd.edu.my/borang/urus", pautan: "/borang/urus", status: "sedia",
    catatan: "Surat rasmi ringkas (Alamat/Tarikh/Tajuk/Isi) dengan nama & jawatan Guru "
      + "Besar diisi automatik — boleh ditukar kepada wakil pentadbir semasa. "
      + "Borang Kebenaran Gambar dan Surat Akuan Penyertaan Aktiviti turut di sini.",
    rancangan: [
      "Surat Akuan Penyertaan Aktiviti — pengisian pukal ibu bapa",
    ],
  },
  {
    // Kad hab BAHARU (permintaan pengguna K, 18 Sep 2026): guru kelas
    // sebelum ini tiada satu tempat untuk kerja pukal yang melibatkan
    // kelasnya. Tulisan sengaja PENDEK — arahan panjang menyerabutkan.
    id: "guru-kelas-portal", bahagian: "pentadbiran",
    nama: "Guru Kelas", ikon: "GK", warna: "#1f6f8a",
    fungsi: "Satu tempat untuk semua kerja kelas anda — pukal, bukan satu-satu.",
    domain: "portal.sktd.edu.my/guru-kelas", pautan: "/guru-kelas", status: "bina",
    akses: "Guru kelas, pentadbir & admin",
  },
  {
    // Kad BAHARU (permintaan pengguna G, 18 Sep 2026). Laporan & amaran PK
    // HEM SENGAJA TIDAK dibina — ia sudah ada di DELIMa (kerja berulang).
    id: "kawalan-kelas", bahagian: "pentadbiran",
    nama: "Rekod Kawalan Kelas & Kehadiran", ikon: "RKK", warna: "#3a6f4a",
    fungsi: "Guru yang masuk kelas, subjek, relief, dan carta kehadiran harian.",
    domain: "portal.sktd.edu.my/kawalan-kelas", pautan: "/kawalan-kelas", status: "bina",
    catatan: "Direkod setiap kali guru masuk kelas — nama guru, subjek, relief (jika "
      + "ada), masalah disiplin dalam kelas, dan kehadiran murid hari itu.",
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
    // Dahulu "Kehadiran & RMT" — dipecah (18 Sep 2026, permintaan pengguna
    // E): kehadiran harian umum kini di kad "Rekod Kawalan Kelas &
    // Kehadiran" (Pengurusan & Pentadbiran); kad ini fokus RMT sahaja.
    id: "rmt", bahagian: "hem",
    nama: "RMT", ikon: "RMT", warna: "#8a4b12",
    fungsi: "Senarai murid Rancangan Makanan Tambahan dan rekod kehadiran RMT.",
    domain: "portal.sktd.edu.my/rmt", pautan: "/rmt", status: "bina",
    akses: "Guru RMT, guru bertugas mingguan, pentadbir & admin",
    catatan: "Guru RMT muat naik senarai murid ikut kelas & tahun. Guru bertugas "
      + "mingguan merekod hadir/tidak hadir — tiada kad berasingan untuk itu.",
  },
  {
    id: "disiplin", bahagian: "hem",
    nama: "Disiplin & Sahsiah", ikon: "DSP", warna: "#9a3b3b",
    fungsi: "Rekod salah laku, tindakan dan pemantauan sahsiah murid.",
    domain: "portal.sktd.edu.my/disiplin", pautan: "/disiplin", status: "bina",
    catatan: "Semua guru boleh merekod. Hanya guru disiplin, pentadbir & admin "
      + "boleh membaca rekod murid lain (permintaan F.3).",
    // SENGAJA TIADA `perlu` di sini — semua guru mesti nampak kad ini untuk
    // merekod salah laku (permintaan F.3). Sekatan BACA rekod orang lain
    // dikuatkuasakan DALAM halaman (urus_disiplin ATAU tugasan guru_disiplin),
    // bukan pada penglihatan kad.
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
