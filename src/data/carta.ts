/**
 * CARTA ORGANISASI SEKOLAH — mengikut susunan KPM.
 *
 * Sumber struktur ini BUKAN ingatan saya tentang carta sekolah Malaysia. Ia
 * dibaca terus dari Buku Pengurusan sekolah ini, yang menggunakan kod jawatan
 * rasmi eOperasi dalam senarai gurunya:
 *
 *     1 SHABARIAH BINTI ISMAIL        PGB    PENDIDIKAN ISLAM
 *     2 ROSLE BIN MOHAMAD             PK1    TEKNOLOGI KEJURUTERAAN
 *     3 AHMAD RAFLI NOOR BIN SHAHARDIN PK2   BAHASA MELAYU & BAHASA INGGERIS
 *     ...
 *
 * Hierarki itu disahkan silang oleh senarai jawatankuasa: orang yang sama
 * ialah PENGERUSI dalam setiap unit, dan lima orang berikutnya ialah NAIB
 * PENGERUSI. Dua sumber bebas dalam buku yang sama memberi susunan yang sama.
 *
 * ⚠️ Kod bertanda `sahkan` bermakna singkatannya jelas tetapi nama penuh
 * rasminya belum disahkan dengan pejabat sekolah. Ikut cara `sekolah.ts`:
 * amaran dikekalkan sehingga manusia mengesahkan, bukan dibuang kerana ia
 * kelihatan tidak kemas.
 */

export interface AraJawatan {
  kod: string;
  nama: string;
  /** 0 = puncak carta. */
  aras: number;
  /** Nama penuh belum disahkan dengan pejabat sekolah. */
  sahkan?: boolean;
}

/**
 * ARAS setiap kod — BUKAN namanya.
 *
 * Nama penuh dibaca dari buku itu sendiri (lihat `bacaPenunjukKod`). Buku
 * edisi 2025 menyenaraikan penunjuknya pada m.51, dan ia membetulkan tekaan:
 * `GAG` bukan "guru yang genap 36 bulan" seperti yang diberitahu sumber
 * pihak ketiga, tetapi **Guru Pendidikan Islam Sekolah Rendah** di sekolah
 * ini. Itu sebabnya nama di bawah hanya sandaran, bukan kebenaran.
 *
 * Aras pula TIDAK ada dalam penunjuk buku, dan memang tidak sepatutnya ada —
 * ia pengetahuan tentang bentuk carta, bukan tentang singkatan.
 */
export const ARA_JAWATAN: AraJawatan[] = [
  { kod: "PGB",   nama: "Guru Besar", aras: 0 },
  { kod: "PK1",   nama: "Penolong Kanan", aras: 1 },
  { kod: "PK2",   nama: "Penolong Kanan Hal Ehwal Murid", aras: 1 },
  { kod: "PK3",   nama: "Penolong Kanan Kokurikulum", aras: 1 },
  { kod: "PKPK",  nama: "Penolong Kanan Pendidikan Khas", aras: 1 },
  { kod: "PKP",   nama: "Penolong Kanan Petang", aras: 1 },
  { kod: "GBS",   nama: "Guru Bimbingan", aras: 2 },
  { kod: "GBK",   nama: "Guru Bimbingan & Kaunseling", aras: 2 },
  { kod: "GPM",   nama: "Guru Perpustakaan & Media", aras: 2 },
  { kod: "GPKIB", nama: "Guru Pendidikan Khas Integrasi", aras: 3 },
  { kod: "GPRA",  nama: "Guru Prasekolah", aras: 3 },
  { kod: "BCSK",  nama: "Guru Bahasa Cina SK", aras: 4 },
  { kod: "GAG",   nama: "Guru Pendidikan Islam", aras: 4 },
  { kod: "GAB",   nama: "Guru Akademik Biasa", aras: 4 },
  { kod: "AKP",   nama: "Anggota Kumpulan Pelaksana", aras: 5 },
  // ── Anggota Kumpulan Pelaksana, seperti tercetak dalam buku ini ──────
  //
  // Senarai AKP menulis kodnya MELEKAT pada nama, dengan jawatan dalam
  // kurungan: "BAIDURIAH BINTI BAHROM KPT (KETUA PEMBANTU TADBIR)". Kod
  // itu tiada dalam penunjuk kod buku (penunjuk hanya menyenaraikan kod
  // guru), jadi tanpa kemasukan di bawah ia tidak dikenali — dan akibatnya
  // seluruh sel menjadi "jawatan" mereka dalam carta, nama dan semuanya.
  { kod: "KPT",   nama: "Ketua Pembantu Tadbir", aras: 5 },
  { kod: "PT",    nama: "Pembantu Tadbir", aras: 5 },
  { kod: "PPM",   nama: "Pembantu Pengurusan Murid", aras: 5 },
  { kod: "PKA",   nama: "Pembantu Khidmat Am", aras: 5, sahkan: true },
];

/**
 * Baca "PENUNJUK KOD PEJAWATAN" dari buku.
 *
 * Bentuk sebenar (m.51 edisi 2025):
 *
 *     PENUNJUK KOD PEJAWATAN :
 *     PGB PENGETUA / GURU BESAR
 *     PK1 PENOLONG KANAN
 *     GAG GURU PENDIDIKAN ISLAM SEKOLAH RENDAH
 *
 * Membacanya bermakna kod yang kita TIDAK pernah lihat sebelum ini pun
 * mendapat nama yang betul pada edisi tahun depan, tanpa sesiapa perlu
 * mengemas kini kod kita.
 */
export function bacaPenunjukKod(baris: string[]): Record<string, string> {
  const keluar: Record<string, string> = {};
  let dalam = false;
  for (const b of baris) {
    const t = b.trim();
    if (/^PENUNJUK\s+KOD/i.test(t)) { dalam = true; continue; }
    if (!dalam) continue;
    const m = /^([A-Z]{2,6}\d?)\s+([A-Z][A-Z\s()\/&.,'-]{4,80})$/.exec(t);
    if (!m) {
      // Nombor muka atau baris kosong tidak menamatkan senarai; ayat penuh ya.
      if (t === "" || /^\d+$/.test(t)) continue;
      dalam = false;
      continue;
    }
    keluar[m[1].toUpperCase()] = m[2].replace(/\s+/g, " ").trim();
  }
  return keluar;
}

/** Aras carta bagi satu kod, walaupun kod itu tidak pernah dilihat. */
export function arasKod(kod: string): number {
  const k = kod.trim().toUpperCase();
  const dikenali = ARA_JAWATAN.find((a) => a.kod === k);
  if (dikenali) return dikenali.aras;
  // Kod baharu yang bermula dengan PK ialah Penolong Kanan, apa pun
  // hujungnya. Selebihnya ialah daun.
  if (k === "PGB") return 0;
  if (/^PK/.test(k)) return 1;
  return 4;
}

export function ara(kod: string): AraJawatan | null {
  const k = kod.trim().toUpperCase();
  return ARA_JAWATAN.find((a) => a.kod === k) ?? null;
}

/**
 * Unit mana di bawah Penolong Kanan yang mana.
 *
 * Buku menyenaraikan SEMUA Penolong Kanan sebagai Naib Pengerusi dalam SETIAP
 * unit — itu betul dari segi tadbir urus, tetapi ia bukan carta: ia
 * menghasilkan graf yang setiap nod bersambung ke semua nod lain. Carta
 * memerlukan SATU induk bagi setiap unit, dan pembahagian di bawah ialah
 * pembahagian KPM yang standard.
 */
export const INDUK_UNIT: Record<string, string> = {
  kurikulum:   "PK1",
  panitia:     "PK1",
  gurukelas:   "PK1",
  hem:         "PK2",
  kokurikulum: "PK3",
  // Unit Pengurusan & Pentadbiran dipengerusikan Guru Besar sendiri.
  pengurusan:  "PGB",
};

/** Jawatan dalam jawatankuasa, disusun mengikut kekananan. */
export const URUTAN_JAWATAN = [
  "PENGERUSI", "NAIB PENGERUSI", "KETUA", "PENYELARAS", "GURU DATA",
  "SETIAUSAHA", "PEN. SETIAUSAHA", "BENDAHARI", "JURU AUDIT", "AJK",
];

export function kekananan(jawatan: string): number {
  const j = jawatan.trim().toUpperCase();
  const i = URUTAN_JAWATAN.findIndex((u) => j.startsWith(u));
  return i < 0 ? URUTAN_JAWATAN.length : i;
}

/** Nod dalam carta. */
export interface NodCarta {
  selAsal?: string[];
  id: string;
  /** Nama orang, atau nama unit bila `jenis === "unit"`. */
  label: string;
  /** Jawatan orang itu. Kosong untuk nod unit. */
  jawatan: string;
  /** Kod eOperasi, bila diketahui. */
  kod?: string;
  jenis: "orang" | "unit";
  anak: NodCarta[];
  /** Baris asal dalam pangkalan data — supaya suntingan tahu apa nak ubah. */
  barisId?: string;
  /**
   * Seksyen mana baris itu datang.
   *
   * Penting kerana BENTUK barisnya berbeza: baris jawatankuasa ialah
   * [kumpulan, jawatan, nama], manakala baris senarai nama guru ialah
   * [bil, nama, kod, opsyen]. Menulis bentuk yang salah ke baris yang salah
   * memusnahkan data — dan nod "Guru & Kakitangan Lain" datang dari senarai
   * guru, bukan dari jawatankuasa.
   */
  sumber?: "guru" | "jawatankuasa";
  /**
   * Ejaan seperti tercetak dalam buku, bila ia BERBEZA dari senarai nama
   * guru. Dipapar sebagai nota kecil supaya admin boleh menyemak padanan
   * longgar itu, bukan mempercayainya buta.
   */
  ejaanBuku?: string;
  /** Rujukan bukan-orang: "SEMUA KETUA PANITIA", "PENGERUSI BKGK". */
  rujukan?: boolean;
}

/**
 * Adakah nilai ini nama ORANG, atau rujukan kepada kumpulan?
 *
 * Buku sebenar mengisi senarai AJK dengan "SEMUA KETUA PANITIA", "SETIAUSAHA
 * UNIT PENGURUSAN" dan "PENGERUSI BKGK". Itu arahan keahlian, bukan nama.
 * Melayannya sebagai orang mencipta nod hantu dalam carta yang tiada sesiapa
 * boleh dipadankan dengannya.
 */
/**
 * Adakah teks ini KELIHATAN seperti nama orang?
 *
 * Penapis ini wujud kerana carta organisasi mula memapar ayat Pelan
 * Strategik sebagai "orang": "Menyusun perancangan LADAP secara sistematik",
 * "Hanya 10% murid merekodkan AINS", "MATLAMAT STRATEGIK", "2027 2028 2029".
 * Muka pelan strategik penuh dengan ayat bertitik bertindih, dan penghurai
 * senarai menerima setiap satu sebagai pasangan JAWATAN : NAMA.
 *
 * Empat isyarat, dan setiap satu menolak sesuatu yang benar-benar berlaku:
 *
 *   · HURUF BESAR — nama dalam buku ini ditulis besar; ayat pelan strategik
 *     ditulis biasa. Ini isyarat terkuat.
 *   · TIADA NOMBOR — "Memastikan 30% murid Tahun 6", "2027 2028 2029".
 *   · PANJANG MUNASABAH — nama terpanjang dalam buku 2025 ialah 39 aksara.
 *   · PENANDA NASAB ATAU TIGA PERKATAAN — "MATLAMAT STRATEGIK" ialah dua
 *     perkataan huruf besar tanpa penanda nasab; nama sebenar hampir selalu
 *     membawa BIN/BINTI/A-L, dan yang tidak (nama Cina) hampir selalu tiga
 *     perkataan atau lebih.
 */
const RE_NASAB_NAMA = /\b(BIN|BINTI|BT|A\/L|A\/P|AL)\b/i;

/**
 * Perkataan yang TIDAK PERNAH muncul dalam nama orang di sekolah ini.
 *
 * Ia muncul dalam OPSYEN dan nama unit, yang kadang-kadang tersasar ke
 * lajur nama apabila lajur beranjak: "PENDIDIKAN AWAL KANAK-KANAK" dibaca
 * sebagai seorang guru. Tiga perkataan huruf besar — cukup untuk melepasi
 * setiap ujian bentuk, dan hanya perbendaharaan kata yang boleh menolaknya.
 */
const KATA_BUKAN_NAMA =
  /\b(PENDIDIKAN|PENGAJIAN|MATEMATIK|SAINS|SEJARAH|JASMANI|KESIHATAN|MUZIK|VISUAL|TEKNOLOGI|KURIKULUM|KOKURIKULUM|PENTADBIRAN|JAWATANKUASA|UNIT|PANITIA|KELAS|MURID|SEKOLAH|TAHUN|OPSYEN|JAWATAN)\b/i;

export function kelihatanNama(nilai: string): boolean {
  const t = (nilai ?? "").replace(/\s+/g, " ").trim();
  if (t.length < 5 || t.length > 60) return false;
  if (/\d/.test(t)) return false;
  if (/[.!?]$/.test(t) && !/\b[A-Z]\.$/.test(t)) return false;

  const huruf = t.replace(/[^A-Za-z]/g, "");
  if (huruf.length < 5) return false;
  const besar = huruf.replace(/[^A-Z]/g, "").length / huruf.length;
  if (besar < 0.85) return false;

  const perkataan = t.split(/\s+/).filter((w) => w.length > 1);
  if (perkataan.length < 2) return false;

  // Penanda nasab menang ke atas perbendaharaan kata: "NUR SAINS BINTI ALI"
  // ialah nama yang sah walaupun mengandungi perkataan tersenarai.
  if (RE_NASAB_NAMA.test(t)) return true;
  if (KATA_BUKAN_NAMA.test(t)) return false;
  return perkataan.length >= 3;
}

export function rujukanKumpulan(nilai: string): boolean {
  const t = nilai.trim().toUpperCase();
  if (/^(SEMUA|SETIAP)\b/.test(t)) return true;
  if (/^(SETIAUSAHA|PENGERUSI|KETUA|PENYELARAS|WAKIL|AJK)\s+(UNIT|PANITIA|BKGK|PIBG|JAWATANKUASA)\b/.test(t)) return true;
  // Nama orang sebenar hampir selalu ada sekurang-kurangnya dua perkataan
  // dan satu penanda nasab.
  return false;
}
