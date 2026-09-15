"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { binaSemulaLamanAwam } from "./bina-semula";
import { muatNaik } from "./storan";
import { SEKOLAH } from "@/data/sekolah";
import type { Pentadbir } from "@/data/sekolah";

/**
 * Barisan Pentadbir — nama, jawatan, urutan dan gambar yang dipapar di
 * halaman "Tentang Sekolah" laman awam.
 *
 * DI MANA IA DISIMPAN: `web_halaman` dengan slug `barisan-pentadbir`,
 * kandungannya JSON. Mockup menetapkan jadual ini (`webAdminPentadbir`:
 * "Simpan ... ke web_halaman"), jadi tiada jadual baharu dicipta.
 *
 * SANDARAN: kalau baris itu belum wujud, senarai dalam `src/data/sekolah.ts`
 * digunakan. Maknanya laman tidak pernah kosong walaupun sebelum admin
 * menyentuh skrin ini — dan suntingan pertama menyalin senarai itu ke DB.
 */

const SLUG = "barisan-pentadbir";

export type HasilPentadbir = { ok: boolean; mesej: string };

export async function senaraiPentadbir(): Promise<Pentadbir[]> {
  await pastikanBoleh("terbit_kandungan");
  const db = klienTulis();
  const baris = (await db.minta(
    `web_halaman?slug=eq.${SLUG}&select=kandungan`,
  )) as { kandungan: string | null }[];

  const isi = baris[0]?.kandungan;
  if (!isi) return [...SEKOLAH.pentadbir].sort((a, b) => a.urutan - b.urutan);

  try {
    const data = JSON.parse(isi) as Pentadbir[];
    if (!Array.isArray(data)) throw new Error("bukan senarai");
    return data.sort((a, b) => a.urutan - b.urutan);
  } catch {
    // JSON rosak: JANGAN pulangkan senarai kosong secara senyap (peraturan #4).
    // Senarai kod adalah jawapan yang betul dan boleh dilihat; admin akan
    // nampak bahawa suntingannya hilang dan boleh menyimpan semula.
    throw new Error(
      "Data barisan pentadbir dalam pangkalan data rosak dan tidak boleh dibaca. " +
        "Hubungi admin sistem sebelum menyimpan — menyimpan sekarang akan menimpanya.",
    );
  }
}

/** Simpan keseluruhan senarai. Urutan diambil dari susunan dalam tatasusunan. */
export async function simpanPentadbir(senarai: Pentadbir[]): Promise<HasilPentadbir> {
  await pastikanBoleh("terbit_kandungan");

  if (!Array.isArray(senarai) || senarai.length === 0) {
    // Peraturan keras #2: kosong ≠ padam. Senarai kosong hampir pasti
    // kesilapan UI, bukan hasrat sebenar seseorang.
    return { ok: false, mesej: "Senarai kosong tidak disimpan. Sekurang-kurangnya seorang pentadbir diperlukan." };
  }
  for (const o of senarai) {
    if (!o.nama?.trim()) return { ok: false, mesej: "Setiap pentadbir mesti ada nama." };
    if (!o.jawatan?.trim()) return { ok: false, mesej: `Jawatan kosong untuk ${o.nama}.` };
  }

  const bersih: Pentadbir[] = senarai.map((o, i) => ({
    urutan: i + 1,
    jawatan: o.jawatan.trim(),
    nama: o.nama.trim(),
    gambar: o.gambar?.trim() || null,
  }));

  const db = klienTulis();
  try {
    await db.minta("web_halaman", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        slug: SLUG,
        tajuk: "Barisan Pentadbir",
        kandungan: JSON.stringify(bersih),
        dikemaskini: new Date().toISOString(),
      }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." };
  }

  revalidatePath("/admin/pentadbir");

  // Laman awam ialah eksport STATIK — tanpa binaan semula, suntingan ini
  // tersimpan dalam DB tetapi tidak pernah muncul di sktd.edu.my.
  const bina = await binaSemulaLamanAwam();
  return {
    ok: true,
    mesej: bina.ok
      ? "Disimpan. Laman awam sedang dibina semula."
      : `Disimpan, TETAPI binaan semula laman awam gagal: ${bina.sebab}`,
  };
}

/** Muat naik gambar seorang pentadbir; pulangkan URL untuk disimpan. */
export async function naikGambarPentadbir(data: FormData): Promise<{ ok: boolean; mesej: string; url?: string }> {
  await pastikanBoleh("terbit_kandungan");
  const fail = data.get("fail");
  if (!(fail instanceof File) || fail.size === 0) {
    return { ok: false, mesej: "Tiada fail dipilih." };
  }
  try {
    const hasil = await muatNaik(fail, "pentadbir");
    return { ok: true, mesej: "Gambar dimuat naik.", url: hasil.url };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Muat naik gagal." };
  }
}
