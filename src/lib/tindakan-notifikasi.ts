"use server";

import { revalidatePath } from "next/cache";
import { pengguna } from "./akses";
import { untukSaya, bilangBelumBaca, tandaDibaca, padamNotifikasi, kosongkan } from "./notifikasi";
import { simpanLanggananPush, buangLanggananPush, hantarPush } from "./push";
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
  if (!langganan.endpoint || !langganan.p256dh || !langganan.auth) {
    return { ok: false, mesej: "Pelayar tidak memberi langganan yang lengkap. Cuba sekali lagi." };
  }
  try {
    await simpanLanggananPush(saya.emel, langganan);
    const uji = await hantarPush([saya.emel], {
      tajuk: "Notifikasi Portal SKTD aktif",
      teks: "Peranti ini berjaya menerima pemberitahuan sistem.",
      pautan: "/notifikasi",
    });
    if (!uji.dikonfigur) {
      return { ok: false, mesej: "Peranti disimpan tetapi kunci penghantaran pelayan belum lengkap." };
    }
    if (uji.berjaya === 0) {
      return { ok: false, mesej: "Peranti disimpan tetapi pemberitahuan ujian gagal dihantar. Cuba hidupkan semula." };
    }
    return {
      ok: true,
      mesej: "Aktif — pemberitahuan ujian sudah dihantar ke peranti anda.",
    };
  } catch (e) {
    if (belumPasang(e)) {
      return { ok: false, mesej: "Notifikasi belum dipasang. Admin perlu menjalankan SQLnya dahulu." };
    }
    return { ok: false, mesej: "Peranti ini gagal didaftarkan." };
  }
}

/**
 * Ikat semula langganan peranti ini kepada akaun yang SEDANG log masuk,
 * tanpa menghantar ujian.
 *
 * Dipanggil setiap kali halaman Notifikasi dibuka pada peranti yang sudah
 * melanggan. Tanpanya, dua keadaan menyebabkan notifikasi "tak naik"
 * walaupun skrin berkata aktif:
 *  · dua akaun berkongsi satu pelayar — langganan kekal milik akaun pertama;
 *  · baris langganan dibuang pelayan (410) tetapi pelayar masih memegangnya.
 */
export async function segerakPush(
  langganan: { endpoint: string; p256dh: string; auth: string },
): Promise<{ ok: boolean; mesej: string }> {
  const saya = await pengguna();
  if (!saya?.emel) return { ok: false, mesej: "Tiada kebenaran." };
  if (!langganan.endpoint || !langganan.p256dh || !langganan.auth) {
    return { ok: false, mesej: "Langganan peranti tidak lengkap." };
  }
  try {
    await simpanLanggananPush(saya.emel, langganan);
    return { ok: true, mesej: "" };
  } catch (e) {
    if (belumPasang(e)) return { ok: false, mesej: "Notifikasi belum dipasang." };
    return { ok: false, mesej: "Peranti gagal disegerakkan." };
  }
}

export async function ujiPushTindakan(): Promise<{ ok: boolean; mesej: string }> {
  const saya = await pengguna();
  if (!saya?.emel) return { ok: false, mesej: "Tiada kebenaran." };
  try {
    const hasil = await hantarPush([saya.emel], {
      tajuk: "Ujian Notifikasi Portal SKTD",
      teks: "Jika mesej ini muncul, pemberitahuan telefon dan komputer anda berfungsi.",
      pautan: "/notifikasi",
    });
    if (!hasil.dikonfigur) return { ok: false, mesej: "Kunci penghantaran pelayan belum lengkap." };
    if (hasil.berjaya === 0) return { ok: false, mesej: "Tiada peranti aktif berjaya menerima ujian. Hidupkan semula pemberitahuan." };
    return { ok: true, mesej: `Ujian dihantar ke ${hasil.berjaya} peranti.` };
  } catch {
    return { ok: false, mesej: "Pemberitahuan ujian gagal dihantar." };
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
