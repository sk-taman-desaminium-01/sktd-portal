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

export interface MukaDokumen {
  muka: number;
  /** Teks muka ini, satu baris satu elemen. */
  baris: string[];
  /** Koordinat teks, bila ada — hanya PDF. */
  item?: ItemKedudukan[];
}

export interface SeksyenDikesan {
  kod: KodSeksyen;
  tajuk: string;
  mukaMula: number;
  mukaAkhir: number;
  bentuk: "jadual" | "senarai";
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

const RE_PERANAN = /^\s*(.*?)\s*[:：]\s*(.+?)\s*$/;

/**
 * Baris "PERANAN : NAMA".
 *
 * Baris sambungan ": NAMA LAIN" mewarisi peranan baris sebelumnya — itu cara
 * buku sebenar menyenaraikan beberapa orang bagi satu jawatan, dan
 * mengabaikannya bermakna kehilangan setiap ahli kecuali yang pertama.
 */
export function huraiSenarai(baris: string[]): string[][] {
  const keluar: string[][] = [];
  let peranan = "";
  for (const b of baris) {
    const m = RE_PERANAN.exec(b);
    if (!m) continue;
    const label = m[1].trim();
    const nilai = m[2].trim();
    if (!nilai || nilai.length < 2) continue;
    if (label) peranan = label;
    if (!peranan) continue;
    keluar.push([peranan, nilai]);
  }
  return keluar;
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

/* --------------------------------------------------------- pengesan seksyen */

/**
 * Bahagikan dokumen kepada seksyen.
 *
 * Muka yang tajuknya memadankan jenis seksyen MEMULAKAN seksyen baharu;
 * muka selepasnya tergolong dalam seksyen itu sehingga tajuk lain dikesan.
 * Muka sebelum seksyen pertama diabaikan — itu muka hadapan, kata aluan dan
 * ikrar, yang tiada data berstruktur.
 */
export function kesanSeksyen(muka: MukaDokumen[]): SeksyenDikesan[] {
  const mula: { i: number; tajuk: string; jenis: NonNullable<ReturnType<typeof kesanJenis>> }[] = [];

  muka.forEach((m, i) => {
    const tajuk = tajukMuka(m.baris);
    if (!tajuk || !kelihatanTajuk(tajuk)) return;
    const jenis = kesanJenis(tajuk);
    if (!jenis) return;
    // Muka berturutan dengan jenis SAMA ialah sambungan, bukan seksyen baharu.
    const akhir = mula[mula.length - 1];
    if (akhir && akhir.jenis.kod === jenis.kod && i - akhir.i <= 12) return;
    mula.push({ i, tajuk, jenis });
  });

  return mula.map((s, n) => {
    const hingga = n + 1 < mula.length ? mula[n + 1].i : muka.length;
    const kepingan = muka.slice(s.i, hingga);
    const amaran: string[] = [];

    let lajur: string[] = [];
    let baris: string[][] = [];

    if (s.jenis.bentuk === "senarai") {
      lajur = ["Jawatan", "Nama"];
      baris = kepingan.flatMap((m) => huraiSenarai(m.baris));
    } else {
      for (const m of kepingan) {
        if (!m.item?.length) continue;
        const j = huraiJadual(m.item);
        if (j.baris.length === 0) continue;
        if (lajur.length === 0) lajur = j.lajur;
        baris.push(...j.baris);
      }
      if (baris.length === 0) {
        amaran.push(
          "Tiada jadual dikesan dalam seksyen ini — kemungkinan ia gambar atau imbasan.",
        );
      }
    }

    // Keyakinan: berapa banyak data berbanding bilangan muka. Seksyen lima
    // muka yang menghasilkan tiga baris hampir pasti tersalah baca.
    const perMuka = baris.length / Math.max(1, kepingan.length);
    const keyakinan = Math.max(0, Math.min(100, Math.round(perMuka * 12)));
    if (keyakinan < 30) {
      amaran.push("Sedikit sahaja data dikesan berbanding saiz seksyen — semak rapi.");
    }

    return {
      kod: s.jenis.kod,
      tajuk: s.tajuk,
      mukaMula: kepingan[0]?.muka ?? 0,
      mukaAkhir: kepingan[kepingan.length - 1]?.muka ?? 0,
      bentuk: s.jenis.bentuk,
      lajur,
      baris,
      keyakinan,
      amaran,
    };
  });
}
