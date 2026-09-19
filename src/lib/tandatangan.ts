"use server";

import { pengguna } from "./akses";


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
    if (fail.type !== "image/png" || fail.size > 256 * 1024)
      return { ok: false, mesej: "Tandatangan mesti PNG tidak melebihi 256 KB." };
    const bait = Buffer.from(await fail.arrayBuffer());
    if (!bait.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
      return { ok: false, mesej: "Fail PNG tidak sah." };
    // Disimpan bersama rekod borang terlindung, bukan bucket media awam.
    return { ok: true, mesej: "Tandatangan sedia untuk disimpan bersama borang.", url: `data:image/png;base64,${bait.toString("base64")}` };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Muat naik gagal." };
  }
}
