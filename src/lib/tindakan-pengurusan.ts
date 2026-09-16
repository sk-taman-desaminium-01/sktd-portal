"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { semakFail } from "./storan";
import { bacaDokumen } from "./baca-dokumen";
import { muatanKeFail, type MuatanFail } from "@/data/fail-base64";
import { kesanSeksyen, type SeksyenDikesan, type MukaDokumen } from "./pengurusan-huraian";
import { JENIS_SEKSYEN, type KodSeksyen } from "@/data/seksyen-pengurusan";
import { bacaPenunjukKod } from "@/data/carta";
import {
  simpanDokumen, tukarSeksyen, padamDokumen,
  type SeksyenUntukSimpan,
} from "./pengurusan";
import { amaranDokumen, type MukaBaca } from "./muka-pdf";

/**
 * Tindakan pelayan bagi Buku Pengurusan.
 *
 * SETIAP tindakan dibalut try/catch dan memulangkan `{ ok, mesej }`.
 * Lontaran yang terlepas dari Server Action TIDAK sampai kepada admin sebagai
 * ralat yang boleh dibaca — Next menggantikannya dengan "An unexpected
 * response was received from the server", yang tidak menyebut apa yang gagal
 * mahupun di mana. Itu sudah berlaku dalam projek ini dan memakan beberapa
 * pusingan siasatan sebelum puncanya dijumpai.
 *
 * TIADA APA DITERBITKAN SECARA AUTOMATIK. Fungsi baca memulangkan CADANGAN;
 * admin menyemaknya di skrin, membetulkan jenis seksyen yang tersilap, dan
 * menekan Simpan sendiri. Buku pengurusan ialah sumber nama dan tarikh yang
 * seluruh sekolah akan bergantung padanya — tekaan di sini bermakna guru
 * membaca jawatan yang tidak pernah dilantik.
 */

export interface SeksyenCadangan extends SeksyenDikesan {
  /** Bolehkah jenis ini dipapar awam? Dari `JENIS_SEKSYEN`. */
  bolehAwam: boolean;
  suapan: string | null;
}

export interface HasilHurai {
  ok: boolean;
  mesej: string;
  jumlahMuka?: number;
  mukaGambar?: number[];
  seksyen?: SeksyenCadangan[];
  amaran?: string[];
}

function lengkapkan(seksyen: SeksyenDikesan[]): SeksyenCadangan[] {
  return seksyen.map((s) => {
    const jenis = JENIS_SEKSYEN.find((j) => j.kod === s.kod);
    return { ...s, bolehAwam: jenis?.bolehAwam ?? false, suapan: jenis?.suapan ?? null };
  });
}

function ringkasan(seksyen: SeksyenDikesan[], jumlahMuka: number, bilGambar: number): string {
  const baris = seksyen.reduce((a, s) => a + s.baris.length, 0);
  const lemah = seksyen.filter((s) => s.keyakinan < 30).length;
  return (
    `${jumlahMuka} muka dibaca · ${seksyen.length} seksyen dikenal pasti · ${baris} baris data` +
    (bilGambar > 0
      ? `. ${bilGambar} muka ialah GAMBAR — teksnya tidak wujud dalam fail, jadi ia tidak boleh dibaca.`
      : "") +
    (lemah > 0 ? ` ${lemah} seksyen berkeyakinan rendah — semak rapi sebelum simpan.` : "")
  );
}

/* ---------------------------------------------------- PDF: dibaca di pelayar */

/**
 * Hurai muka surat yang SUDAH ditarik oleh pelayar.
 *
 * Buku sebenar ialah 14.3 MB; sebagai base64 ia 19.0 MB, melebihi had badan
 * permintaan. Teks yang ditarik pula 0.44 MB — 43 kali lebih kecil. Jadi
 * pelayar membaca PDF, pelayan menghurai teksnya, dan fail itu sendiri tidak
 * pernah meninggalkan peranti admin.
 */
export async function huraiMuka(muka: MukaBaca[]): Promise<HasilHurai> {
  try {
    await pastikanBoleh("urus_pengurusan");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  try {
    if (!Array.isArray(muka) || muka.length === 0) {
      return { ok: false, mesej: "Tiada muka surat diterima dari pelayar." };
    }
    const gambar = muka.filter((m) => m.bilItem <= 3).map((m) => m.muka);
    const dok: MukaDokumen[] = muka.map((m) => ({
      muka: m.muka, baris: m.baris, jadual: m.jadual, gambar: m.bilItem <= 3,
    }));
    const seksyen = kesanSeksyen(dok);

    // PENUNJUK KOD JAWATAN disimpan sebagai seksyennya sendiri.
    //
    // Ia bukan sekadar nota kaki: ia yang memberitahu sistem bahawa "GAG"
    // bermaksud Guru Pendidikan Islam Sekolah Rendah di sekolah INI. Sumber
    // pihak ketiga memberi maksud yang LAIN sama sekali, jadi buku itu sendiri
    // mesti menang. Disimpan sebagai seksyen supaya admin boleh melihat dan
    // membetulkannya seperti mana-mana data lain.
    const penunjuk = bacaPenunjukKod(muka.flatMap((m) => m.baris));
    const kodPenunjuk = Object.entries(penunjuk);
    if (kodPenunjuk.length > 0) {
      seksyen.push({
        kod: "lain",
        tajuk: "Penunjuk Kod Jawatan",
        mukaMula: 0, mukaAkhir: 0,
        bentuk: "jadual",
        lajur: ["Kod", "Jawatan"],
        baris: kodPenunjuk.map(([k, v]) => [k, v]),
        keyakinan: 100,
        amaran: [],
      });
    }

    if (seksyen.length === 0) {
      return {
        ok: false, jumlahMuka: muka.length, mukaGambar: gambar,
        mesej:
          "Fail dibaca, tetapi tiada seksyen dikenal pasti. Sistem mengenal " +
          "seksyen melalui TAJUKNYA — kalau buku ini menggunakan tajuk yang " +
          "berlainan, ia tidak akan padan. Beritahu admin supaya tajuk itu " +
          "boleh ditambah.",
      };
    }
    return {
      ok: true,
      jumlahMuka: muka.length,
      mukaGambar: gambar,
      seksyen: lengkapkan(seksyen),
      amaran: amaranDokumen(muka),
      mesej: ringkasan(seksyen, muka.length, gambar.length),
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/* ------------------------------------------- DOCX / XLSX / CSV: di pelayan */

/**
 * Hurai fail bukan-PDF, yang dihantar penuh sebagai base64.
 *
 * DOCX dan Excel menyimpan baris dan lajur SEBENAR, jadi tiada koordinat
 * perlu ditafsir — dan failnya jauh lebih kecil daripada PDF, jadi ia muat
 * dalam badan permintaan tanpa helah.
 */
export async function huraiFail(muatan: MuatanFail): Promise<HasilHurai> {
  try {
    await pastikanBoleh("urus_pengurusan");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  try {
    if (!muatan?.data) return { ok: false, mesej: "Tiada fail dipilih." };
    const fail = muatanKeFail(muatan);
    const tolak = semakFail(fail);
    if (tolak) return { ok: false, mesej: tolak };

    const dokumen = await bacaDokumen(fail);
    if (dokumen.jenis === "imbasan" || dokumen.jenis === "lain") {
      return { ok: false, mesej: dokumen.amaran[0] ?? "Fail ini tidak boleh dibaca.", amaran: dokumen.amaran };
    }

    // Satu helaian atau satu jadual = satu "muka". Teks rata dipecah kepada
    // baris supaya pengesan tajuk berfungsi sama seperti pada PDF.
    const barisTeks = dokumen.teks.split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
    const muka: MukaDokumen[] = dokumen.grid.length
      ? dokumen.grid.map((g, i) => ({
          muka: i + 1,
          baris: g.map((b) => b.filter((c) => c.trim()).join(" ")).filter(Boolean),
          jadual: g,
        }))
      : [{ muka: 1, baris: barisTeks, jadual: null }];

    const seksyen = kesanSeksyen(muka);
    if (seksyen.length === 0) {
      return { ok: false, jumlahMuka: muka.length, mesej: "Fail dibaca, tetapi tiada seksyen dikenal pasti." };
    }
    return {
      ok: true, jumlahMuka: muka.length, mukaGambar: [],
      seksyen: lengkapkan(seksyen),
      mesej: ringkasan(seksyen, muka.length, 0),
      amaran: dokumen.amaran.length ? dokumen.amaran : undefined,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/* ------------------------------------------------------------------ simpan */

export interface HasilSimpan {
  ok: boolean;
  mesej: string;
  id?: string;
}

export async function simpanPengurusan(
  maklumat: { tahun: number; namaFail: string; muka: number; jenisFail: string },
  seksyen: SeksyenUntukSimpan[],
): Promise<HasilSimpan> {
  let saya;
  try {
    saya = await pastikanBoleh("urus_pengurusan");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  try {
    const pilih = seksyen.filter((s) => s.baris.length > 0);
    if (pilih.length === 0) {
      return { ok: false, mesej: "Tiada seksyen berisi untuk disimpan." };
    }
    const tahun = Number(maklumat.tahun);
    if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
      return { ok: false, mesej: "Tahun tidak sah." };
    }

    const hasil = await simpanDokumen(
      { ...maklumat, tahun, oleh: saya.emel ?? "" },
      pilih,
    );
    revalidatePath("/admin/pengurusan");
    revalidatePath("/admin");
    return {
      ok: true, id: hasil.id,
      mesej:
        `Disimpan sebagai edisi ${tahun} versi ${hasil.versi} — ` +
        `${pilih.length} seksyen, ${hasil.bilBaris} baris. Edisi lama TIDAK dipadam.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/* ------------------------------------------------------------- urus seksyen */

export async function tukarSeksyenTindakan(
  id: string,
  ubah: { kod?: KodSeksyen; paparan?: "awam" | "dalaman"; status?: "draf" | "disahkan" },
): Promise<{ ok: boolean; mesej: string }> {
  try {
    await pastikanBoleh("urus_pengurusan");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  try {
    // Seksyen yang jenisnya TIDAK boleh awam tidak boleh dipaksa awam melalui
    // permintaan yang direka tangan. Semakan ini di PELAYAN, bukan di UI.
    if (ubah.paparan === "awam" && ubah.kod) {
      const jenis = JENIS_SEKSYEN.find((j) => j.kod === ubah.kod);
      if (!jenis?.bolehAwam) return { ok: false, mesej: "Jenis seksyen ini tidak boleh dipapar awam." };
    }
    await tukarSeksyen(id, ubah);
    revalidatePath("/admin/pengurusan");
    return { ok: true, mesej: "Dikemas kini." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function padamDokumenTindakan(id: string): Promise<{ ok: boolean; mesej: string }> {
  try {
    await pastikanBoleh("urus_pengurusan");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  try {
    await padamDokumen(id);
    revalidatePath("/admin/pengurusan");
    revalidatePath("/admin");
    return { ok: true, mesej: "Edisi itu dipadam." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

function ralat(e: unknown): string {
  return (
    "Sistem gagal. Tunjukkan mesej ini kepada admin: " +
    (e instanceof Error ? `${e.name}: ${e.message}` : String(e))
  );
}
