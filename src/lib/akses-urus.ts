"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { PERANAN, type Peranan } from "./peranan";

export interface BarisAkses {
  id: string;
  nama: string;
  email: string | null;
  peranan: Peranan;
  dibenarkan: boolean;
}

export async function senaraiAkses(): Promise<BarisAkses[]> {
  await pastikanBoleh("urus_akses");
  const db = klienTulis();
  return (await db.minta(
    "pbd_guru?select=id,nama,email,peranan,dibenarkan&order=dibenarkan.desc,peranan.asc,nama.asc",
  )) as BarisAkses[];
}

export type Hasil = { ok: boolean; mesej: string };

/** Emel admin mutlak tidak boleh diurus di sini — ia milik env. */
function adalahMutlak(emel: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(emel.trim().toLowerCase());
}

export async function tambahAkses(data: FormData): Promise<Hasil> {
  await pastikanBoleh("urus_akses");

  const nama = String(data.get("nama") ?? "").trim();
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const peranan = String(data.get("peranan") ?? "guru") as Peranan;

  if (!nama) return { ok: false, mesej: "Nama diperlukan." };
  if (!email) return { ok: false, mesej: "Emel diperlukan." };
  if (!PERANAN.includes(peranan)) return { ok: false, mesej: "Peranan tidak sah." };

  // Sekolah guna emel rasmi; membenarkan emel luar membuka pintu belakang.
  if (!email.endsWith("@moe-dl.edu.my") && !email.endsWith("@moe.edu.my")) {
    return { ok: false, mesej: "Hanya emel rasmi @moe-dl.edu.my atau @moe.edu.my dibenarkan." };
  }
  if (adalahMutlak(email)) {
    return { ok: false, mesej: "Emel ini admin mutlak — diurus melalui env, bukan di sini." };
  }

  const db = klienTulis();
  try {
    await db.minta("pbd_guru", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ nama, email, peranan, dibenarkan: true }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menambah." };
  }
  revalidatePath("/admin/akses");
  return { ok: true, mesej: `${nama} ditambah sebagai ${peranan}.` };
}

export async function tukarPeranan(id: string, peranan: Peranan): Promise<Hasil> {
  await pastikanBoleh("urus_akses");
  if (!PERANAN.includes(peranan)) return { ok: false, mesej: "Peranan tidak sah." };
  const db = klienTulis();
  await db.minta(`pbd_guru?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ peranan }),
  });
  revalidatePath("/admin/akses");
  return { ok: true, mesej: "Peranan dikemas kini." };
}

/**
 * Tarik balik akses. SENGAJA tidak memadam baris.
 *
 * Peraturan keras #2: medan kosong ≠ padam. Memadam orang juga membuang
 * jejak siapa pernah ada akses — dan itu maklumat yang audit perlukan.
 * Jadi kita tetapkan `dibenarkan = false`; orangnya kekal dalam rekod.
 */
export async function tarikAkses(id: string, dibenarkan: boolean): Promise<Hasil> {
  await pastikanBoleh("urus_akses");
  const db = klienTulis();
  await db.minta(`pbd_guru?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ dibenarkan }),
  });
  revalidatePath("/admin/akses");
  return { ok: true, mesej: dibenarkan ? "Akses dipulihkan." : "Akses ditarik. Rekod dikekalkan untuk audit." };
}
