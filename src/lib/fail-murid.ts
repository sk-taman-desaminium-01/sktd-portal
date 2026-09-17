"use server";

import { pastikanBoleh } from "./akses";
import { muatanKeFail, type MuatanFail } from "@/data/fail-base64";
import { bacaDokumen } from "./baca-dokumen";
import { mukaDariPdf } from "./muka-pdf";
import { pilihBacaan, type Calon } from "@/data/pilih-bacaan";
import { importMuridKelas, type HasilImportKelas } from "./import-murid";

/**
 * IMPORT SENARAI MURID DARI FAIL.
 *
 * Pentadbir memuat turun senarai kelas dari iDMe dan mendapat PDF imbasan —
 * bukan teks yang kemas. Menampalnya satu demi satu untuk 57 kelas ialah
 * kerja sehari penuh, dan itulah sebabnya laluan ini wujud.
 *
 * KENAPA IA TIDAK MENEKA ORIENTASI. Fail iDMe jarang lurus: ia terbalik,
 * berputar 90°, atau senget ke kiri. Enjin bacaan (`muka-teks.ts`) sudah
 * membetulkan putaran dan kesengetan dari matriks teks PDF — tetapi apabila
 * imbasan itu cukup teruk, pembetulan itu sendiri boleh tersasar.
 *
 * Jadi fail yang sama dibaca BEBERAPA CARA, dan yang menghasilkan No. KP
 * yang sah paling banyak dipilih. Lihat `@/data/pilih-bacaan`. Pentadbir
 * diberitahu cara mana yang menang dan berapa skor setiap satu, supaya
 * pilihan itu boleh disemak dan bukan dipercayai buta.
 */

export interface HasilFail extends HasilImportKelas {
  /** Cara bacaan yang dipilih, dan skor setiap calon. */
  cara?: string;
  calon?: { cara: string; skor: number }[];
  /** Teks yang akhirnya digunakan — pentadbir boleh menyuntingnya. */
  teks?: string;
}

const HAD_BAIT = 25 * 1024 * 1024;

export async function importFailMurid(
  tahun: number, kelas: string, muatan: MuatanFail, simpan = false,
): Promise<HasilFail> {
  try {
    await pastikanBoleh("urus_guru_kelas");
  } catch {
    return { ok: false, kering: true, mesej: "Tiada kebenaran." };
  }

  let fail: File;
  try {
    fail = muatanKeFail(muatan);
  } catch {
    return { ok: false, kering: true, mesej: "Fail tidak dapat dibaca." };
  }
  if (fail.size > HAD_BAIT) {
    return {
      ok: false, kering: true,
      mesej: `Fail terlalu besar (${(fail.size / 1024 / 1024).toFixed(1)} MB). Had 25 MB.`,
    };
  }

  let calon: Calon[];
  try {
    calon = await calonDariFail(fail);
  } catch (e) {
    return {
      ok: false, kering: true,
      mesej: "Fail gagal dibaca: " + (e instanceof Error ? e.message : String(e)),
    };
  }

  const pilih = pilihBacaan(calon);
  if (!pilih || pilih.skor === 0) {
    return {
      ok: false, kering: true,
      calon: pilih?.semua,
      mesej:
        "Tiada No. KP dikesan dalam fail ini walau dibaca " +
        `${calon.length} cara berlainan. Kalau ia PDF hasil imbasan, teksnya ` +
        "mungkin gambar semata-mata — tiada penghurai boleh membaca teks yang " +
        "tidak wujud. Salin senarai itu dan tampal terus sebagai gantinya.",
    };
  }

  const hasil = await importMuridKelas(tahun, kelas, pilih.teks, simpan);
  return {
    ...hasil,
    cara: pilih.cara,
    calon: pilih.semua,
    teks: pilih.teks,
    mesej:
      `${hasil.mesej} Dibaca sebagai "${pilih.cara}" — ` +
      `cara yang menghasilkan No. KP sah paling banyak (${pilih.skor}) ` +
      `daripada ${pilih.semua.length} cara yang dicuba.`,
  };
}

/* ------------------------------------------------------------- calon bacaan */

/**
 * Hasilkan beberapa bacaan calon dari satu fail.
 *
 * Urutan disengajakan: yang paling biasa dahulu, kerana seri dipecahkan oleh
 * urutan. Bagi PDF, "sel mengikut baris" ialah bentuk jadual iDMe yang
 * lazim; "teks mentah" ialah sandaran untuk muka yang bukan jadual.
 */
async function calonDariFail(fail: File): Promise<Calon[]> {
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

  // Helaian Excel dan CSV membawa struktur lajur. Kedua-dua bentuk
  // dihasilkan: baris (biasa) dan lajur menegak (bila fail itu disusun
  // menegak, yang berlaku pada eksport tertentu).
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

function namaJenis(nama: string): string {
  if (nama.endsWith(".xlsx") || nama.endsWith(".xls")) return "helaian Excel";
  if (nama.endsWith(".docx") || nama.endsWith(".doc")) return "dokumen Word";
  if (nama.endsWith(".csv")) return "fail CSV";
  return "teks biasa";
}
