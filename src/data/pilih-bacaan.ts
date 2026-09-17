import { bacaSenaraiMurid, type HasilKenal } from "../lib/kenal-murid.ts";

/**
 * MEMILIH BACAAN YANG TERBAIK, bukan meneka orientasi yang betul.
 *
 * MASALAH YANG INI SELESAIKAN. Fail senarai murid dari iDMe datang sebagai
 * PDF imbasan, dan imbasan itu jarang lurus: ia terbalik, ia berputar 90°,
 * ia senget ke kiri. Pengalaman projek eGPI dahulu: kami berkali-kali
 * tersalah baca fail itu, dan setiap kali puncanya sama — kod meneka satu
 * orientasi, teruskan dengannya, dan hasilnya sampah yang kelihatan seperti
 * data.
 *
 * Penyelesaiannya bukan meneka dengan lebih pandai. Ia BERHENTI meneka:
 * hasilkan beberapa bacaan calon dari fail yang sama, jalankan pengecam
 * murid pada setiap satu, dan pilih yang benar-benar menghasilkan murid.
 * Nombor Kad Pengenalan Malaysia ialah penanda yang hampir mustahil muncul
 * secara kebetulan — dua belas digit dengan tarikh lahir yang sah di
 * hadapannya. Bacaan yang menghasilkan 34 No. KP sah ialah bacaan yang
 * betul; bacaan yang menghasilkan sifar bukan.
 *
 * Ini menukar "harap orientasinya betul" kepada "ukur, kemudian pilih".
 */

export interface Calon {
  /** Nama cara bacaan ini, untuk dilaporkan kepada pentadbir. */
  cara: string;
  teks: string;
}

export interface BacaanTerpilih {
  cara: string;
  teks: string;
  hasil: HasilKenal;
  /** Bilangan murid dengan No. KP yang sah. */
  skor: number;
  /** Semua calon dengan skornya — dipapar supaya pilihan itu boleh disemak. */
  semua: { cara: string; skor: number }[];
}

/**
 * Skor satu bacaan.
 *
 * DIKIRA DARI No. KP SAH SAHAJA, bukan dari bilangan baris. Bacaan yang
 * salah orientasi tetap menghasilkan banyak baris teks — ia cuma tidak
 * menghasilkan No. KP. Mengira baris akan memilih sampah yang paling banyak.
 *
 * "Sah" bermakna dua belas digit DAN enam digit pertamanya membentuk tarikh
 * yang wujud. Amaran lain — umur di luar julat murid sekolah rendah,
 * misalnya — TIDAK menolak skor: ia bermakna baris itu perlu disemak
 * manusia, bukan bahawa bacaan itu salah orientasi. Menuntut sifar amaran
 * di sini akan memberi setiap calon skor sifar pada fail yang mengandungi
 * seorang guru dalam senarainya.
 */
function skorkan(hasil: HasilKenal): number {
  return hasil.murid.filter((m) => m.no_kp !== null && m.lahir !== null).length;
}

export function pilihBacaan(calon: Calon[]): BacaanTerpilih | null {
  const dinilai = calon
    .filter((c) => c.teks.trim() !== "")
    .map((c) => {
      const hasil = bacaSenaraiMurid(c.teks);
      return { ...c, hasil, skor: skorkan(hasil) };
    });
  if (dinilai.length === 0) return null;

  // Seri dipecahkan oleh bilangan murid yang dikenali secara keseluruhan —
  // termasuk yang berbaki amaran. Kalau itu pun seri, calon PERTAMA menang,
  // dan urutan calon disusun dari yang paling biasa kepada yang paling jarang.
  const amaran = (h: HasilKenal) => h.murid.reduce((n, m) => n + m.amaran.length, 0);
  const terbaik = dinilai.reduce((a, b) => {
    if (b.skor !== a.skor) return b.skor > a.skor ? b : a;
    // Skor sama: yang lebih SEDIKIT amaran menang. Dua bacaan yang
    // menghasilkan bilangan No. KP yang sama tetapi satu daripadanya penuh
    // amaran ialah bacaan yang separuh tersasar.
    const ba = amaran(b.hasil);
    const aa = amaran(a.hasil);
    if (ba !== aa) return ba < aa ? b : a;
    return b.hasil.murid.length > a.hasil.murid.length ? b : a;
  });

  return {
    cara: terbaik.cara,
    teks: terbaik.teks,
    hasil: terbaik.hasil,
    skor: terbaik.skor,
    semua: dinilai.map((d) => ({ cara: d.cara, skor: d.skor })),
  };
}
