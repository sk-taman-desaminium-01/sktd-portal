"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh, pengguna } from "./akses";
import { klienTulis } from "./supabase-pelayan";

/**
 * Tugasan warga sekolah yang BUKAN "guru kelas" — guru RMT, guru disiplin,
 * pengurus pasukan (permintaan pengguna D/E/F, 18 Sep 2026).
 *
 * SATU JADUAL DIKONGSI dengan `guru-kelas.ts`: `pbd_guru_kelas`. Jadual itu
 * sudah menyimpan (guru_id, tahun_sesi, tahun, kelas, subjek, peranan) — dan
 * bentuk itu memadai untuk tugasan yang TIDAK terikat kelas juga, dengan
 * `tahun = 0` sebagai sentinel "bukan kelas perdana" (corak yang sama
 * seperti PPKI dalam `jadual-jenis.ts`) dan `kelas` menyimpan nama skop
 * (contoh: nama pasukan bagi pengurus pasukan).
 *
 * KENAPA BUKAN JADUAL BAHARU: setiap jadual baharu ialah storan yang
 * membesar selama-lamanya dan satu lagi tempat kebenaran boleh bercanggah
 * dengan `pbd_guru_kelas`. Tugasan ini kecil (puluhan baris, bukan ribuan)
 * — menambah jadual untuk kes ini membazir kuota, bukan menjimatkannya.
 */

const SESI = 2026;

export type JenisTugasan = "guru_rmt" | "guru_disiplin" | "pengurus_pasukan";

/** Nama skop lalai bagi tugasan yang tidak terikat kelas/pasukan. */
const SKOP_SEKOLAH = "SEKOLAH";

export interface BarisTugasan {
  guru_id: string;
  nama: string;
  emel: string | null;
  /** Nama pasukan (pengurus_pasukan) atau "SEKOLAH" (guru_rmt/guru_disiplin). */
  skop: string;
}

export type HasilTugasan = { ok: boolean; mesej: string };

export async function senaraiTugasan(jenis: JenisTugasan): Promise<BarisTugasan[]> {
  await pastikanBoleh("urus_guru_kelas");
  const db = klienTulis();
  const baris = (await db.minta(
    `pbd_guru_kelas?select=guru_id,kelas,pbd_guru(nama,email)` +
      `&tahun_sesi=eq.${SESI}&peranan=eq.${jenis}&tahun=eq.0&order=kelas.asc`,
  )) as { guru_id: string; kelas: string; pbd_guru: { nama: string; email: string | null } | null }[];

  return baris.map((b) => ({
    guru_id: b.guru_id,
    nama: b.pbd_guru?.nama ?? "(nama tiada)",
    emel: b.pbd_guru?.email ?? null,
    skop: b.kelas,
  }));
}

/** Adakah pengguna SEMASA memegang tugasan ini (mana-mana skop)? */
export async function sayaBertugas(jenis: JenisTugasan): Promise<boolean> {
  const saya = await pengguna();
  if (!saya?.id) return false;
  const db = klienTulis();
  const baris = (await db.minta(
    `pbd_guru_kelas?select=guru_id&tahun_sesi=eq.${SESI}` +
      `&peranan=eq.${jenis}&tahun=eq.0&guru_id=eq.${saya.id}&limit=1`,
  )) as { guru_id: string }[];
  return baris.length > 0;
}

export async function tetapTugasan(
  jenis: JenisTugasan, guruId: string, skop: string,
): Promise<HasilTugasan> {
  await pastikanBoleh("urus_guru_kelas");
  const namaSkop = skop.trim() || SKOP_SEKOLAH;

  try {
    const db = klienTulis();
    await db.minta(
      `pbd_guru_kelas?tahun_sesi=eq.${SESI}&peranan=eq.${jenis}` +
        `&tahun=eq.0&kelas=eq.${encodeURIComponent(namaSkop)}`,
      { method: "DELETE" },
    );
    await db.minta("pbd_guru_kelas", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        guru_id: guruId, tahun_sesi: SESI, tahun: 0, kelas: namaSkop,
        subjek: "", peranan: jenis,
      }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menetapkan tugasan." };
  }

  revalidatePath("/admin/guru-kelas");
  return { ok: true, mesej: "Tugasan dikemas kini." };
}

export async function buangTugasan(jenis: JenisTugasan, skop: string): Promise<HasilTugasan> {
  await pastikanBoleh("urus_guru_kelas");
  try {
    const db = klienTulis();
    await db.minta(
      `pbd_guru_kelas?tahun_sesi=eq.${SESI}&peranan=eq.${jenis}` +
        `&tahun=eq.0&kelas=eq.${encodeURIComponent(skop.trim() || SKOP_SEKOLAH)}`,
      { method: "DELETE" },
    );
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal membuang tugasan." };
  }
  revalidatePath("/admin/guru-kelas");
  return { ok: true, mesej: "Tugasan dibuang." };
}
