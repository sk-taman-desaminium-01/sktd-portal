/**
 * Gambar Supabase → laluan tepi Cloudflare.
 *
 * KENAPA INI WUJUD
 * Supabase Storage menghidangkan fail dengan `cache-control: no-cache`.
 * Setiap paparan menarik semula fail PENUH daripada kuota egress 5 GB/bulan,
 * dan bila kuota itu habis Storage BERHENTI menghidangkan — poster jadi
 * kosong, bukan perlahan.
 *
 * Yang paling membakar bukan laman awam, tetapi PUSTAKA MEDIA di
 * `/admin/media`: ia memuatkan sehingga 200 gambar bersaiz penuh untuk
 * dipaparkan sebagai petak 64×64. Diukur: satu poster 247 KB, jadi satu
 * lawatan ke satu halaman itu boleh menarik ~50 MB — 1% kuota sebulan,
 * setiap kali seorang pentadbir membukanya.
 *
 * `/img/` ialah laluan pada Worker Cloudflare (lihat sktd-web/worker/index.ts)
 * yang menghidangkan gambar yang SAMA dengan cache 30 hari. Lebar jalur
 * Cloudflare percuma dan tidak berkuota.
 *
 * MUTLAK, bukan relatif: portal juga dihidangkan di bawah `/portal`
 * (basePath), jadi "/img/x" relatif akan menjadi permintaan yang betul —
 * tetapi cetakan, pratonton dan e-mel membawa URL ini ke luar konteks itu.
 * URL mutlak betul di mana-mana.
 *
 * Kembar fungsi ini di laman awam: `sktd-web/src/lib/pos.ts` → `pautGambar`.
 * Kalau satu diubah, ubah kedua-duanya.
 */

const ASAL_TEPI = "https://sktd.edu.my";
const BALDI = "web-media";

export function pautGambar(url: string | null | undefined): string {
  if (!url) return "";
  const m = new RegExp(`/storage/v1/object/public/${BALDI}/(.+)$`).exec(url);
  return m ? `${ASAL_TEPI}/img/${m[1]}` : url;
}
