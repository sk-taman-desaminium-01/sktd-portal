"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { binaSemulaLamanAwam } from "./bina-semula";
import { JADUAL_KOSONG, type Jadual } from "@/data/jadual-jenis";

/**
 * Jadual Waktu — baca dan simpan.
 *
 * Disimpan sebagai JSON dalam `web_halaman` (slug `jadual-waktu`), corak
 * yang sama dengan Barisan Pentadbir. Lihat nota dalam
 * `src/data/jadual-jenis.ts` untuk sebab pilihan itu.
 */

const SLUG = "jadual-waktu";

export type HasilJadual = { ok: boolean; mesej: string };

export async function ambilJadual(): Promise<Jadual> {
  await pastikanBoleh("terbit_kandungan");
  const db = klienTulis();
  const baris = (await db.minta(
    `web_halaman?slug=eq.${SLUG}&select=kandungan`,
  )) as { kandungan: string | null }[];

  const isi = baris[0]?.kandungan;
  if (!isi) return JADUAL_KOSONG;

  try {
    const data = JSON.parse(isi) as Jadual;
    // Jadual lama mungkin tiada medan yang ditambah kemudian; isi dari lalai
    // supaya skrin tidak pecah pada data yang sah tetapi tidak lengkap.
    return {
      waktu: data.waktu ?? JADUAL_KOSONG.waktu,
      kelas: data.kelas ?? {},
      dikemaskini: data.dikemaskini,
    };
  } catch {
    // Peraturan #4: jangan pulangkan kosong secara senyap — jadual kosong
    // kelihatan sama seperti "belum diisi", dan admin akan menyimpan di
    // atasnya lalu memusnahkan kerja sebenar.
    throw new Error(
      "Data jadual waktu dalam pangkalan data rosak dan tidak boleh dibaca. " +
        "JANGAN simpan apa-apa di skrin ini sehingga ia diperiksa — menyimpan " +
        "sekarang akan menimpanya.",
    );
  }
}

export async function simpanJadual(jadual: Jadual): Promise<HasilJadual> {
  await pastikanBoleh("terbit_kandungan");

  if (!jadual?.waktu?.pagi?.length || !jadual?.waktu?.petang?.length) {
    return { ok: false, mesej: "Setiap sesi mesti ada sekurang-kurangnya satu waktu." };
  }

  const bersih: Jadual = {
    waktu: jadual.waktu,
    kelas: jadual.kelas ?? {},
    dikemaskini: new Date().toISOString(),
  };

  try {
    const db = klienTulis();
    await db.minta("web_halaman", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        slug: SLUG,
        tajuk: "Jadual Waktu",
        kandungan: JSON.stringify(bersih),
        dikemaskini: bersih.dikemaskini,
      }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan jadual." };
  }

  revalidatePath("/admin/jadual");

  // Laman awam ialah eksport statik: tanpa binaan semula, jadual tersimpan
  // dalam DB tetapi ibu bapa tidak pernah melihatnya.
  const bina = await binaSemulaLamanAwam();
  return {
    ok: true,
    mesej: bina.ok
      ? "Jadual disimpan. Laman untuk ibu bapa sedang dibina semula."
      : `Jadual disimpan, TETAPI binaan semula laman awam gagal: ${bina.sebab}`,
  };
}
