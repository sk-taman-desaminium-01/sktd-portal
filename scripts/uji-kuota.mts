/**
 * KONTRAK KUOTA — apa yang menghalang sistem daripada terkunci.
 *
 * Pada peringkat percuma, kuota penuh bukan "perlahan", ia "berhenti":
 * pangkalan data penuh → borang ibu bapa tidak tersimpan; storan penuh →
 * muat naik gagal; egress habis → Supabase BERHENTI menghidangkan fail dan
 * setiap poster jadi kosong.
 *
 * Tiga kebocoran sebenar yang ditemui pada 24 Sep 2026, kesemuanya oleh
 * skrip dan bukan oleh mata:
 *   · pustaka media memuatkan sehingga 200 gambar SAIZ PENUH untuk petak
 *     64×64 — ~50 MB egress setiap lawatan, iaitu 1% kuota sebulan
 *   · og:image terus ke Supabase, dan perayap WhatsApp menariknya setiap
 *     kali pautan dikongsi
 *   · enam gambar pentadbir pada halaman /tentang, setiap lawatan
 *
 * Ujian ini menghalang ketiga-tiganya daripada kembali. Ia tidak memerlukan
 * pangkalan data.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const akar = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baca = (laluan: string) => readFileSync(resolve(akar, laluan), "utf8");
const gagal: string[] = [];
const perlu = (nama: string, ada: boolean) => { if (!ada) gagal.push(nama); };

/* ---------------------------------------------------------------------- */
/* 1. Tiada gambar Supabase dihidangkan tanpa pautGambar()                */
/* ---------------------------------------------------------------------- */

function failTsx(dir: string): string[] {
  const keluar: string[] = [];
  for (const nama of readdirSync(dir)) {
    const penuh = join(dir, nama);
    if (statSync(penuh).isDirectory()) keluar.push(...failTsx(penuh));
    else if (nama.endsWith(".tsx")) keluar.push(penuh);
  }
  return keluar;
}

/**
 * Pengecualian, setiap satu dengan sebabnya. Senarai ini pendek dengan
 * SENGAJA — tambah di sini hanya bila gambar itu memang TIDAK datang dari
 * Supabase Storage.
 *
 * `tandatangan_url` ialah `data:image/png;base64,…` yang disimpan dalam
 * pangkalan data dan divalidasi oleh corak di src/lib/surat.ts — ia tidak
 * pernah menyentuh Storage, jadi tiada egress.
 */
const DIKECUALIKAN = [/tandatangan_url/, /\baset\(/, /["'`]data:/, /^\s*\/\//];

const mencurigakan: string[] = [];
for (const f of failTsx(join(akar, "src"))) {
  baca(relative(akar, f)).split("\n").forEach((baris, i) => {
    if (!/\bsrc=\{/.test(baris)) return;
    if (!/\b\w*(url|gambar|imej|foto|poster)\w*\b/i.test(baris)) return;
    if (baris.includes("pautGambar")) return;
    if (DIKECUALIKAN.some((c) => c.test(baris))) return;
    mencurigakan.push(`${relative(akar, f)}:${i + 1} → ${baris.trim().slice(0, 80)}`);
  });
}
if (mencurigakan.length) {
  gagal.push(
    "Gambar dihidangkan tanpa pautGambar() — setiap paparan memakan egress Supabase:\n" +
      mencurigakan.map((x) => `    ${x}`).join("\n"),
  );
}

/* ---------------------------------------------------------------------- */
/* 2. Laluan tepi dan Cache-Control masih di tempatnya                    */
/* ---------------------------------------------------------------------- */

const paut = baca("src/data/pautan-gambar.ts");
perlu("pautGambar menulis semula ke laluan tepi /img/", paut.includes("/img/"));
perlu("pautGambar hanya menyentuh baldi web-media", paut.includes("web-media"));

const storan = baca("src/lib/storan.ts");
perlu("Muat naik menetapkan Cache-Control jangka panjang",
  /Cache-Control[\s\S]{0,40}max-age=31536000/.test(storan) && storan.includes("immutable"));
perlu("Muat naik tidak menimpa fail (nama unik = selamat dicache)",
  storan.includes('"x-upsert": "false"'));

/* ---------------------------------------------------------------------- */
/* 3. Pemantau kuota: amaran pada 70%, bukan 100%                         */
/* ---------------------------------------------------------------------- */

const pantau = baca("../supabase/pemantau-kuota.sql");
perlu("SQL menyediakan kuota_sistem()", /create or replace function public\.kuota_sistem/i.test(pantau));
perlu("SQL menyediakan semak_kuota()", /create or replace function public\.semak_kuota/i.test(pantau));
perlu("Amaran dicetuskan pada 70%, bukan 100%", />= 70/.test(pantau));
perlu("Amaran sampai kepada pentadbir melalui notifikasi",
  pantau.includes("insert into public.notifikasi") && pantau.includes("pbd_guru"));
perlu("Amaran tidak berulang setiap hari", pantau.includes("interval '7 days'"));
perlu("Pemantau dijadualkan dengan pg_cron", pantau.includes("sktd-semak-kuota"));
perlu("kuota_sistem tidak terbuka kepada anon",
  /revoke all on function public\.kuota_sistem\(\) from public, anon, authenticated/i.test(pantau));

const jaga = baca("../supabase/jaga-saiz.sql");
perlu("Notifikasi lama dibersihkan automatik", /create or replace function public\.kemas_notifikasi/i.test(jaga));
perlu("Rekod had borang dibersihkan automatik", /create or replace function public\.kemas_had_borang/i.test(jaga));

/* ---------------------------------------------------------------------- */
/* 4. Fail sementara tidak menjadi sampah kekal                           */
/* ---------------------------------------------------------------------- */

const sementara = baca("src/lib/fail-sementara.ts");
perlu("Fail sementara disapu selepas tempoh tertentu", sementara.includes("sapuFailYatim"));

if (gagal.length) {
  console.error(`Kontrak kuota gagal:\n${gagal.map((x) => `- ${x}`).join("\n")}`);
  process.exit(1);
}
console.log("Kontrak kuota: 14 semakan lulus.");
