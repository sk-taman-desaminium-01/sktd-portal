import "server-only";

/**
 * Mencetuskan binaan semula laman AWAM (sktd.edu.my).
 *
 * KENAPA INI WUJUD — soalan pengguna 15 Sep 2026:
 * "kalau kita update di admin, ia beri kesan pada cloudflare tak? saya takut
 *  kalau post nanti tak sampai ke laman utama."
 *
 * Jawapannya: TIDAK, tidak dengan sendirinya. Laman awam ialah HTML statik
 * yang dijana masa binaan. Admin menulis ke Supabase, tetapi laman yang sudah
 * dibina tidak tahu apa-apa sehingga ia dibina semula. Fungsi inilah yang
 * memberitahunya.
 *
 *   Admin tekan Terbit → tulis Supabase → panggil hook → Cloudflare bina
 *   semula (~1-2 minit) → pos hidup di sktd.edu.my
 *
 * KENAPA STATIK, BUKAN AMBIL DATA SETIAP LAWATAN:
 * 2,000 ibu bapa melawat = 0 bacaan Supabase. Kalau laman awam menyoal DB
 * setiap lawatan, setiap pelawat memakan kuota — dan pengguna menetapkan
 * "jumlah pelawat dan data tidak boleh merosakkan asas kita". Statik
 * melindungi kuota itu.
 *
 * `server-only`: import ini GAGAL pada masa binaan jika fail ini tersilap
 * ditarik ke dalam bundle klien. Itu menghalang URL hook daripada bocor ke
 * pelayar — ia rahsia; sesiapa yang memilikinya boleh mencetuskan binaan.
 */
export type HasilBina =
  | { ok: true }
  | { ok: false; sebab: string };

export async function binaSemulaLamanAwam(): Promise<HasilBina> {
  const hook = process.env.CLOUDFLARE_DEPLOY_HOOK;

  if (!hook) {
    // Peraturan keras #4: jangan telan. Kegagalan mesti kelihatan, kerana
    // akibatnya senyap — pos nampak "berjaya" tetapi tidak pernah naik.
    return {
      ok: false,
      sebab:
        "CLOUDFLARE_DEPLOY_HOOK tidak ditetapkan. Pos disimpan, tetapi laman " +
        "awam TIDAK akan dikemas kini sehingga binaan seterusnya.",
    };
  }

  try {
    const res = await fetch(hook, { method: "POST" });
    if (!res.ok) {
      return {
        ok: false,
        sebab: `Cloudflare menolak permintaan binaan (${res.status}). Pos disimpan; laman awam belum dikemas kini.`,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      sebab: `Gagal menghubungi Cloudflare: ${e instanceof Error ? e.message : "ralat tidak diketahui"}. Pos disimpan; laman awam belum dikemas kini.`,
    };
  }
}
