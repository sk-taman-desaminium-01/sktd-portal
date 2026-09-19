"use server";

import { pastikanBoleh } from "./akses";
import { muatanKeFail, type MuatanFail } from "@/data/fail-base64";
import { pilihBacaan, type Calon } from "@/data/pilih-bacaan";
import { calonDariFail } from "./baca-murid-fail";
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
