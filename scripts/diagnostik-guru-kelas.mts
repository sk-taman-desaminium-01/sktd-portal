// Diagnostik BACA-SAHAJA — replika logik tagGuruKelas(false) tanpa
// pastikanBoleh()/pengguna() (yang perlukan konteks permintaan Next.js).
// Jalankan: node --env-file=.env.local scripts/diagnostik-guru-kelas.mts
import { klienTulis } from "../src/lib/supabase-pelayan.ts";
import { senaraiDokumen, seksyenDokumen, barisSeksyen } from "../src/lib/pengurusan.ts";
import { pasanganGuruKelas } from "../src/data/guru-kelas-buku.ts";
import { samaOrang, palingHampir } from "../src/data/padan-nama.ts";

const SESI = 2026;
const db = klienTulis();

const dokumen = await senaraiDokumen();
if (dokumen.length === 0) { console.log("Tiada Buku Pengurusan dimuat naik."); process.exit(0); }
console.log("Dokumen terkini:", dokumen[0].tahun, "versi", dokumen[0].versi);

const seksyen = await seksyenDokumen(dokumen[0].id);
const gk = seksyen.filter((s) => s.kod === "gurukelas");
console.log("Seksyen kod=gurukelas dijumpai:", gk.length, gk.map((s) => `${s.tajuk} (${s.status})`));

if (gk.length === 0) { console.log("TIADA seksyen gurukelas — itu sebab tagGuruKelas gagal total."); process.exit(0); }

const semuaBaris: string[][] = [];
for (const sk of gk) for (const b of await barisSeksyen(sk.id)) semuaBaris.push(b.sel ?? []);
console.log("Jumlah baris mentah:", semuaBaris.length);

const pasangan = pasanganGuruKelas(semuaBaris);
console.log("Pasangan (kelas,guru) dikesan daripada buku:", pasangan.length);

const [sudah, orang] = await Promise.all([
  db.minta(`pbd_guru_kelas?select=tahun,kelas&tahun_sesi=eq.${SESI}&peranan=eq.guru_kelas`) as Promise<{ tahun: number; kelas: string }[]>,
  db.minta("pbd_guru?select=id,nama&dibenarkan=eq.true") as Promise<{ id: string; nama: string | null }[]>,
]);
const adaGuru = new Set(sudah.map((s) => (s.tahun === 0 ? s.kelas : `${s.tahun} ${s.kelas}`)));
console.log("Akaun guru dibenarkan log masuk:", orang.length);

const kabur: string[] = [];
const tiada: string[] = [];
const boleh: string[] = [];
const sudahAda: string[] = [];

for (const p of pasangan) {
  if (adaGuru.has(p.kelas)) { sudahAda.push(p.kelas); continue; }
  const padan = orang.filter((o) => o.nama && samaOrang(o.nama, p.guru));
  if (padan.length === 1) boleh.push(`${p.kelas} ← "${p.guru}" → ${padan[0].nama}`);
  else if (padan.length > 1) kabur.push(`${p.kelas}: "${p.guru}" padan ${padan.length} orang (${padan.map(x=>x.nama).join(" | ")})`);
  else {
    const hampir = palingHampir(p.guru, orang.map((o) => o.nama ?? "").filter(Boolean));
    tiada.push(`${p.kelas}: "${p.guru}"${hampir ? ` — paling hampir dlm senarai akses: "${hampir}"` : " — TIADA yang hampir"}`);
  }
}

console.log(`\nSUDAH ADA guru kelas (${sudahAda.length}):`, sudahAda.join(", "));
console.log(`\nBOLEH DITAG serta-merta (${boleh.length}):`);
boleh.forEach((x) => console.log("  " + x));
console.log(`\nKABUR — dua+ padanan (${kabur.length}):`);
kabur.forEach((x) => console.log("  " + x));
console.log(`\nTIADA PADANAN dalam senarai akses (${tiada.length}):`);
tiada.forEach((x) => console.log("  " + x));

// Kelas yang LANGSUNG tiada dalam buku (tiada baris pun)
const kelasDalamBuku = new Set(pasangan.map((p) => p.kelas));
console.log("\nKelas dalam buku tapi:", pasangan.length, "· (bandingkan dgn 66 kelas rasmi guna diagnostik lain)");
