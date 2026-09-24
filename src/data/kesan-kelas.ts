import { semuaKelas, semuaKelasPPKI } from "./kelas.ts";

/**
 * Kesan kelas daripada KANDUNGAN fail, kemudian daripada namanya.
 *
 * Kandungan didahulukan kerana ia yang dicetak sekolah: jadual 2 MAJU
 * mengandungi "2 MAJU" sebagai tajuknya, dan senarai murid 4 BESTARI
 * mengandungi "4 BESTARI" pada kepalanya. Nama fail hanya sandaran — ia
 * mudah ditukar orang, dan pentadbir yang menyusun 57 fail memang
 * menamakannya ikut suka.
 *
 * Nama TERPANJANG dipadankan dahulu, supaya "1 INTELEK" tidak dikalahkan
 * oleh padanan separa kelas lain.
 *
 * Dipisahkan ke `data/` supaya laluan jadual waktu DAN laluan senarai murid
 * berkongsi pengesan yang sama — dan supaya ujian boleh memanggilnya tanpa
 * pangkalan data.
 */
export function kesanKelas(teks: string, namaFail: string): string | null {
  const senarai = [...semuaKelas(), ...semuaKelasPPKI()];
  const ikutPanjang = [...senarai].sort((a, b) => b.length - a.length);

  const isi = normal(teks);
  const dalamIsi = ikutPanjang.filter((k) => isi.includes(normal(k)));
  if (dalamIsi.length === 1) return dalamIsi[0];
  if (dalamIsi.length > 1) return null;

  const nama = normal(namaFail);
  const dalamNama = ikutPanjang.filter((k) => nama.includes(normal(k)));
  return dalamNama.length === 1 ? dalamNama[0] : null;
}

function normal(t: string): string {
  return ` ${(t ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

/**
 * SEMUA kelas yang disebut dalam satu teks, bukan satu.
 *
 * `kesanKelas` di atas memulangkan null apabila lebih daripada satu kelas
 * dijumpai, dan itu betul untuk satu fail satu kelas: meneka antara dua kelas
 * bermakna menulis jadual seorang guru ke dalam kelas orang lain.
 *
 * Tetapi pentadbir menyerahkan SATU PDF yang mengandungi semua kelas. Pada
 * fail itu, "lebih daripada satu" bukan kekaburan — ia strukturnya. Fungsi ini
 * membolehkan pemanggil melihat berapa banyak kelas ada pada satu muka surat,
 * dan dengan itu tahu sama ada muka itu milik satu kelas (boleh dibaca) atau
 * ialah jadual induk beberapa kelas (mesti dilaporkan, bukan diteka).
 *
 * Diisih ikut panjang menurun semasa memadan supaya "1 AMANAH" tidak
 * tersalah padan sebagai "1 AMAN" bila kedua-duanya wujud.
 */
export function semuaKelasDalam(teks: string): string[] {
  const senarai = [...semuaKelas(), ...semuaKelasPPKI()];
  const ikutPanjang = [...senarai].sort((a, b) => b.length - a.length);
  const isi = normal(teks);

  const jumpa: string[] = [];
  let baki = isi;
  for (const k of ikutPanjang) {
    const n = normal(k).trim();
    if (!n) continue;
    if (baki.includes(` ${n} `)) {
      jumpa.push(k);
      // Buang padanan supaya nama yang lebih pendek di dalamnya tidak
      // dikira dua kali.
      baki = baki.split(` ${n} `).join(" ");
    }
  }
  return jumpa;
}
