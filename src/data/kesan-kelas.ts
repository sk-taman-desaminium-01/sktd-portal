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
