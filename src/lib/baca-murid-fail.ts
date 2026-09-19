import "server-only";

import { bacaDokumen } from "./baca-dokumen";
import { mukaDariPdf } from "./muka-pdf";
import type { Calon } from "@/data/pilih-bacaan";

/**
 * BACAAN CALON DARI SATU FAIL SENARAI MURID.
 *
 * Dipisahkan dari `fail-murid.ts` kerana DUA laluan memerlukannya sekarang:
 * import satu kelas (pentadbir memilih kelasnya sendiri) dan muat naik
 * PUKAL (kelas dikesan dari isi fail). Menyalinnya bermakna satu pembetulan
 * pada cara bacaan hanya sampai kepada separuh sistem.
 *
 * Fail ini BUKAN modul "use server" — ia tidak mendedahkan titik akhir. Itu
 * disengajakan: hanya `fail-murid.ts` dan `pukal-murid.ts` yang memanggilnya,
 * dan kedua-duanya menyemak kebenaran dahulu.
 *
 * KENAPA BEBERAPA CARA, BUKAN SATU. Fail iDMe jarang lurus: ia terbalik,
 * berputar 90°, atau senget. Enjin bacaan sudah membetulkan putaran dari
 * matriks teks PDF — tetapi apabila imbasan cukup teruk, pembetulan itu
 * sendiri boleh tersasar. Jadi fail yang sama dibaca beberapa cara dan yang
 * menghasilkan No. KP sah paling banyak dipilih. Mengira BARIS akan memilih
 * sampah yang paling banyak.
 */
export async function calonDariFail(fail: File): Promise<Calon[]> {
  const nama = fail.name.toLowerCase();

  if (nama.endsWith(".pdf")) {
    const { getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await fail.arrayBuffer()));
    const muka = await mukaDariPdf(pdf);

    const selIkutBaris = muka
      .flatMap((m) => m.sel.map((baris) => baris.join(" ")))
      .join("\n");

    const barisMentah = muka.flatMap((m) => m.baris).join("\n");

    // LAJUR DIBACA MENEGAK. Bila imbasan berputar 90° dan pembetulan
    // matriks tersasar, nama dan No. KP berakhir dalam LAJUR yang berbeza
    // dan bukan baris yang sama. Membaca menegak menyusunnya semula.
    const menegak = muka
      .map((m) => {
        const lebar = Math.max(0, ...m.sel.map((b) => b.length));
        const lajur: string[] = [];
        for (let c = 0; c < lebar; c++) {
          lajur.push(m.sel.map((b) => (b[c] ?? "").trim()).filter((x) => x !== "").join(" "));
        }
        return lajur.join("\n");
      })
      .join("\n");

    // Jadual yang dikesan enjin, bila ada — bentuk paling bersih.
    const jadual = muka
      .map((m) => (m.jadual ?? []).map((b) => b.join(" ")).join("\n"))
      .filter((t) => t.trim() !== "")
      .join("\n");

    return [
      { cara: "jadual PDF", teks: jadual },
      { cara: "sel mengikut baris", teks: selIkutBaris },
      { cara: "teks mentah", teks: barisMentah },
      { cara: "lajur dibaca menegak", teks: menegak },
    ];
  }

  // XLSX, DOCX, CSV, TXT — `bacaDokumen` sudah mengendalikan kesemuanya.
  const dok = await bacaDokumen(fail);

  const ikutBaris = dok.grid
    .flatMap((helaian) => helaian.map((baris) => baris.join(" ")))
    .join("\n");

  const menegak = dok.grid
    .map((helaian) => {
      const lebar = Math.max(0, ...helaian.map((b) => b.length));
      const lajur: string[] = [];
      for (let c = 0; c < lebar; c++) {
        lajur.push(helaian.map((b) => (b[c] ?? "").trim()).filter((x) => x !== "").join(" "));
      }
      return lajur.join("\n");
    })
    .join("\n");

  return [
    { cara: namaJenis(nama), teks: ikutBaris },
    { cara: `${namaJenis(nama)} — teks penuh`, teks: dok.teks },
    { cara: `${namaJenis(nama)} — lajur menegak`, teks: menegak },
  ];
}

export function namaJenis(nama: string): string {
  if (nama.endsWith(".xlsx") || nama.endsWith(".xls")) return "helaian Excel";
  if (nama.endsWith(".docx") || nama.endsWith(".doc")) return "dokumen Word";
  if (nama.endsWith(".csv")) return "fail CSV";
  return "teks biasa";
}
