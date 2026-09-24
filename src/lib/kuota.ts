"use server";

import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";

/**
 * Bacaan kuota sistem.
 *
 * KENAPA INI PERLU DILIHAT
 * Pada peringkat percuma, kuota penuh bukan "sistem jadi perlahan" — ia
 * "sistem berhenti". Pangkalan data 500 MB penuh bermakna borang ibu bapa
 * tidak tersimpan. Storan 1 GB penuh bermakna muat naik gagal. Tiada satu
 * pun menghantar amaran sendiri, dan yang pertama tahu ialah orang yang
 * kerjanya hilang.
 *
 * Fungsi SQL `kuota_sistem()` ada dalam `supabase/pemantau-kuota.sql`, dan
 * kerja harian `semak_kuota()` dalam fail yang sama menghantar notifikasi
 * kepada pentadbir pada 70%. Halaman ini untuk melihat bila-bila masa.
 */

export interface JadualSaiz {
  jadual: string;
  bait: number;
  /** `n_live_tup` ialah ANGGARAN penganalisis, bukan kiraan tepat. */
  anggaran_baris: number;
}

export interface Kuota {
  pada: string;
  // `peratus` boleh null: SQL menggunakan nullif(had, 0) supaya had yang
  // hilang memulangkan null dan bukan mematikan halaman dengan ralat
  // bahagi-dengan-sifar.
  pangkalan_data: { bait: number; had: number; peratus: number | null };
  storan: { bait: number; had: number; fail: number; peratus: number | null };
  jadual: JadualSaiz[];
}

/** Pemantau belum dipasang — bukan ralat, tetapi mesti kelihatan. */
export type HasilKuota =
  | { ok: true; kuota: Kuota }
  | { ok: false; mesej: string; pasang: boolean };

export async function bacaKuota(): Promise<HasilKuota> {
  await pastikanBoleh("lihat_diagnostik");
  const db = klienTulis();
  try {
    const hasil = (await db.minta("rpc/kuota_sistem", {
      method: "POST",
      body: "{}",
    })) as Kuota;
    return { ok: true, kuota: hasil };
  } catch (e) {
    const teks = e instanceof Error ? e.message : String(e);
    // PGRST202 = fungsi tidak dijumpai. Itu bermakna SQL belum dijalankan,
    // bukan sistem rosak — jadi beritahu apa yang perlu dibuat, jangan
    // paparkan "ralat" yang tidak boleh ditindak.
    if (teks.includes("PGRST202") || teks.includes("Could not find the function")) {
      return {
        ok: false,
        pasang: true,
        mesej:
          "Pemantau kuota belum dipasang. Jalankan supabase/pemantau-kuota.sql " +
          "dalam Supabase → SQL Editor, kemudian muat semula halaman ini.",
      };
    }
    // Peraturan #4: jangan telan kegagalan.
    return { ok: false, pasang: false, mesej: teks };
  }
}
