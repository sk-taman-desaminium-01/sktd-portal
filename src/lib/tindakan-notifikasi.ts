"use server";

import { revalidatePath } from "next/cache";
import { pengguna } from "./akses";
import { untukSaya, bilangBelumBaca, tandaDibaca, padamNotifikasi, kosongkan } from "./notifikasi";
import { simpanLanggananPush, buangLanggananPush } from "./push";
import type { Notifikasi } from "@/data/notifikasi";

export interface HasilNotifikasi {
  ok: boolean;
  mesej: string;
  senarai?: Notifikasi[];
  belumBaca?: number;
}

/** Jadual belum wujud bermakna SQL belum dijalankan — bukan pepijat. */
function belumPasang(e: unknown): boolean {
  const t = e instanceof Error ? e.message : String(e);
  return /notifikasi|push_langganan|42P01|does not exist|Not Found|404/i.test(t);
}

export async function notifikasiSaya(): Promise<HasilNotifikasi> {
  const saya = await pengguna();
  if (!saya?.emel) return { ok: false, mesej: "Tiada kebenaran." };
  try {
    const senarai = await untukSaya(saya.emel);
    return {
      ok: true, senarai, mesej: "",
      belumBaca: senarai.filter((n) => !n.dibaca).length,
    };
  } catch (e) {
    if (belumPasang(e)) {
      return {
        ok: false,
        mesej: "Notifikasi belum dipasang. Admin perlu menjalankan supabase/notifikasi.sql.",
        senarai: [],
        belumBaca: 0,
      };
    }
    return { ok: false, mesej: "Notifikasi gagal dibaca." };
  }
}

export async function kiraBelumBaca(): Promise<number> {
  const saya = await pengguna();
  if (!saya?.emel) return 0;
  try {
    return await bilangBelumBaca(saya.emel);
  } catch {
    // Loceng yang gagal membilang memapar sifar, bukan menghempas skrin.
    return 0;
  }
}

export async function tandaDibacaTindakan(id?: string): Promise<HasilNotifikasi> {
  const saya = await pengguna();
  if (!saya?.emel) return { ok: false, mesej: "Tiada kebenaran." };
  try {
    await tandaDibaca(saya.emel, id);
    revalidatePath("/notifikasi");
    return { ok: true, mesej: "" };
  } catch {
    return { ok: false, mesej: "Gagal menanda dibaca." };
  }
}

export async function padamNotifikasiTindakan(id: string): Promise<HasilNotifikasi> {
  const saya = await pengguna();
  if (!saya?.emel) return { ok: false, mesej: "Tiada kebenaran." };
  try {
    await padamNotifikasi(saya.emel, id);
    revalidatePath("/notifikasi");
    return { ok: true, mesej: "Dipadam." };
  } catch {
    return { ok: false, mesej: "Gagal memadam." };
  }
}

export async function kosongkanTindakan(): Promise<HasilNotifikasi> {
  const saya = await pengguna();
  if (!saya?.emel) return { ok: false, mesej: "Tiada kebenaran." };
  try {
    await kosongkan(saya.emel);
    revalidatePath("/notifikasi");
    return { ok: true, mesej: "Notifikasi yang sudah dibaca dibuang." };
  } catch {
    return { ok: false, mesej: "Gagal mengosongkan." };
  }
}

/* ------------------------------------------------------------- push telefon */

export async function daftarPush(
  langganan: { endpoint: string; p256dh: string; auth: string },
): Promise<{ ok: boolean; mesej: string }> {
  const saya = await pengguna();
  if (!saya?.emel) return { ok: false, mesej: "Tiada kebenaran." };
  try {
    await simpanLanggananPush(saya.emel, langganan);
    return {
      ok: true,
      mesej: "Peranti ini akan menerima pemberitahuan walaupun portal ditutup.",
    };
  } catch (e) {
    if (belumPasang(e)) {
      return { ok: false, mesej: "Notifikasi belum dipasang. Admin perlu menjalankan SQLnya dahulu." };
    }
    return { ok: false, mesej: "Peranti ini gagal didaftarkan." };
  }
}

export async function buangPush(endpoint: string): Promise<{ ok: boolean; mesej: string }> {
  const saya = await pengguna();
  if (!saya?.emel) return { ok: false, mesej: "Tiada kebenaran." };
  try {
    await buangLanggananPush(saya.emel, endpoint);
    return { ok: true, mesej: "Peranti ini tidak lagi menerima pemberitahuan." };
  } catch {
    return { ok: false, mesej: "Gagal membuang peranti." };
  }
}

/** Kunci awam VAPID, untuk pelayar melanggan. Kosong bila belum dikonfigur. */
export async function kunciPush(): Promise<string> {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}
