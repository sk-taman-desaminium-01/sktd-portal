/**
 * Menghurai Buku Pengurusan Tahunan.
 *
 * ⚠️ PERATURAN UTAMA: JANGAN bergantung pada nombor muka surat.
 * Buku pengurusan tahun depan tidak semestinya sama dengan tahun ini —
 * susunan berubah, muka beranjak, tajuk ditulis semula. Apa-apa yang
 * bergantung pada "guru kelas ada di muka 73" akan pecah senyap pada edisi
 * berikutnya, dan pecahnya hanya disedari selepas data salah tersebar.
 *
 * Maka seksyen dikenali melalui KATA KUNCI dalam tajuknya, dan bentuk data
 * dikesan daripada susunan teks — bukan daripada kedudukan dalam buku.
 *
 * DUA BENTUK, kerana buku sebenar mengandungi kedua-duanya. Diukur pada
 * edisi 2025 (174 muka): 84 muka berjadual, 90 muka bukan jadual.
 *   · `jadual`  — baris dan lajur (senarai guru, takwim program)
 *   · `senarai` — baris "PERANAN : NAMA" (jawatankuasa, panitia), termasuk
 *                 baris sambungan ": NAMA LAIN" yang berkongsi peranan sama
 *
 * Import relatif dengan .ts supaya modul ini boleh diuji terus dengan Node.
 */

import { gridDariKedudukan, type ItemKedudukan } from "./grid-kedudukan.ts";
import { kesanJenis, type KodSeksyen } from "../data/seksyen-pengurusan.ts";
import { kelihatanNama, rujukanKumpulan } from "../data/carta.ts";

export interface MukaDokumen {
  muka: number;
  /** Teks muka ini, satu baris satu elemen. */
  baris: string[];
  /** Koordinat teks, bila ada — hanya PDF. */
  item?: ItemKedudukan[];
  /**
   * Jadual muka ini, sudah dibina oleh enjin koridor (`muka-teks.ts`).
   *
   * Bila ia ada, ia DIDAHULUKAN daripada `item`: koridor putih membaca sel
   * yang panjang dan tidak sama lebar dengan betul, manakala pengumpulan x
   * memecahkan satu lajur kepada tiga. Bandingan pada buku sebenar:
   * 2,124 baris (x) berbanding 4,268 baris (koridor), dan seksyen Guru Kelas
   * m.73 yang langsung TIDAK dijumpai oleh kaedah lama.
   */
  jadual?: string[][] | null;
  /** Muka ini gambar — hampir tiada teks. Dikira oleh `mukaGambar()`. */
  gambar?: boolean;
  /**
   * Baris yang sudah dipecah kepada SEL.
   *
   * Lebih baik daripada `baris` untuk senarai jawatankuasa, kerana muka
   * bergaya carta menyusun DUA pasangan bersebelahan:
   *
   *   [BAHASA MELAYU] [: RAFIDAH ...] [SEJARAH] [: MOHAN ...]
   *
   * Digabungkan menjadi satu baris teks, pasangan kedua tertelan ke dalam
   * nilai pasangan pertama dan seorang ketua panitia hilang. Dipecah kepada
   * sel, kedua-duanya selamat.
   */
  sel?: string[][];
}

export interface SeksyenDikesan {
  kod: KodSeksyen;
  tajuk: string;
  mukaMula: number;
  mukaAkhir: number;
  bentuk: "jadual" | "senarai" | "tugas";
  lajur: string[];
  baris: string[][];
  /** 0–100. Berapa yakin sistem dengan hasil ini. */
  keyakinan: number;
  amaran: string[];
}

/* ------------------------------------------------------------- tajuk muka */

/**
 * Tajuk muka: baris pertama yang bermakna.
 *
 * Nombor muka, tarikh cetakan dan baris kosong dilangkau — dalam buku sebenar
 * baris pertama selalunya "38" (nombor muka) dan bukan tajuk.
 */
export function tajukMuka(baris: string[]): string {
  for (const b of baris) {
    const t = b.trim();
    if (t.length < 4) continue;                 // "38", "1", tanda sempang
    if (/^\d+$/.test(t)) continue;              // nombor muka
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(t)) continue;   // baris bertarikh
    if (/^\d{1,2}-[A-Za-z]{3}-\d{2}/.test(t)) continue;       // "25-Jun-25 ..."
    if (/^[:：]/.test(t)) continue;              // baris sambungan ": NAMA"
    return t;
  }
  return "";
}

/**
 * Adakah teks ini BENAR-BENAR tajuk seksyen, bukan ayat yang kebetulan
 * mengandungi kata kunci?
 *
 * Diuji pada buku sebenar 2025, dan setiap peraturan di sini menangkap
 * kesilapan yang BENAR-BENAR berlaku:
 *
 *  · "5.2 Guru Kelas" — perenggan dalam Panduan Am Guru, bukan senarai guru
 *    kelas. Tanpa penapis ini ia menelan 17 muka prosa dan menghasilkan 557
 *    baris sampah.
 *  · ": SEMUA KETUA UNIT UNIT KOKURIKULUM" — baris sambungan senarai ahli.
 *  · "25-Jun-25 RABU SUMATIF 2 UNIT BERUNIFORM (5)" — satu baris dalam
 *    takwim, disangka tajuk seksyen baharu.
 *
 * Tajuk sebenar dalam buku ini DITULIS BESAR. Itu bukan kebetulan — ia cara
 * dokumen rasmi sekolah ditaip, dan ia pembeza yang paling boleh dipercayai
 * antara tajuk dan ayat biasa.
 */
export function kelihatanTajuk(teks: string): boolean {
  const t = teks.trim();
  if (t.length < 4 || t.length > 90) return false;
  if (/^[:：]/.test(t)) return false;
  if (/^\d{1,2}[-/][A-Za-z0-9]{2,4}[-/]\d{2,4}/.test(t)) return false;

  const huruf = t.replace(/[^A-Za-z]/g, "");
  if (huruf.length < 4) return false;
  const besar = huruf.replace(/[^A-Z]/g, "").length / huruf.length;
  // 0.7, bukan 1.0: tajuk sebenar kadang mengandungi perkataan bercampur
  // seperti "PdPc" atau "aSc", tetapi prosa Huruf Besar Di Awal Sahaja
  // sentiasa jatuh jauh di bawah ambang ini.
  return besar >= 0.7;
}

/* ------------------------------------------------------- enjin: senarai */

/**
 * "PERANAN : NAMA", dengan `;` turut diterima.
 *
 * Titik bertindih yang menjadi koma bertitik BUKAN andaian — ia berlaku dalam
 * buku sebenar: `; SEMUA KETUA PANITIA UNIT KURIKULUM` pada m.55. Kekunci itu
 * bersebelahan pada papan kekunci. Menolaknya bermakna seluruh baris itu
 * hilang senyap, dan tiada sesiapa akan perasan seorang ahli jawatankuasa
 * tiada dalam senarai.
 */
const RE_PERANAN = /^\s*(.*?)\s*[:：;]\s*(.+?)\s*$/;

/**
 * Tajuk SUB-JAWATANKUASA dalam senarai.
 *
 * Buku sebenar menyusun setiap unit begini:
 *
 *     UNIT PENGURUSAN & PENTADBIRAN     <- tajuk seksyen
 *     PENGERUSI : SHABARIAH ...         <- pegawai unit
 *     1. KEWANGAN                       <- SUB-JAWATANKUASA
 *     SETIAUSAHA : SYAZA ...
 *     AJK : IRHAMI ...
 *     : NIK AMMAR ...                   <- sambungan
 *     2. LADAP                          <- sub-jawatankuasa seterusnya
 *
 * Tanpa mengesan baris bernombor itu, 263 baris jawatankuasa menjadi senarai
 * rata "PENGERUSI / SETIAUSAHA / AJK" yang berulang tanpa sesiapa tahu
 * jawatankuasa MANA. Itu memusnahkan carta organisasi sebelum ia bermula.
 */
export function tajukKumpulan(teks: string): string | null {
  const t = teks.trim();
  if (t.length < 3 || t.length > 90) return null;
  if (RE_PERANAN.test(t)) return null;

  // "1. KEWANGAN", "A. UNIT", "5. BUKU PENGURUSAN & TAKWIM"
  const m = /^([0-9]{1,2}|[A-Z])[.)]\s+(.{2,})$/.exec(t);
  if (!m) return null;
  const nama = m[2].trim();
  // Huruf besar ATAU bercampur — buku sebenar mengandungi
  // "4. SKPM – Kualiti@Sekolah". Yang ditolak ialah ayat penuh.
  if (nama.split(/\s+/).length > 12) return null;
  // NAMA ORANG BUKAN TAJUK JAWATANKUASA.
  //
  // Buku 2026 mengandungi senarai nama bernombor ("5. ZURAIZA BINTI CHE
  // RAZAK") yang bentuknya sama persis dengan tajuk sub-jawatankuasa.
  // Tanpa penapis ini, tiga nama guru menjadi "jawatankuasa" — dan satu
  // daripadanya menelan 32 baris muka bertugas selepasnya.
  if (kelihatanNama(nama)) return null;
  return nama;
}

/**
 * Satu nilai yang mengandungi PASANGAN KEDUA di dalamnya.
 *
 * Muka bergaya carta menyusun dua pasangan bersebelahan. Bila pemecahan sel
 * gagal menangkapnya — dan ia gagal pada susun atur yang berbeza setiap
 * edisi — kedua-duanya mendarat dalam satu nilai:
 *
 *   "RAFIDAH BINTI MOHD NOR SEJARAH : MOHAN A/L BATUMALAI"
 *
 * Akibatnya seorang ketua panitia hilang dan seorang lagi mewarisi jawatan
 * yang salah. Nama orang TIDAK PERNAH mengandungi " : ", jadi kehadirannya
 * di tengah nilai ialah bukti kukuh, bukan tekaan.
 */
const RE_NASAB = /^(BIN|BINTI|BT|A\/L|A\/P)$/i;

export function pecahPasanganDalam(nilai: string): [string, string, string] | null {
  const titik = nilai.search(/\s[:：;]\s/);
  if (titik < 0) return null;

  const kiri = nilai.slice(0, titik).trim();
  const kanan = nilai.slice(titik + 1).replace(/^[:：;]\s*/, "").trim();
  if (kanan.length < 3) return null;

  // Cari sempadan antara NAMA dan JAWATAN dengan memanjangkan calon jawatan
  // ke KIRI selagi bahagian yang tinggal masih kelihatan seperti nama penuh.
  //
  // Kenapa ini berfungsi, dan kenapa regex tamak tidak:
  //
  //   "RAFIDAH BINTI MOHD NOR SEJARAH"         -> jawatan "SEJARAH"
  //   "NORAZLINA BINTI PAIMIN PEND JASMANI & KESIHATAN"
  //                                            -> jawatan "PEND JASMANI & KESIHATAN"
  //
  // Nama jawatan boleh empat perkataan, jadi mengambil satu perkataan sahaja
  // salah; mengambil sebanyak mungkin juga salah kerana ia menelan nama.
  // Penanda nasab ialah sempadan yang sebenar: nama Melayu mengandunginya,
  // nama jawatan tidak.
  const kata = kiri.split(/\s+/);
  let terbaik: number | null = null;
  for (let potong = kata.length - 1; potong >= 1; potong--) {
    const nama = kata.slice(0, potong);
    const jawatan = kata.slice(potong);
    // Bahagian nama mesti MASIH nama penuh: ada penanab nasab, dan tidak
    // berakhir dengannya ("RAFIDAH BINTI" bukan nama lengkap).
    if (!nama.some((w) => RE_NASAB.test(w))) break;
    if (RE_NASAB.test(nama[nama.length - 1])) break;
    // Jawatan ditulis huruf besar dan tiada penanda nasab.
    if (jawatan.some((w) => RE_NASAB.test(w))) break;
    if (jawatan.join(" ").length > 48) break;
    // Ambil calon PERTAMA yang sah, iaitu jawatan yang PALING PENDEK.
    //
    // Ini pilihan berhati-hati, dan ia disengajakan. Fungsi ini ialah
    // SANDARAN: muka dua lajur biasanya dipecah dengan betul oleh pemecahan
    // sel, dan ia hanya sampai ke sini bila pemecahan itu gagal. Bila kita
    // tidak pasti di mana nama berakhir, meletakkan satu perkataan pada
    // jawatan yang salah boleh dibetulkan admin dalam satu klik; menelan
    // nama orang ke dalam jawatan menghilangkan mereka sepenuhnya.
    terbaik = potong;
    break;
  }
  if (terbaik === null) return null;

  const nama = kata.slice(0, terbaik).join(" ").trim();
  const jawatan = kata.slice(terbaik).join(" ").trim();
  if (nama.length < 3 || jawatan.length < 3) return null;
  return [nama, jawatan, kanan];
}

/** Satu baris senarai: jawatankuasa, jawatan, nama. */
export type BarisSenarai = [kumpulan: string, peranan: string, nama: string];

/**
 * Baris "PERANAN : NAMA", dikumpulkan mengikut sub-jawatankuasa.
 *
 * Baris sambungan ": NAMA LAIN" mewarisi peranan baris sebelumnya — itu cara
 * buku sebenar menyenaraikan beberapa orang bagi satu jawatan, dan
 * mengabaikannya bermakna kehilangan setiap ahli kecuali yang pertama.
 */
export function huraiSenarai(baris: string[], kumpulanAwal = ""): BarisSenarai[] {
  const keluar: BarisSenarai[] = [];
  let peranan = "";
  let kumpulan = kumpulanAwal;

  for (const b of baris) {
    const tajuk = tajukKumpulan(b);
    if (tajuk) {
      kumpulan = tajuk;
      // Jawatankuasa baharu bermula: peranan sebelumnya tidak lagi berkuat
      // kuasa. Tanpa ini, baris sambungan pertama jawatankuasa baharu
      // mewarisi "AJK" dari jawatankuasa LAIN.
      peranan = "";
      continue;
    }
    const m = RE_PERANAN.exec(b);
    if (!m) continue;
    const label = m[1].trim();
    const nilai = m[2].trim();
    if (!nilai || nilai.length < 2) continue;
    if (label) peranan = label;
    if (!peranan) continue;
    tolakNilai(keluar, kumpulan, peranan, nilai);
  }
  return keluar;
}

/**
 * Adakah nilai ini milik senarai jawatankuasa?
 *
 * Seksyen `senarai` bermaksud "PERANAN : NAMA". Nilai yang BUKAN nama dan
 * bukan rujukan kumpulan tidak tergolong di sini, walaupun barisnya
 * mengandungi titik bertindih.
 *
 * Ini penapis yang paling banyak membersihkan. Muka Pelan Strategik, SWOT,
 * KPI dan jadual bertugas semuanya penuh baris bertitik bertindih, dan
 * tanpa penapis ini setiap satunya menjadi "ahli jawatankuasa":
 * "Menyusun perancangan LADAP secara sistematik", "MATLAMAT STRATEGIK",
 * "2027 2028 2029". Menapisnya DI SINI bermakna ia tidak pernah masuk
 * pangkalan data, tidak muncul dalam skrin semakan, dan tidak sampai ke
 * carta — satu penapis, tiga tempat bersih.
 */
function nilaiSah(nilai: string): boolean {
  return kelihatanNama(nilai) || rujukanKumpulan(nilai);
}

/**
 * Tajuk DOKUMEN yang menyamar sebagai jawatan.
 *
 * Muka bidang tugas disusun "2.0 BIDANG TUGAS : LEMBAGA DISIPLIN" dan
 * "13.3.4 Visi : Generasi Berilmu". Bentuknya sama persis dengan
 * "PENGERUSI : NAMA", jadi penghurai senarai menerimanya — dan hasilnya
 * ialah "jawatan" bernama BIDANG TUGAS yang dipegang oleh "orang" bernama
 * LEMBAGA DISIPLIN DAN PENGAWAS.
 *
 * Tiada jawatan sebenar bermula dengan nombor berperingkat, dan tiada
 * jawatan sebenar bernama Visi, Misi atau Matlamat.
 */
const RE_TAJUK_DOKUMEN =
  /^(\d+(\.\d+)*\s|BIDANG\s+TUGAS\b|MATLAMAT\b|VISI\b|MISI\b|OBJEKTIF\b|ASPIRASI\b|PIAGAM\b|FUNGSI\b)/i;

function jawatanSah(jawatan: string): boolean {
  const t = jawatan.trim();
  if (t.length < 2 || t.length > 60) return false;
  return !RE_TAJUK_DOKUMEN.test(t);
}

/**
 * Buang akronim unit yang melekat pada hujung nama.
 *
 * "IRHAMI BINTI ISMAILRMT" — akronim seksyen (RMT) berada dalam lajur
 * bersebelahan dengan jurang yang terlalu kecil untuk dikira sempadan sel,
 * jadi ia dicantum terus ke nama tanpa ruang.
 *
 * Hanya akronim yang BENAR-BENAR muncul dalam tajuk seksyen dibuang. Itu
 * yang menjadikannya selamat: tanpa syarat itu, mana-mana nama yang berakhir
 * dengan tiga huruf besar akan dipotong.
 */
export function buangNomborMelekat(nama: string): string {
  // "EN AHMAD RAFLI NOOR BIN26.27." dan "YUSRI BIN KARIM27." — nombor
  // senarai dari lajur bersebelahan melekat pada hujung nama apabila
  // jurangnya terlalu kecil untuk dikira sempadan sel.
  //
  // Hanya nombor di HUJUNG dibuang, dan hanya bila ada huruf sebelumnya:
  // nama tidak pernah berakhir dengan digit, tetapi "TAHUN 1" ialah nilai
  // yang sah di tempat lain.
  return nama.replace(/(?<=[A-Za-z]{2})[\s.]*\d+(\.\d+)*\.?\s*$/, "").trim();
}

export function buangAkronimMelekat(nama: string, tajuk: string): string {
  const akronim = [...tajuk.matchAll(/\(([A-Z]{2,6})\)/g)].map((m) => m[1]);
  let t = nama.trim();
  for (const a of akronim) {
    const re = new RegExp(`(?<=[A-Za-z]{3})${a}$`);
    if (re.test(t)) t = t.replace(re, "").trim();
  }
  return t;
}

/** Simpan satu nilai, memecahkan pasangan tertanam bila ada. */
function tolakNilai(
  keluar: BarisSenarai[], kumpulan: string, peranan: string, nilai: string,
): string {
  if (!jawatanSah(peranan)) return peranan;
  const pecah = pecahPasanganDalam(nilai);
  if (!pecah) {
    if (nilaiSah(nilai)) keluar.push([kumpulan, peranan, nilai]);
    return peranan;
  }
  const [pertama, peranan2, kedua] = pecah;
  if (nilaiSah(pertama)) keluar.push([kumpulan, peranan, pertama]);
  // Nilai kedua boleh mengandungi pasangan KETIGA — muka empat lajur wujud.
  return tolakNilai(keluar, kumpulan, peranan2, kedua);
}

/**
 * Senarai "PERANAN : NAMA" dari SEL, bukan dari baris yang sudah dicantum.
 *
 * Satu baris muka boleh membawa lebih daripada satu pasangan apabila halaman
 * disusun dua lajur. Diukur pada m.77 edisi 2025 — satu baris membawa
 * KETUA PANITIA Bahasa Melayu DAN Sejarah. Membaca baris yang dicantum
 * menyebabkan 13 ketua panitia menjadi 7, dan 6 orang hilang senyap.
 */
export function huraiSenaraiDariSel(sel: string[][], kumpulanAwal = ""): BarisSenarai[] {
  const keluar: BarisSenarai[] = [];
  let peranan = "";
  let kumpulan = kumpulanAwal;

  for (const baris of sel) {
    const isi = baris.map((c) => c.trim()).filter((c) => c !== "");
    if (isi.length === 0) continue;

    // Baris satu sel: mungkin tajuk kumpulan, mungkin pasangan penuh.
    if (isi.length === 1) {
      const tajuk = tajukKumpulan(isi[0]);
      if (tajuk) { kumpulan = tajuk; peranan = ""; continue; }
    }

    for (let i = 0; i < isi.length; i++) {
      const c = isi[i];

      // TITIK BERTINDIH DALAM SELNYA SENDIRI: ["PENGERUSI", ":", "NAMA"].
      //
      // Edisi 2026 menjajarkan titik bertindih pada lajurnya sendiri, jadi
      // pemecahan sel mengasingkannya daripada kedua-dua belah. Bentuk itu
      // tidak dikenali langsung sebelum ini, dan seluruh seksyen Ketua
      // Panitia 2026 menghasilkan SIFAR baris — 152 baris pada 2025 menjadi
      // 0 pada 2026, tanpa sebarang ralat.
      if (/^[:：;]$/.test(c)) {
        const label = i > 0 ? isi[i - 1].replace(/[:：;]\s*$/, "").trim() : "";
        const nilai = (isi[i + 1] ?? "").trim();
        if (label && !/^[:：;]/.test(isi[i - 1])) peranan = label;
        if (peranan && nilai.length >= 2) {
          peranan = tolakNilai(keluar, kumpulan, peranan, nilai);
          i++; // nilai sudah digunakan
        }
        continue;
      }

      // Sel yang BERMULA dengan titik bertindih ialah nilai bagi sel
      // sebelumnya — itulah bentuk muka dua lajur.
      if (/^[:：;]/.test(c)) {
        const nilai = c.replace(/^[:：;]\s*/, "").trim();
        if (nilai.length < 2) continue;
        const label = i > 0 ? isi[i - 1].replace(/[:：;]\s*$/, "").trim() : "";
        if (label && !/^[:：;]/.test(isi[i - 1])) peranan = label;
        if (peranan) peranan = tolakNilai(keluar, kumpulan, peranan, nilai);
        continue;
      }
      // "PERANAN : NAMA" dalam satu sel.
      const m = RE_PERANAN.exec(c);
      if (m && m[1].trim() && m[2].trim().length >= 2) {
        peranan = tolakNilai(keluar, kumpulan, m[1].trim(), m[2].trim());
        continue;
      }
      // SERPIHAN YATIM: sel pendek yang bukan nilai dan bukan pasangan.
      //
      // pdf.js kadang memecahkan huruf terakhir sesuatu perkataan menjadi
      // serpihannya sendiri, dan jurang kerningnya cukup lebar untuk
      // menjadikannya sel berasingan. Tanpa baris ini, "SEMUA KETUA PANITIA"
      // disimpan sebagai "SEMUA KETUA PANITI" dan huruf terakhir hilang
      // senyap — dilaporkan pengguna pada edisi 2026.
      const akhir = keluar[keluar.length - 1];
      const bakiSel = isi.slice(i).join("").trim();
      if (akhir && i > 0 && bakiSel.length <= 3 && !/[:：;]/.test(bakiSel)) {
        akhir[2] = `${akhir[2]}${bakiSel}`;
        break;
      }
    }
  }
  return keluar;
}

/* --------------------------------------------------------- enjin: tugas */

/**
 * Muka BIDANG TUGAS: senarai berbulet di bawah tajuk peranan.
 *
 * Bentuk sebenar (m.115-116 edisi 2025) selepas dipecah kepada sel:
 *
 *     [GURU PENASIHAT KO AKADEMIK/ JURULATIH PASUKAN KHAS SEKOLAH]
 *     []  [Membentuk jawatankuasa dalam pasukan.]
 *     []  [Berusaha mendapatkan khidmat nasihat dari mereka yang pakar.]
 *     [KETUA RUMAH SUKAN]
 *     []  [Memastikan adanya senarai nama ahli Rumah Sukan yang lengkap.]
 *
 * Sel pertama KOSONG kerana bulet dalam buku ialah glif Wingdings yang tidak
 * memetakan kepada sebarang aksara. Kekosongan itu sendiri ialah petunjuk:
 * ia menandakan baris bulet dengan pasti, lebih pasti daripada mencari
 * simbol yang berbeza pada setiap fail.
 *
 * Baris sambungan (ayat yang melimpah ke baris berikutnya) TIDAK mempunyai
 * sel kosong di hadapannya, jadi ia dicantum ke tugas sebelumnya — kalau
 * tidak, setiap ayat panjang pecah menjadi dua tugas yang separuh.
 */
export function huraiTugas(sel: string[][]): string[][] {
  const keluar: string[][] = [];
  let peranan = "";

  for (const baris of sel) {
    // Bulet ialah "•" selepas `kemas()` menormalkan glif Wingdings U+F0A7.
    const kosongDiHadapan = baris.length > 1 && /^[\u2022\u25cf\u25aa*-]$/.test(baris[0].trim());
    const isi = baris.map((c) => c.trim()).filter((c) => c !== "");
    if (isi.length === 0) continue;
    const teks = isi.join(" ").replace(/\s+/g, " ").trim();
    if (teks === "" || /^\d+$/.test(teks)) continue;

    if (kosongDiHadapan) {
      // Bulet dibuang dari teks: lajur sudah bernama "Bidang Tugas", dan
      // mengulang penanda senarai dalam setiap sel hanya menambah bising.
      keluar.push([peranan, teks.replace(/^[\u2022\u25cf\u25aa*-]\s*/, "")]);
      continue;
    }
    // Tiada bulet. Tajuk peranan, atau sambungan ayat sebelumnya?
    // Tajuk ditulis huruf besar; sambungan ialah prosa biasa.
    if (kelihatanTajuk(teks)) { peranan = teks; continue; }
    const akhir = keluar[keluar.length - 1];
    if (akhir) akhir[1] = `${akhir[1]} ${teks}`.replace(/\s+/g, " ");
  }
  return keluar.filter((b) => b[1].length > 3);
}

/**
 * Adakah muka-muka ini BIDANG TUGAS dan bukan senarai nama?
 *
 * Diputuskan daripada bentuk, bukan daripada tajuk: tajuk "GURU PENASIHAT
 * KO AKADEMIK" kelihatan persis seperti tajuk senarai nama, dan hanya
 * kandungannya mendedahkan ia senarai tugasan.
 */
export function kelihatanTugas(muka: MukaDokumen[]): boolean {
  let bulet = 0;
  let pasangan = 0;
  let jumlah = 0;
  for (const m of muka) {
    for (const baris of m.sel ?? []) {
      const isi = baris.filter((c) => c.trim() !== "");
      if (isi.length === 0) continue;
      jumlah++;
      if (baris.length > 1 && /^[\u2022\u25cf\u25aa*-]$/.test(baris[0].trim())) bulet++;
      if (isi.some((c) => RE_PERANAN.test(c))) pasangan++;
    }
  }
  if (jumlah < 6) return false;
  // Lebih banyak baris berbulet daripada pasangan "PERANAN : NAMA", dan
  // bulet itu majoriti muka. Dua syarat, bukan satu: muka senarai nama pun
  // kadang mempunyai beberapa baris berbulet.
  return bulet > pasangan && bulet >= jumlah * 0.4;
}

/* -------------------------------------------------------- enjin: jadual */

/** Adakah baris ini kelihatan seperti baris kepala jadual? */
function barisKepala(baris: string[]): boolean {
  const berisi = baris.filter((s) => s.trim() !== "");
  if (berisi.length < 2) return false;
  // Kepala jadual jarang mengandungi ayat penuh.
  return berisi.every((s) => s.trim().length <= 40);
}

/**
 * Bina jadual daripada koordinat, kemudian buang lajur dan baris kosong.
 *
 * Lajur kosong berlaku kerana grid dibina dari kedudukan: satu sel yang
 * tersasar sedikit mencipta lajurnya sendiri. Membiarkannya bermakna admin
 * menyemak jadual yang penuh ruang kosong.
 */
export function huraiJadual(item: ItemKedudukan[]): { lajur: string[]; baris: string[][] } {
  const grid = gridDariKedudukan(item);
  if (grid.length === 0) return { lajur: [], baris: [] };

  const lebar = Math.max(...grid.map((b) => b.length));
  const penuh = grid.map((b) => [...b, ...Array(lebar - b.length).fill("")]);

  // Buang lajur yang kosong sepenuhnya.
  const lajurAda: number[] = [];
  for (let c = 0; c < lebar; c++) {
    if (penuh.some((b) => (b[c] ?? "").trim() !== "")) lajurAda.push(c);
  }
  const dipangkas = penuh
    .map((b) => lajurAda.map((c) => (b[c] ?? "").trim()))
    .filter((b) => b.some((s) => s !== ""));

  if (dipangkas.length === 0) return { lajur: [], baris: [] };

  const kepala = barisKepala(dipangkas[0]) ? dipangkas[0] : [];
  const baris = kepala.length > 0 ? dipangkas.slice(1) : dipangkas;
  return { lajur: kepala, baris };
}

/**
 * Asingkan baris kepala daripada baris data dalam jadual yang sudah dibina.
 *
 * Kepala tidak semestinya baris PERTAMA: muka jadual dalam buku sebenar
 * bermula dengan tajuk seksyen dan nama penyelaras sebelum "BIL | KELAS |
 * GURU KELAS". Maka kepala dicari dalam beberapa baris pertama — baris
 * pertama yang setiap selnya berisi dan pendek.
 */
export function pisahKepala(grid: string[][]): { lajur: string[]; baris: string[][] } {
  const bersih = grid.filter((b) => b.some((s) => s.trim() !== ""));
  if (bersih.length === 0) return { lajur: [], baris: [] };

  const had = Math.min(4, bersih.length);
  for (let i = 0; i < had; i++) {
    const b = bersih[i];
    if (b.length >= 2 && b.every((s) => s.trim() !== "") && barisKepala(b)) {
      return { lajur: b.map((s) => s.trim()), baris: bersih.slice(i + 1) };
    }
  }
  return { lajur: [], baris: bersih };
}

/** Dua tajuk yang sama selepas ruang dan tanda baca diabaikan. */
function samaTajuk(a: string, b: string): boolean {
  const n = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  return n(a) === n(b);
}

/* --------------------------------------------------------- pengesan seksyen */

/**
 * Kepala jadual ialah baris yang BERULANG pada beberapa muka.
 *
 * Mencari kepala pada baris pertama gagal pada buku sebenar: muka Senarai
 * Nama Guru bermula dengan tajuk seksyen, jadi baris data pertama
 * ("29 | IRHAMI BINTI ISMAIL | GAG | PENDIDIKAN ISLAM") diambil sebagai
 * nama lajur — dan seorang guru sebenar hilang menjadi tajuk lajur.
 *
 * Pengulangan pula tidak boleh disilap: "BIL | KELAS | GURU KELAS" dicetak
 * semula pada setiap muka seksyen itu kerana ia memang kepala jadual. Tiada
 * baris data yang berulang begitu.
 */
export function kepalaBerulang(mukaJadual: string[][][]): string[] {
  const kira = new Map<string, { baris: string[]; n: number }>();
  for (const grid of mukaJadual) {
    // Kepala berada dekat atas muka, bukan di tengahnya.
    const dilihat = new Set<string>();
    for (const b of grid.slice(0, 6)) {
      if (b.length < 2 || !b.every((c) => c.trim() !== "") || !barisKepala(b)) continue;
      const kunci = b.map((c) => c.trim().toUpperCase()).join("\u0001");
      if (dilihat.has(kunci)) continue;
      dilihat.add(kunci);
      const ada = kira.get(kunci);
      if (ada) ada.n++;
      else kira.set(kunci, { baris: b.map((c) => c.trim()), n: 1 });
    }
  }
  const terbaik = [...kira.values()].sort((a, b) => b.n - a.n)[0];
  if (!terbaik) return [];
  // Satu muka sahaja? Terima baris itu. Lebih daripada satu? Ia mesti
  // berulang, kalau tidak ia cuma baris data yang kebetulan pendek.
  if (mukaJadual.length === 1 || terbaik.n >= 2) return terbaik.baris;
  return [];
}

/** Buang lajur yang kosong pada SETIAP baris. */
function pangkasLajur(lajur: string[], baris: string[][]): { lajur: string[]; baris: string[][] } {
  const lebar = Math.max(lajur.length, ...baris.map((b) => b.length), 0);
  const ada: number[] = [];
  for (let c = 0; c < lebar; c++) {
    if (baris.some((b) => (b[c] ?? "").trim() !== "") || (lajur[c] ?? "").trim() !== "") ada.push(c);
  }
  return {
    lajur: lajur.length ? ada.map((c) => lajur[c] ?? "") : [],
    baris: baris.map((b) => ada.map((c) => b[c] ?? "")).filter((b) => b.some((x) => x.trim() !== "")),
  };
}

/**
 * Bahagikan dokumen kepada seksyen.
 *
 * Muka yang tajuknya memadankan jenis seksyen MEMULAKAN seksyen baharu;
 * muka selepasnya tergolong dalam seksyen itu sehingga tajuk lain dikesan.
 * Muka sebelum seksyen pertama diabaikan — itu muka hadapan, kata aluan dan
 * ikrar, yang tiada data berstruktur.
 *
 * Dua pelarasan yang datang daripada membaca buku sebenar, bukan daripada
 * teori:
 *
 *  · Takwim dan mesyuarat berselang-seli bulan demi bulan, jadi kedua-duanya
 *    digabungkan semula menjadi SATU kalendar setiap satu (`gabungSemua`).
 *  · Muka gambar di hujung buku — 21 muka berturut-turut dalam edisi 2025 —
 *    dibuang dari julat seksyen terakhir. Tanpa ini seksyen terakhir kelihatan
 *    seperti merangkumi 27 muka sedangkan 21 daripadanya tiada apa-apa teks,
 *    dan skor keyakinan menjadi mengelirukan.
 */
export function kesanSeksyen(muka: MukaDokumen[]): SeksyenDikesan[] {
  const mula: { i: number; tajuk: string; jenis: NonNullable<ReturnType<typeof kesanJenis>> }[] = [];

  muka.forEach((m, i) => {
    const tajuk = tajukMuka(m.baris);
    if (!tajuk || !kelihatanTajuk(tajuk)) return;
    const jenis = kesanJenis(tajuk);
    if (!jenis) return;
    // Muka berturutan dengan jenis SAMA ialah sambungan, bukan seksyen baharu.
    //
    // KECUALI bagi jenis yang dipecah ikut tajuk: takwim dicetak bulan demi
    // bulan, dan setiap bulan ada tajuknya sendiri. Tajuk yang BERBEZA
    // bermakna bulan baharu; tajuk yang SAMA bermakna muka sambungan bulan
    // itu, dan itu tetap dicantum.
    const akhir = mula[mula.length - 1];
    if (akhir && akhir.jenis.kod === jenis.kod) {
      if (!jenis.pecahIkutTajuk) return;
      if (samaTajuk(akhir.tajuk, tajuk)) return;
    }
    mula.push({ i, tajuk, jenis });
  });

  // Kumpulkan muka bagi setiap kemunculan, kemudian gabung kemunculan yang
  // sepatutnya menjadi satu.
  type Kepingan = { tajuk: string; jenis: (typeof mula)[number]["jenis"]; muka: MukaDokumen[] };
  const kepingan: Kepingan[] = mula.map((s, n) => {
    const hingga = n + 1 < mula.length ? mula[n + 1].i : muka.length;
    let isi = muka.slice(s.i, hingga);
    // Buang muka gambar di HUJUNG sahaja — gambar di tengah seksyen (carta
    // organisasi, sisipan) memang sebahagian daripadanya.
    while (isi.length > 1 && isi[isi.length - 1].gambar) isi = isi.slice(0, -1);
    return { tajuk: s.tajuk, jenis: s.jenis, muka: isi };
  });

  const gabung: Kepingan[] = [];
  for (const k of kepingan) {
    const sama = k.jenis.gabungSemua
      ? gabung.find((g) => g.jenis.kod === k.jenis.kod)
      : undefined;
    if (sama) sama.muka.push(...k.muka);
    else gabung.push(k);
  }

  return gabung.map((s) => {
    const amaran: string[] = [];
    let lajur: string[] = [];
    let baris: string[][] = [];

    // BENTUK DINILAI SEMULA dari kandungan, bukan dipercayai dari tajuk.
    // Tajuk "GURU PENASIHAT KO AKADEMIK" menjanjikan senarai nama; mukanya
    // sebenarnya senarai bidang tugas. Mempercayai tajuk menghasilkan
    // seksyen kosong dan amaran yang menghantar admin mencari kesilapan
    // yang tidak wujud.
    // BENTUK DINILAI PER MUKA, bukan sekali untuk seluruh seksyen.
    //
    // Satu seksyen boleh mengandungi muka senarai DAN muka bidang tugas —
    // buku 2026 menyusunnya begitu: senarai jawatankuasa dahulu, kemudian
    // bidang tugas setiap jawatan. Menilai sekali untuk seluruh seksyen
    // bermakna satu muka berbulet menukar bentuk SEMUA muka, dan seksyen
    // Ketua Panitia 2026 hilang sepenuhnya kerana itu: 152 baris pada 2025
    // menjadi 0 pada 2026.
    const mukaTugas = s.muka.filter((m) => kelihatanTugas([m]));
    const mukaSenarai = s.muka.filter((m) => !kelihatanTugas([m]));
    const bentuk: "jadual" | "senarai" | "tugas" =
      mukaSenarai.length === 0 ? "tugas" : s.jenis.bentuk;

    if (bentuk === "tugas") {
      lajur = ["Peranan", "Bidang Tugas"];
      for (const m of s.muka) baris.push(...huraiTugas(m.sel ?? []));
    } else if (bentuk === "senarai") {
      lajur = ["Jawatankuasa", "Jawatan", "Nama"];
      // Kumpulan DITERUSKAN merentas muka: satu jawatankuasa boleh melimpah
      // ke muka berikutnya, dan tajuknya tidak dicetak semula di sana.
      let kumpulan = "";
      for (const m of mukaSenarai) {
        const hasil = m.sel?.length
          ? huraiSenaraiDariSel(m.sel, kumpulan)
          : huraiSenarai(m.baris, kumpulan);
        if (hasil.length) kumpulan = hasil[hasil.length - 1][0];
        for (const r of hasil) {
          baris.push([
            r[0], r[1],
            buangNomborMelekat(buangAkronimMelekat(r[2], `${s.tajuk} ${r[0]}`)),
          ]);
        }
      }
      // MUKA BIDANG TUGAS TIDAK DICAMPUR ke dalam seksyen senarai.
      //
      // Ia pernah dilampirkan sebagai baris `[peranan, "Bidang Tugas", ayat]`
      // supaya tiada apa hilang. Tetapi seksyen senarai berlajur
      // [Jawatankuasa, Jawatan, Nama], jadi ayat tugasan muncul di bawah
      // "Nama" — dan skrin semakan berbohong tentang apa yang dilihat admin.
      // Satu seksyen, satu bentuk. Amaran di bawah menyebut berapa muka
      // yang ditinggalkan, jadi ia tidak hilang senyap.
      if (mukaTugas.length > 0) {
        amaran.push(
          `${mukaTugas.length} muka dalam seksyen ini ialah BIDANG TUGAS, bukan senarai nama — ` +
          "ia tidak dimasukkan di sini supaya seksyen ini kekal satu bentuk.",
        );
      }
    } else {
      const grid = s.muka
        .map((m) => (m.jadual?.length ? m.jadual : m.item?.length ? gridDariKedudukan(m.item) : null))
        .filter((g): g is string[][] => !!g && g.length > 0);

      lajur = kepalaBerulang(grid);
      const kunciKepala = lajur.map((c) => c.trim().toUpperCase()).join("\u0001");
      // Tajuk muka dicetak semula di atas setiap muka seksyen. Dalam grid ia
      // menjadi baris satu sel, dan ia BUKAN data — ia tajuk yang admin sudah
      // nampak di kepala seksyen.
      const tajukSeksyen = new Set(
        s.muka.map((m) => tajukMuka(m.baris).trim().toUpperCase()).filter((t) => t !== ""),
      );
      for (const g of grid) {
        // NOMBOR MUKA SURAT DI KAKI (atau kepala) MUKA.
        //
        // Buku mencetak nombor muka pada setiap muka, dan grid menangkapnya
        // seperti sel biasa. Ia muncul sebagai baris tanpa makna — "138",
        // "144", "149" — yang pengguna dengan betul tanya "benda apa ni".
        //
        // Ujiannya mudah kerana jawapannya mudah: baris yang isinya HANYA
        // satu nombor bogel tidak membawa apa-apa makna dalam mana-mana
        // seksyen buku ini. Kalau ia nombor muka, ia bukan data. Kalau ia
        // lajur "Bil" yang kehilangan namanya, ia tetap tiada gunanya —
        // "47" tanpa nama tidak memberitahu sesiapa apa-apa.
        for (let iB = 0; iB < g.length; iB++) {
          const b = g[iB];
          const isi = b.filter((c) => c.trim() !== "");
          if (isi.length === 1 && /^\d{1,4}$/.test(isi[0].trim())) continue;
          // Kepala dicetak semula pada setiap muka — simpan sekali, bukan
          // sekali bagi setiap muka.
          if (kunciKepala && b.map((c) => c.trim().toUpperCase()).join("\u0001") === kunciKepala) continue;
          const berisi = b.filter((c) => c.trim() !== "");
          if (berisi.length === 0) continue;
          if (berisi.length === 1 && tajukSeksyen.has(berisi[0].trim().toUpperCase())) continue;
          baris.push(b);
        }
      }
      ({ lajur, baris } = pangkasLajur(lajur, baris));

      if (baris.length === 0) {
        amaran.push("Tiada jadual dikesan dalam seksyen ini — kemungkinan ia gambar atau imbasan.");
      }
    }

    if (bentuk === "tugas" && bentuk !== s.jenis.bentuk) {
      amaran.push(
        "Seksyen ini menyenaraikan BIDANG TUGAS, bukan nama orang — " +
        "tiada nama untuk dibaca di sini, dan itu bukan kesilapan bacaan.",
      );
    }

    const bilGambar = s.muka.filter((m) => m.gambar).length;
    if (bilGambar > 0) {
      amaran.push(
        `${bilGambar} daripada ${s.muka.length} muka dalam seksyen ini ialah gambar — isinya tidak boleh dibaca sebagai teks.`,
      );
    }

    // Keyakinan dikira ke atas muka BERTEKS sahaja. Membahagi dengan muka
    // gambar menghukum seksyen yang sebenarnya dibaca sempurna.
    const mukaTeks = Math.max(1, s.muka.length - bilGambar);
    // Muka bidang tugas menghasilkan lebih sedikit baris setiap muka
    // daripada senarai nama, jadi pembahagi yang sama menghukumnya tanpa
    // sebab dan menandakannya "keyakinan rendah" sedangkan ia dibaca penuh.
    const faktor = bentuk === "tugas" ? 8 : 12;
    const keyakinan = Math.max(0, Math.min(100, Math.round((baris.length / mukaTeks) * faktor)));
    if (keyakinan < 30) {
      amaran.push("Sedikit sahaja data dikesan berbanding saiz seksyen — semak rapi.");
    }

    return {
      kod: s.jenis.kod,
      tajuk: s.tajuk,
      mukaMula: s.muka[0]?.muka ?? 0,
      mukaAkhir: s.muka[s.muka.length - 1]?.muka ?? 0,
      bentuk,
      lajur,
      baris,
      keyakinan,
      amaran,
    };
  });
}
