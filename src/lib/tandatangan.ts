"use server";

import { pengguna } from "./akses";
import { muatNaik } from "./storan";

/**
 * Muat naik tandatangan (lukisan atau gambar yang sudah diproses di
 * pelayar — latar belakang dibuang, dipotong ketat).
 *
 * Sesiapa yang log masuk boleh memuat naik tandatangannya sendiri — ini
 * bukan kandungan laman, jadi tiada keupayaan khas diperlukan.
 */
export async function naikTandaTangan(data: FormData): Promise<{ ok: boolean; mesej: string; url?: string }> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };

  const fail = data.get("fail");
  if (!(fail instanceof File) || fail.size === 0) {
    return { ok: false, mesej: "Tiada tandatangan." };
  }
  try {
    const hasil = await muatNaik(fail, "tandatangan");
    return { ok: true, mesej: "Tandatangan disimpan.", url: hasil.url };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Muat naik gagal." };
  }
}
