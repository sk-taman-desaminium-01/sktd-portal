/**
 * Kontrak kod ↔ SQL untuk modul yang bermigrasi selepas kod utama dibina.
 * Ia tidak memerlukan pangkalan data atau data murid, jadi pantas dijalankan
 * sebelum commit. Tambah satu semakan di sini setiap kali modul baharu
 * menggunakan kolum, kekangan unik atau RPC baharu.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const akar = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baca = (laluan: string) => readFileSync(resolve(akar, laluan), "utf8");
const disiplin = baca("src/lib/disiplin.ts");
const rmt = baca("src/lib/rmt.ts");
const tugasan = baca("src/lib/tugasan.ts");
const sql = baca("supabase/pembaikan-disiplin.sql");
const gagal: string[] = [];
const perlu = (nama: string, ada: boolean) => { if (!ada) gagal.push(nama); };

perlu("Disiplin menggunakan murid_id", /murid_id/.test(disiplin));
perlu("SQL menyediakan murid_id Disiplin", /pbd_disiplin[\s\S]*add column if not exists murid_id/i.test(sql));
perlu("RMT menggunakan konflik sesi dan murid", /on_conflict=tahun_sesi,murid_id/.test(rmt));
perlu("SQL menyediakan kekangan unik RMT", /add constraint pbd_rmt_murid_tahun_sesi_murid_id_key[\s\S]*unique \(tahun_sesi, murid_id\)/i.test(sql));
perlu("Tugasan menggunakan RPC", /rpc\/tetap_tugasan_sekolah/.test(tugasan));
perlu("SQL menyediakan RPC tugasan", /create or replace function public\.tetap_tugasan_sekolah/i.test(sql));

if (gagal.length) {
  console.error(`Kontrak modul gagal:\n${gagal.map((x) => `- ${x}`).join("\n")}`);
  process.exit(1);
}
console.log("Kontrak modul: 6 semakan lulus.");
