import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { klienTulis } from "./supabase-pelayan";
import { boleh, type Keupayaan, type Peranan, type PerananBerkesan } from "./peranan";

/**
 * Siapa pengguna semasa, dan apa kuasanya.
 *
 * Urutan semakan sengaja: ENV DAHULU, baru pangkalan data.
 * Kalau DB tidak dapat dicapai, admin mutlak MASIH boleh masuk dan membaikinya.
 * Kalau susunannya terbalik, kegagalan DB mengunci semua orang keluar —
 * termasuk orang yang sepatutnya membetulkannya.
 */

export interface Pengguna {
  emel: string;
  nama: string | null;
  peranan: PerananBerkesan | null; // null = tiada dalam senarai akses
  mutlak: boolean;
}

function senaraiMutlak(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function pengguna(): Promise<Pengguna | null> {
  const u = await currentUser();
  const emel = u?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!emel) return null;

  const nama = u?.fullName ?? u?.firstName ?? null;

  if (senaraiMutlak().includes(emel)) {
    return { emel, nama, peranan: "admin_mutlak", mutlak: true };
  }

  // Bukan mutlak → semak senarai akses dalam DB.
  try {
    const db = klienTulis();
    const baris = (await db.minta(
      `pbd_guru?select=peranan,dibenarkan,nama&email=eq.${encodeURIComponent(emel)}`,
    )) as { peranan: Peranan; dibenarkan: boolean; nama: string }[];

    const r = baris[0];
    // Tiada dalam senarai, atau ada tetapi BELUM dibenarkan → tiada peranan.
    if (!r || !r.dibenarkan) return { emel, nama, peranan: null, mutlak: false };
    return { emel, nama: r.nama ?? nama, peranan: r.peranan, mutlak: false };
  } catch {
    // DB gagal: JANGAN beri kuasa secara senyap. Orang biasa dianggap tiada
    // peranan (gagal tertutup); admin mutlak sudah pulang di atas.
    return { emel, nama, peranan: null, mutlak: false };
  }
}

export async function bolehBuat(k: Keupayaan): Promise<boolean> {
  const p = await pengguna();
  return boleh(p?.peranan ?? null, k);
}

/** Pagar untuk laluan/tindakan. Melontar jika tiada keupayaan. */
export async function pastikanBoleh(k: Keupayaan): Promise<Pengguna> {
  const p = await pengguna();
  if (!p || !boleh(p.peranan, k)) {
    throw new Error("Tidak dibenarkan.");
  }
  return p;
}

/** Kekal untuk kod sedia ada. */
export async function adakahAdmin(): Promise<boolean> {
  return bolehBuat("terbit_kandungan");
}
