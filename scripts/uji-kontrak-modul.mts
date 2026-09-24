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
const aktivitiKod = baca("src/lib/borang-aktiviti.ts");
const aktivitiSql = baca("supabase/migrations/20260919_borang_aktiviti.sql");
const kawalan = baca("src/lib/kawalan-kelas.ts");
const panelRmt = baca("src/app/rmt/PanelRmt.tsx");
const surat = baca("src/lib/surat.ts");
const cetakSurat = baca("src/components/CetakSurat.tsx");
const bahagian = baca("src/data/bahagian.ts");
const guruKelas = baca("src/app/guru-kelas/page.tsx");
const notifikasi = baca("src/app/notifikasi/PanelNotifikasi.tsx");
const gagal: string[] = [];
const perlu = (nama: string, ada: boolean) => { if (!ada) gagal.push(nama); };

perlu("Disiplin menggunakan murid_id", /murid_id/.test(disiplin));
perlu("SQL menyediakan murid_id Disiplin", /pbd_disiplin[\s\S]*add column if not exists murid_id/i.test(sql));
perlu("RMT menggunakan konflik sesi dan murid", /on_conflict=tahun_sesi,murid_id/.test(rmt));
perlu("SQL menyediakan kekangan unik RMT", /add constraint pbd_rmt_murid_tahun_sesi_murid_id_key[\s\S]*unique \(tahun_sesi, murid_id\)/i.test(sql));
perlu("Tugasan menggunakan RPC", /rpc\/tetap_tugasan_sekolah/.test(tugasan));
perlu("SQL menyediakan RPC tugasan", /create or replace function public\.tetap_tugasan_sekolah/i.test(sql));
perlu("Aktiviti menggunakan jadual aktiviti", /borang_aktiviti/.test(aktivitiKod));
perlu("SQL menyediakan jadual aktiviti", /create table if not exists public\.borang_aktiviti/i.test(aktivitiSql));
perlu("Aktiviti menggunakan senarai peserta", /borang_peserta/.test(aktivitiKod));
perlu("SQL menyediakan peserta dengan konflik aktiviti-murid", /primary key \(aktiviti_id, murid_id\)/i.test(aktivitiSql));
perlu("Aktiviti menggunakan jawapan", /borang_jawapan/.test(aktivitiKod));
perlu("SQL menghalang jawapan murid berganda", /unique \(aktiviti_id, murid_id\)/i.test(aktivitiSql));
perlu("Aktiviti menggunakan RPC had cubaan", /rpc\/borang_ambil_giliran/.test(aktivitiKod));
perlu("SQL menyediakan RPC had cubaan", /create or replace function public\.borang_ambil_giliran/i.test(aktivitiSql));
perlu("Disiplin boleh disunting", /export async function suntingDisiplin/.test(disiplin));
perlu("Disiplin boleh dipadam", /export async function padamDisiplin/.test(disiplin));
perlu("Kawalan kelas boleh disunting", /export async function suntingKawalanKelas/.test(kawalan));
perlu("Kawalan kelas boleh dipadam", /export async function padamKawalanKelas/.test(kawalan));
perlu("RMT dipapar sebagai kad kelas buka tutup", panelRmt.includes("<details") && panelRmt.includes("No. KP:"));
perlu("Kerani boleh menolak surat dengan komen", /export async function tolakSuratRasmi/.test(surat) && surat.includes("komenPejabat"));
perlu("Pemohon atau pejabat boleh menyunting surat", /export async function suntingSuratRasmi/.test(surat));
perlu("Tandatangan surat rasmi sentiasa kosong", surat.includes("tandatangan_url: null") && !cetakSurat.includes("surat.tandatangan_url"));
perlu("Guru biasa hanya membaca disiplin yang dilaporkan sendiri", disiplin.includes('`&guru_id=eq.${saya.id}`'));
perlu("Pelapor hanya boleh mengubah rekod disiplin miliknya", disiplin.includes("bolehUbahRekod(id)"));
perlu("Paparan disiplin Guru Kelas disahkan semula di pelayan", disiplin.includes("senaraiDisiplinKelas") && disiplin.includes("kelasBolehSunting()"));
perlu("Borang awam ibu bapa tidak disalahanggap sebagai hantaran guru", surat.includes('sumber !== "awam"'));
perlu("Kad Guru Kelas memaparkan rekod kelas secara baca sahaja", guruKelas.includes("senaraiKebenaranGambarKelas") && guruKelas.includes("senaraiDisiplinKelas") && guruKelas.includes("Paparan baca sahaja"));
perlu("Kad ujian push sudah dibuang", !notifikasi.includes("Hantar notifikasi ujian") && !notifikasi.includes("ujiPushTindakan"));
for (const id of ["guru-kelas-portal", "kawalan-kelas", "rmt", "disiplin"]) {
  perlu(`Kad ${id} berstatus sedia`, new RegExp(`id: "${id}"[\\s\\S]{0,350}status: "sedia"`).test(bahagian));
}


const carta = baca("src/lib/tindakan-carta.ts");
perlu("Sunting nama carta mencipta pindaan ganti_nama",
  carta.includes('jenis: "ganti_nama"') && carta.includes("namaSelDalamBaris"));
perlu("Pembetulan seluruh edisi TIDAK menahan permintaan sunting",
  /after\(jalankan\)/.test(carta) && carta.includes("kenakanPindaanEdisi"));
perlu("Carta mengenakan pindaan semasa baca",
  carta.includes("kenakanPindaan(b.sel, pindaanAktif)"));
const pindaanLib = baca("src/lib/pindaan.ts");
perlu("RPC pinda_baris_kekal yang tiada memberi arahan pemasangan",
  pindaanLib.includes("pindaan-baris-transaksi.sql") && pindaanLib.includes("PGRST202"));
const pengurusan = baca("src/lib/pengurusan.ts");
perlu("Pembetulan edisi guna tulisan berkelompok",
  pengurusan.includes("export async function suntingBarisBanyak"));

if (gagal.length) {
  console.error(`Kontrak modul gagal:\n${gagal.map((x) => `- ${x}`).join("\n")}`);
  process.exit(1);
}
console.log("Kontrak modul: 37 semakan lulus.");
