/**
 * Menarik muka surat dari PDF menjadi teks berstruktur.
 *
 * Fungsi ini TIDAK mengimport pdf.js. Ia menerima objek dokumen yang sudah
 * dibuka, kerana dua tempat membukanya dengan cara berbeza:
 *
 *   · PELAYAN  — `getDocumentProxy` dari `unpdf`
 *   · PELAYAR  — `getDocument` dari `unpdf/pdfjs`
 *
 * Buku Pengurusan sebenar ialah 14.3 MB. Dihantar sebagai base64 ia menjadi
 * 19.0 MB — melebihi had badan permintaan, dan juga melebihi had saiz fail
 * portal. Maka buku dibaca DALAM PELAYAR, dan hanya TEKSNYA dihantar ke
 * pelayan. Fail 14.3 MB itu tidak pernah meninggalkan peranti admin.
 *
 * Itu bukan sekadar helah saiz. Ia bermakna satu-satunya salinan buku yang
 * kekal ialah salinan sekolah sendiri, dan yang kita simpan hanyalah senarai
 * nama dan tarikh yang admin sudah sahkan.
 */

import { normalkanMuka, jadualMuka, type ItemMentah } from "./muka-teks.ts";

export interface MukaBaca {
  muka: number;
  baris: string[];
  jadual: string[][] | null;
  /** Putaran yang dikesan dan dibetulkan. 0 untuk muka biasa. */
  putaran: number;
  /** Bilangan serpihan teks. 0–2 bermakna muka itu gambar. */
  bilItem: number;
  /** Perkara luar biasa: muka senget, teks mengiring, saiz huruf tiada. */
  amaran: string[];
}

/** Bentuk minimum yang diperlukan dari pdf.js — supaya modul ini tidak terikat. */
interface DokumenPdf {
  numPages: number;
  getPage(n: number): Promise<{
    getViewport(p: { scale: number }): { transform: number[]; width: number; height: number };
    getTextContent(): Promise<{ items: unknown[] }>;
  }>;
}

export async function mukaDariPdf(
  pdf: DokumenPdf,
  lapor?: (siap: number, jumlah: number) => void,
): Promise<MukaBaca[]> {
  const keluar: MukaBaca[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    try {
      const p = await pdf.getPage(n);
      const vp = p.getViewport({ scale: 1 });
      const isi = (await p.getTextContent()).items as ItemMentah[];
      const muka = normalkanMuka(isi, vp.transform, vp.width, vp.height);
      keluar.push({
        muka: n,
        baris: muka.baris,
        jadual: jadualMuka(muka),
        putaran: muka.putaran,
        bilItem: muka.item.length,
        amaran: muka.amaran,
      });
    } catch {
      // Peraturan #10: satu muka rosak tidak menjatuhkan seluruh kerja.
      // Muka itu direkod sebagai kosong, dan ringkasan akan menyebutnya.
      keluar.push({ muka: n, baris: [], jadual: null, putaran: 0, bilItem: 0,
                    amaran: ["Muka ini tidak dapat dibaca — ia dilangkau."] });
    }
    if (lapor) {
      lapor(n, pdf.numPages);
      // LEPASKAN BENANG UTAMA antara muka surat.
      //
      // Binaan pdf.js ini berjalan TANPA pekerja, jadi semua kerja berada pada
      // benang utama pelayar. `await` ke atas janji yang sudah selesai hanya
      // menghasilkan mikrotugas, dan mikrotugas TIDAK membenarkan pelayar
      // melukis semula — bar kemajuan akan melompat dari 0 terus ke 100 tanpa
      // pernah bergerak. `setTimeout(0)` ialah makrotugas, jadi setiap muka
      // yang siap benar-benar kelihatan.
      //
      // Kosnya diukur, bukan diagak: buku 174 muka siap dalam 1.8 saat dalam
      // Chrome sebenar DENGAN yield ini. Itu harga yang berbaloi.
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return keluar;
}

/**
 * Muka yang teksnya terlalu sedikit untuk BERASAL dari teks — ia gambar.
 *
 * Ambang 3 item, bukan 0: muka gambar dalam buku sebenar tetap membawa
 * nombor mukanya sebagai teks, kadang dengan tajuk kecil. Melaporkannya
 * sebagai "berjaya dibaca" kerana satu nombor dijumpai adalah menipu.
 */
export function mukaGambar(muka: MukaBaca[]): number[] {
  return muka.filter((m) => m.bilItem <= 3).map((m) => m.muka);
}

/**
 * Amaran peringkat dokumen, dikumpul dari setiap muka.
 *
 * Amaran yang sama pada 40 muka disebut SEKALI, dengan bilangannya. Menyenarai
 * 40 baris yang serupa bermakna admin berhenti membacanya, dan amaran yang
 * tidak dibaca tidak melindungi sesiapa.
 */
export function amaranDokumen(muka: MukaBaca[]): string[] {
  const kira = new Map<string, number[]>();
  for (const m of muka) {
    for (const a of m.amaran) {
      // Nombor darjah berbeza setiap muka; kumpulkan mengikut BENTUK amaran.
      const bentuk = a.replace(/-?\d+(\.\d+)?/g, "#");
      const ada = kira.get(bentuk);
      if (ada) ada.push(m.muka);
      else kira.set(bentuk, [m.muka]);
    }
  }
  return [...kira.entries()].map(([bentuk, mukaSurat]) =>
    mukaSurat.length === 1
      ? `m.${mukaSurat[0]}: ${bentuk.replace(/#/g, "beberapa")}`
      : `${mukaSurat.length} muka: ${bentuk.replace(/#/g, "beberapa")}`,
  );
}
