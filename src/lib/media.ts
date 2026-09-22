"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { muatNaik, buangFail } from "./storan";
import { sahUuid } from "./sah";

/**
 * Pustaka media — gambar dan PDF yang admin muat naik untuk laman sekolah.
 *
 * Jadual `web_media` menyimpan REKOD; fail sebenar dalam Supabase Storage.
 * Medan `kebenaran` bukan hiasan: SS KPM Bil. 9/2024 menghendaki Surat Akuan
 * Ibu Bapa untuk gambar yang menunjukkan murid, dan sekolah perlu tahu
 * gambar mana yang ada kebenaran tanpa meneka.
 */

export interface Media {
  id: string;
  url: string;
  nama_fail: string | null;
  saiz: number | null;
  kebenaran: string | null;
  oleh: string | null;
  created_at: string;
}

export type HasilMedia = { ok: boolean; mesej: string; url?: string };

export async function senaraiMedia(): Promise<Media[]> {
  await pastikanBoleh("terbit_kandungan");
  const db = klienTulis();
  return (await db.minta(
    "web_media?select=id,url,nama_fail,saiz,kebenaran,oleh,created_at&order=created_at.desc&limit=200",
  )) as Media[];
}

export async function naikMedia(data: FormData): Promise<HasilMedia> {
  const saya = await pastikanBoleh("terbit_kandungan");

  const fail = data.get("fail");
  if (!(fail instanceof File) || fail.size === 0) {
    return { ok: false, mesej: "Tiada fail dipilih." };
  }
  const kebenaran = String(data.get("kebenaran") ?? "").trim() || null;

  try {
    const hasil = await muatNaik(fail, "media");
    const db = klienTulis();
    await db.minta("web_media", {
      method: "POST",
      body: JSON.stringify({
        url: hasil.url,
        nama_fail: hasil.nama,
        saiz: hasil.saiz,
        kebenaran,
        oleh: saya.emel,
      }),
    });
    revalidatePath("/admin/media");
    return { ok: true, mesej: `${hasil.nama} dimuat naik.`, url: hasil.url };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Muat naik gagal." };
  }
}

/**
 * Buang media.
 *
 * TIDAK seperti senarai akses (di mana kita hanya menandakan `dibenarkan =
 * false`), fail media memang dibuang betul-betul: menyimpan gambar yang
 * kebenarannya ditarik balik adalah masalah undang-undang, bukan masalah
 * audit. Rekod DB dibuang bersama supaya tiada URL mati dalam pustaka.
 */
export async function buangMedia(id: string, url: string): Promise<HasilMedia> {
  sahUuid(id);
  await pastikanBoleh("terbit_kandungan");
  try {
    // Kembalikan laluan dalam bucket daripada URL awam.
    const tanda = "/object/public/web-media/";
    const i = url.indexOf(tanda);
    if (i >= 0) await buangFail(url.slice(i + tanda.length));

    const db = klienTulis();
    await db.minta(`web_media?id=eq.${id}`, { method: "DELETE" });
    revalidatePath("/admin/media");
    return { ok: true, mesej: "Fail dibuang." };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal membuang." };
  }
}
