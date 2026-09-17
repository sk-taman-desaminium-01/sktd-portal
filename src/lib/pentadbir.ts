"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { binaSemulaLamanAwam } from "./bina-semula";
import { muatNaik } from "./storan";
import { SEKOLAH } from "@/data/sekolah";
import { pengguna } from "./akses";
import { wariskanPentadbir } from "./pindaan";
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

/**
 * Simpan keseluruhan senarai. Urutan diambil dari susunan dalam tatasusunan.
 *
 * PERTUKARAN PENTADBIR MENYUSUL SENDIRI KE BUKU PENGURUSAN. Menukar nama
 * Guru Besar di sini dan melupakan jawatankuasa menghasilkan portal yang
 * bercakap dua perkara berbeza tentang siapa Guru Besar — dan tiada siapa
 * akan perasan, kerana kedua-dua skrin kelihatan betul apabila dilihat
 * berasingan. Lihat `wariskanPentadbir()`.
 */
export async function simpanPentadbir(senarai: Pentadbir[]): Promise<HasilPentadbir> {
  const saya = await pastikanBoleh("terbit_kandungan");

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

  // Dibaca SEBELUM menulis — selepas menulis, nama lama sudah hilang dan
  // tiada cara mengetahui siapa yang digantikan.
  let sebelum: Pentadbir[] = [];
  try {
    sebelum = await senaraiPentadbir();
  } catch {
    // Data lama rosak atau belum wujud: simpanan diteruskan, pewarisan
    // dilangkau. Menghalang simpanan kerana data LAMA rosak menghukum
    // pengguna untuk masalah yang mereka sedang cuba betulkan.
  }

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

  // Pertukaran menyusul ke Buku Pengurusan sendiri. Kegagalan di sini TIDAK
  // boleh membatalkan simpanan yang sudah berjaya — nama pentadbir yang
  // betul di laman awam lebih penting daripada jawatankuasa yang menyusul
  // lewat, dan simpanan itu sudah ditulis.
  let waris = "";
  if (sebelum.length > 0) {
    try {
      const w = await wariskanPentadbir(sebelum, bersih, saya.emel ?? null);
      if (w.pewaris.length > 0) {
        const senaraiNama = w.pewaris
          .map((x) => `${x.jawatan}: ${x.lama} → ${x.baharu}`)
          .join("; ");
        waris =
          w.diubah + w.digugur > 0
            ? ` Buku Pengurusan dikemas kini sendiri — ${w.diubah} baris jawatankuasa ditukar (${senaraiNama}).`
            : ` Pertukaran direkodkan (${senaraiNama}); tiada baris Buku Pengurusan menamakan mereka.`;
      }
    } catch (e) {
      waris =
        " Nama disimpan, TETAPI jawatankuasa Buku Pengurusan tidak dapat dikemas kini: " +
        (e instanceof Error ? e.message : String(e)) +
        " Buka Buku Pengurusan → Pembetulan kekal untuk membetulkannya.";
    }
  }

  // Laman awam ialah eksport STATIK — tanpa binaan semula, suntingan ini
  // tersimpan dalam DB tetapi tidak pernah muncul di sktd.edu.my.
  const bina = await binaSemulaLamanAwam();
  return {
    ok: true,
    mesej:
      (bina.ok
        ? "Disimpan. Laman awam sedang dibina semula."
        : `Disimpan, TETAPI binaan semula laman awam gagal: ${bina.sebab}`) + waris,
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
