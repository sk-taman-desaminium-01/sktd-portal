/**
 * DATA SEKOLAH SEBENAR — SK Taman Desaminium
 * =========================================================================
 * Dipindahkan dari mockup `~/Desktop/SKTD Project/data/sekolah.js` (12 Sep 2026).
 * Ini BUKAN data dummy. Mockup kini dibekukan — fail INI yang hidup.
 *
 * Sumber (dikutip 2026-09-07):
 *   [1] Google Sites rasmi — sites.google.com/moe-dl.edu.my/sk-taman-desaminium
 *   [2] Malaysia Education Directory — apac.com.my/bba8284-sk-taman-desaminium.html
 *
 * ⚠️ SAHKAN DENGAN PEJABAT SEKOLAH sebelum terbit ke laman awam:
 *    - senarai pentadbir (sumber bertarikh 2025 — mungkin sudah bertukar)
 *    - enrolmen & bilangan guru (dua sumber tidak sepadan, lihat nota di bawah)
 *    - ejaan rasmi visi/misi (sumber ada salah taip; dibetulkan di sini)
 *    Senarai pengesahan penuh: `docs/tugasan-sktd.md` § 0.2.
 *
 * Apa yang TIDAK patut masuk fail ini: kandungan yang admin sunting sendiri
 * (pengumuman, aktiviti, gambar pentadbir). Itu duduk dalam DB — `web_pos`,
 * `web_halaman`, `web_media`. Fail ini hanya tetapan yang jarang berubah.
 */

export type StatusApp = "sedia" | "bina" | "reka" | "akan";

export interface Pentadbir {
  urutan: number;
  jawatan: string;
  nama: string;
  /** URL Supabase Storage. `null` = belum ada gambar → papar huruf awal nama. */
  gambar: string | null;
}

export interface Prasarana {
  no: string;
  nama: string;
}

export interface TugasIbuBapa {
  tugas: string;
  ringkas: string;
}

export interface AppPortal {
  id: string;
  nama: string;
  ikon: string;
  warna: string;
  fungsi: string;
  domain: string;
  /** Domain masih cadangan, belum disahkan. */
  domainCadangan?: boolean;
  pautan?: string;
  status: StatusApp;
  /** App dibina & diurus pasukan lain — kita hanya pautkan, jangan usik. */
  luaran?: boolean;
  /** Ikon rasmi app luaran, relatif kepada `public/`. */
  logo?: string;
  akses?: string;
  catatan?: string;
  /** Ada bila app turut berguna kepada ibu bapa → dipapar di laman AWAM juga. */
  ibuBapa?: TugasIbuBapa;
}

export interface MediaSosial {
  id: string;
  nama: string;
  pemegang: string;
  url: string;
}

export interface PautanKpm {
  nama: string;
  url: string;
  nota: string;
}

export interface KumpulanPautanKpm {
  kumpulan: string;
  item: PautanKpm[];
}

export const SEKOLAH = {
  nama: "SK Taman Desaminium",
  namaPenuh: "Sekolah Kebangsaan Taman Desaminium",
  singkatan: "SKTD",
  kod: "BBA8284", // [2]
  motto: "BERILMU, BERAKHLAK, BERJASA", // [1]
  tahunSesi: 2026,
  tajukSlip: "Pelaporan Pentaksiran Bilik Darjah Pertengahan Tahun 2026",

  /* --- Perhubungan [1][2] --- */
  hubungi: {
    alamat:
      "Persiaran Desaminium 1, Lestari Perdana,\n43300 Seri Kembangan, Selangor",
    telefon: "03-8941 3905",
    faks: "03-8941 5478",
    emel: "bba8284@moe.edu.my",
    ppd: "PPD Petaling Perdana",
    gps: { lat: 3.005567, lng: 101.660559 },
    waktuPejabat: "8:00 pagi – 5:00 petang",
    // ⚠️ SAHKAN waktu tepat dengan pejabat sekolah, kemudian ganti teks ini.
    //    JANGAN tulis arahan dalaman di sini — nilai ini dipapar kepada ibu bapa.
    waktuSekolah: "Sesi Pagi & Sesi Petang",
  },

  /* --- Pentadbir (sumber bertarikh 2025 [1]) --- */
  // ⚠️ SAHKAN senarai 2026 sebelum terbit. Nama sebenar orang awam.
  // Jadi senarai boleh disunting admin (F5) — nilai di sini hanya seed awal.
  pentadbir: [
    { urutan: 1, jawatan: "Guru Besar", nama: "SAUDAH BINTI OSMAN", gambar: null },
    { urutan: 2, jawatan: "Penolong Kanan Pentadbiran", nama: "ROSLE BIN MOHAMAD", gambar: null },
    { urutan: 3, jawatan: "Penolong Kanan Hal Ehwal Murid", nama: "LOKMAN BIN MUSTAPHA", gambar: null },
    { urutan: 4, jawatan: "Penolong Kanan Kokurikulum", nama: "KHIRYANI BINTI HAMDI", gambar: null },
    // Ditambah 15 Sep 2026. Barisan pentadbir ada LIMA Penolong Kanan, bukan
    // tiga — pengumpulan asal terlepas dua. Nama & jawatan diambil terus dari
    // halaman rasmi Google Sites (organisasi/barisan-pentadbir), dan jujukan
    // dokumen mengesahkan padanan setiap nama dengan jawatannya.
    { urutan: 5, jawatan: "Penolong Kanan Petang", nama: "NAZRULLAH BIN MOHD NOOR", gambar: null },
    { urutan: 6, jawatan: "Penolong Kanan Pendidikan Khas", nama: "NORLIZA BINTI AHMAT ZAWAWI", gambar: null },
  ] as Pentadbir[],

  /* --- Statistik --- */
  // ⚠️ SUMBER TIDAK SEPADAN: [1] sejarah sekolah menyebut 152 warga
  // (138 guru + 14 AKP) & 71 kelas; [2] direktori menyebut 2,176 murid &
  // 130 guru. Dapatkan angka rasmi terkini dari pejabat sebelum terbit.
  statistik: {
    murid: 2176, // [2] — sahkan
    guru: 138, // [1] — sahkan
    akp: 14, // [1] — sahkan
    kelas: { tahap1: 29, tahap2: 30, ppki: 8, prasekolah: 4, jumlah: 71 }, // [1]
    sesi: 2,
  },

  /* --- Visi, misi, piagam [1] --- */
  // Nota: sumber asal mengandungi salah taip ("PENDIDKAN", "BERKUALIT",
  // "MEMENUH"). Ejaan dibetulkan di sini — sahkan dengan pihak sekolah.
  visi: "Pendidikan Berkualiti · Insan Terdidik · Negara Sejahtera",
  misi:
    "Melestarikan sistem pendidikan yang berkualiti untuk membangunkan " +
    "potensi individu bagi memenuhi aspirasi negara.",
  piagam: [
    "Mengimplementasikan mutu kerja yang berkualiti untuk kemenjadian murid-murid.",
    "Memastikan semua guru mengaplikasikan sikap positif dalam merencana tugas.",
    "Jalinan komunikasi dua hala yang efektif antara guru dan ibu bapa murid.",
    "Menyemai sikap berbudaya penyayang dalam kalangan warga kerja SKTD.",
    "Sentiasa menepati masa dalam sebarang urusan berkaitan pendidikan.",
  ],

  /* --- Sejarah [1] --- */
  // ⚠️ PEMBETULAN 14 Sep 2026: sumber [1] Google Sites tertulis "Encik Yong Chow
  // Tow". Guru Besar pertama seorang PEREMPUAN — dibetulkan kepada "Puan"
  // (disahkan pengguna). JANGAN kembalikan kepada teks sumber asal.
  sejarah: [
    "SK Taman Desaminium terletak di Persiaran Desaminium 1, Lestari Perdana, " +
      "Seri Kembangan, Selangor. Pembukaan sekolah pada asalnya dirancang pada " +
      "tahun 2010, namun ditangguhkan sehingga Januari 2011 disebabkan beberapa kekangan.",
    "Sesi persekolahan bermula pada 3 Januari 2011 dengan 33 orang guru diketuai " +
      "Guru Besar pertama, Puan Yong Chow Tow, bersama tiga orang pentadbir kanan. " +
      "Kumpulan pertama seramai 980 murid ditempatkan dalam 25 buah kelas, meliputi " +
      "Tahun 1 hingga Tahun 5.",
    "Kampus asal terdiri daripada empat blok bilik darjah serta 18 kemudahan khusus " +
      "termasuk makmal komputer, surau dan bilik kaunseling.",
    "Kini sekolah beroperasi dua sesi dengan 71 bilik darjah — 29 kelas Tahap 1, " +
      "30 kelas Tahap 2, 8 kelas Pendidikan Khas dan 4 kelas prasekolah — " +
      "disokong 152 warga kerja.",
  ],

  /* --- Kelas (dari repo gpi: src/lib/kelas.ts) --- */
  // Aliran perdana mengeja akronim D.E.S.A.M.I.N.I.U.M
  kelasPerdana: [
    "DEDIKASI", "EFEKTIF", "SUKSES", "AMANAH", "MATRIKS",
    "INOVATIF", "NILAM", "INTELEK", "USAHA", "MAJU",
  ],
  // PPKI — nama bunga
  kelasKhas: [
    "SUNFLOWER", "LAVENDER", "JASMINE", "ORCHID", "LILY",
    "IRIS", "DAISY", "ROSE", "TULIP",
  ],
  // Kelas yang benar-benar dibuka ikut tahun (dari SlipOCRTab.tsx repo gpi):
  // Tahun 4–6 tiada kelas MAJU.
  kelasBase: {
    tahap1: [
      "AMANAH", "DEDIKASI", "EFEKTIF", "INOVATIF", "INTELEK",
      "MAJU", "MATRIKS", "NILAM", "SUKSES", "USAHA",
    ],
    tahap2: [
      "AMANAH", "DEDIKASI", "EFEKTIF", "INOVATIF", "INTELEK",
      "MATRIKS", "NILAM", "SUKSES", "USAHA",
    ],
  },

  /* --- Prasarana — "Jelajah Kampus" di halaman Tentang Sekolah --- */
  // Nama dari cikgu (12 Sep 2026). Setiap satu = klip drone loop resap dalam
  // public/prasarana/scene-NN.mp4 (+ poster .webp). Urutan = urutan jelajah.
  prasarana: [
    { no: "01", nama: "Blok Pentadbiran" },
    { no: "02", nama: "Gelanggang Serbaguna" },
    { no: "03", nama: "Bangunan Bilik Darjah dan Laluan Sehala" },
    { no: "04", nama: "Prasekolah" },
    { no: "05", nama: "Padang Sekolah" },
    { no: "06", nama: "Surau dan Kantin" },
    { no: "07", nama: "Tapak Perhimpunan" },
  ] as Prasarana[],

  /* --- Portal Kakitangan: hab semua app kakitangan --- */
  // Setiap app di subdomain/domain sendiri; hab hanya pelancar (tiada data app di sini).
  // Tugas pembinaan dibahagi antara guru — app `luaran` dibina & diurus pasukan lain;
  // kita hanya pautkan, tidak akses ke dalam atau bina semula.
  portal: [
    {
      id: "urusweb", nama: "Urus Laman Web", ikon: "WEB", warna: "#123561",
      fungsi: "Pos pengumuman & aktiviti, urus Buku Pengurusan dan barisan pentadbir.",
      domain: "sktd.edu.my/admin", pautan: "/admin", status: "bina",
      akses: "Pentadbir, guru kanan & admin",
    },
    {
      id: "epbd", nama: "ePBD", ikon: "PBD", warna: "#1b4a80",
      fungsi: "Slip Pelaporan Pentaksiran Bilik Darjah — semua subjek, Tahun 1–6.",
      domain: "epbd.sktd.edu.my", pautan: "https://epbd.sktd.edu.my", status: "bina",
    },
    {
      id: "erpm", nama: "eRPM", ikon: "RPM", warna: "#146b56",
      fungsi: "Penilaian PBD dalam talian untuk setiap subjek — tanda SP, TP, laporan.",
      domain: "erpm.sktd.edu.my", domainCadangan: true, status: "bina",
      catatan: "Kini Pendidikan Islam sahaja, di gpi.edu.my",
    },
    {
      id: "findelima", nama: "FinDelima", ikon: "ID", warna: "#7a4b12",
      // ikon rasmi (icon-192.png dari findelima.sktdplus.com)
      logo: "/app-ikon/findelima.png",
      fungsi: "Tapak carian ID DELIMa murid — untuk guru, admin dan ibu bapa.",
      domain: "findelima.sktdplus.com", pautan: "https://findelima.sktdplus.com",
      luaran: true, status: "sedia",
      catatan: "Dibangunkan Unit ICT SKTD · log masuk Google",
      ibuBapa: {
        tugas: "Semak ID DELIMa anak",
        ringkas: "Masukkan nombor pengenalan anak untuk dapatkan ID DELIMa.",
      },
    },
    // Nama rasmi dari fail Figma: "BKGK i-Connect". Jenama biru #0093DD; petak
    // ikon guna #0077B3 (versi lebih gelap) supaya teks putih cukup kontras.
    {
      id: "bkgk", nama: "BKGK i-Connect", ikon: "BKGK", warna: "#0077b3",
      fungsi: "Kebajikan Guru & Kakitangan — yuran, jualan, kebajikan, aduan dan pautan dalaman.",
      domain: "bkgk.sktd.edu.my", domainCadangan: true, status: "reka",
      catatan: "Mockup Figma siap: 3 skrin, 8 fungsi · diserahkan Aiman kepada kita",
    },
    {
      id: "payibg", nama: "PayIBG", ikon: "RM", warna: "#5c2f6b",
      fungsi: "Bayaran yuran dan sumbangan PIBG.",
      // subdomain sktd.edu.my — disahkan cikgu
      domain: "payibg.sktd.edu.my", status: "akan",
      ibuBapa: {
        tugas: "Bayar Yuran & Sumbangan PIBG",
        ringkas: "Bayaran dalam talian untuk yuran dan sumbangan PIBG.",
      },
    },
  ] as AppPortal[],
  // App yang ada `ibuBapa` juga dipaparkan di laman awam (bawah hero, kaki laman,
  // Hubungi). Satu senarai ini memacu kedua-dua hab kakitangan & laman awam.

  /* --- Pautan sistem KPM (BUKAN app kita) ---
     Dipapar sebagai senarai teks di BAWAH kad-kad hab, bukan sebagai kad:
     kad bermaksud "app kita, kita jaga"; ini laman luar yang kita tidak kawal.
     Setiap URL disahkan hidup 2026-09-12 (curl, ikut redirect).
     ⚠️ Mati/berubah: saps.moe.gov.my & sapsnkra.moe.gov.my (SAPS — tiada DNS),
     delima.moe.gov.my (betul: delima.edu.my), egtukar.moe.gov.my (kini di epgo),
     pajsk.moe.gov.my (kini melalui eOperasi). Semak semula setiap penggal.
     Dua sistem pertukaran YANG BERBEZA — eGTukar (GURU) di epgo.moe.gov.my,
     eTukar (BUKAN GURU / AKP) di etukar.moe.gov.my. */
  pautanKpm: [
    {
      kumpulan: "Perkhidmatan & Kerjaya",
      item: [
        { nama: "HRMIS 2.0", url: "https://hrmis2.eghrmis.gov.my/", nota: "Rekod perkhidmatan, cuti" },
        { nama: "ePrestasi", url: "https://eprestasi.moe.gov.my/", nota: "LNPT" },
        { nama: "ePangkat", url: "https://epangkat.moe.gov.my/", nota: "Kenaikan pangkat" },
        { nama: "eGTukar (guru)", url: "https://epgo.moe.gov.my/", nota: "Pertukaran GURU · portal ePGO" },
        { nama: "eTukar (bukan guru)", url: "https://etukar.moe.gov.my/", nota: "Pertukaran AKP / kakitangan sekolah" },
        { nama: "SGMy", url: "https://sgmy.moe.gov.my/", nota: "Sistem Guru Malaysia" },
        { nama: "SPLKPM", url: "https://splkpm.moe.gov.my/", nota: "Latihan & kursus" },
        { nama: "ePenyata Gaji", url: "https://epenyatagaji-laporan.anm.gov.my/", nota: "ANM" },
      ],
    },
    // APDM & SSDM DIBUANG (12 Sep 2026, arahan pengguna): tidak lagi digunakan —
    // urusan murid & disiplin kini melalui idMe. Jangan masukkan semula.
    {
      kumpulan: "Murid & Sekolah",
      item: [
        { nama: "eOperasi", url: "https://eoperasi.moe.gov.my/", nota: "Data guru · PAJSK · masih digunakan" },
      ],
    },
    {
      kumpulan: "Identiti & Pembelajaran",
      item: [
        { nama: "idMe KPM", url: "https://idme.moe.gov.my/", nota: "Pintu masuk tunggal · urusan murid & disiplin di sini" },
        // Guna d3 secara terus: delima.edu.my masih alih ke d2 (Delima 2.5 yang lama)
        { nama: "DELIMa 3.0", url: "https://d3.delima.edu.my/", nota: "Classroom, Drive, Meet · DETa" },
        { nama: "Portal KPM", url: "https://www.moe.gov.my/", nota: "Pekeliling & berita" },
      ],
    },
    {
      kumpulan: "Aduan & Maklum Balas",
      item: [
        // ⚠️ Sambungan tamat masa dari luar (semakan 12 Sep 2026) — mungkin hanya
        // boleh dicapai dari rangkaian gov. SAHKAN dari peranti sekolah sebelum dipaut awam.
        { nama: "SISPA KPM", url: "https://moe.spab.gov.my/", nota: "Sistem Pengurusan Aduan Awam KPM" },
      ],
    },
  ] as KumpulanPautanKpm[],

  /* --- Media sosial RASMI (disahkan pengguna 13 Sep 2026) ---
     ⚠️ SENARAI TERTUTUP. Hanya dua akaun ini rasmi. Jangan tambah akaun lain
     — termasuk yang kelihatan meyakinkan atau dijumpai melalui carian — melainkan
     pengguna sendiri mengesahkannya. Akaun sekolah palsu/lapuk memang wujud.

     URL di sini ialah bentuk KANONIK yang sudah dibersihkan. Pautan asal yang
     diberi ialah pautan "share" Facebook yang membawa token penjejakan peribadi
     (`mibextid`, `rdid`, `share_url`) — token itu terikat pada perkongsian
     pengguna dan TIDAK boleh masuk ke laman awam. Disahkan dalam Chrome sebenar:
     facebook.com/share/1HYtZi95NZ/ → facebook.com/media.sktdofficial
     (tajuk halaman "Mediasktd.official | Seri Kembangan"). curl ditolak 400 oleh
     Facebook; itu penyekatan bot, bukan pautan rosak. */
  mediaSosial: [
    {
      id: "facebook",
      nama: "Facebook",
      pemegang: "Mediasktd.official",
      url: "https://www.facebook.com/media.sktdofficial",
    },
    {
      id: "tiktok",
      nama: "TikTok",
      pemegang: "@tamandesaminiumtv",
      url: "https://www.tiktok.com/@tamandesaminiumtv",
    },
  ] as MediaSosial[],

  /* --- Kehadiran dalam talian sedia ada --- */
  pautanSedia: {
    googleSites:
      "https://sites.google.com/moe-dl.edu.my/sk-taman-desaminium/home",
    // ⚠️ sktd.edu.my kini di hosting percuma InfinityFree (ns*.unaux.com,
    //    185.27.134.130) dengan sijil SSL tidak sah. Lihat docs/tugasan-sktd.md.
  },
} as const;

/** App portal yang turut berguna kepada ibu bapa → dipapar di laman AWAM. */
export const APP_IBU_BAPA: AppPortal[] = (SEKOLAH.portal as AppPortal[]).filter(
  (app) => app.ibuBapa !== undefined,
);
