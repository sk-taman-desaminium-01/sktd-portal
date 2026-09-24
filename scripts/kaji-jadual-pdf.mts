/**
 * PERIKSA SATU PDF JADUAL SEBELUM MEMUAT NAIKNYA.
 *
 * Pentadbir sekolah menyerahkan satu PDF yang mengandungi semua kelas. Alat
 * ini membaca fail itu dan melaporkan, muka demi muka, kelas apa yang dikesan
 * dan berapa slot yang dapat dibaca — tanpa menyentuh pangkalan data dan tanpa
 * menyimpan apa-apa.
 *
 * Gunanya: bila jadual baharu tiba dan bentuknya berbeza daripada yang pernah
 * kita lihat, ini memberitahu bentuk SEBENARNYA dalam beberapa saat, dan bukan
 * selepas pentadbir mencuba dan melihat mesej yang mengelirukan.
 *
 *   npm run kaji:jadual-pdf -- /laluan/ke/jadual.pdf
 *
 * Bacaan:
 *   · "kelas=[1 AMANAH]"           → muka ini sedia dibaca sistem
 *   · "kelas=[]"                   → muka hadapan atau nota; dilangkau
 *   · "kelas=[A, B, C]"            → jadual induk beberapa kelas satu muka.
 *                                    Sistem TIDAK akan menekanya; hantar fail
 *                                    ini kepada kami supaya bentuk itu disokong.
 */
import { readFileSync } from "node:fs";
import { semuaKelasDalam } from "../src/data/kesan-kelas.ts";
import { binaDrafDariKedudukan } from "../src/lib/jadual-huraian.ts";
import { SET_LALAI } from "../src/data/jadual-jenis.ts";

const laluan = process.argv[2];
if (!laluan) {
  console.error("Guna: npm run kaji:jadual-pdf -- /laluan/ke/jadual.pdf");
  process.exit(2);
}

interface Kedudukan { str: string; x: number; y: number; w: number }

const { getDocumentProxy } = await import("unpdf");
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(laluan)));

/** Sama seperti src/lib/baca-dokumen.ts: satu senarai item bagi setiap muka. */
const muka: Kedudukan[][] = [];
for (let i = 1; i <= pdf.numPages; i++) {
  const isi = await (await pdf.getPage(i)).getTextContent();
  const item: Kedudukan[] = [];
  for (const it of isi.items) {
    if (!("str" in it) || typeof it.str !== "string" || it.str.trim() === "") continue;
    item.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width });
  }
  muka.push(item);
}

// Set waktu hanya untuk menganggar berapa slot boleh dibaca. Set sebenar
// kelas itu datang dari pangkalan data semasa muat naik, jadi nombor di sini
// ialah PANDUAN, bukan janji.
const waktu = SET_LALAI.find((s) => s.id === "pagi-r4")!.senarai;

console.log(`\n${laluan}\nmuka surat: ${pdf.numPages}\n`);
let satu = 0, kosong = 0, banyak = 0;
for (let i = 0; i < muka.length; i++) {
  const kelas = semuaKelasDalam(muka[i].map((t) => t.str).join(" "));
  const draf = binaDrafDariKedudukan([muka[i]], waktu);
  const slot = `${draf?.dikenal ?? 0}/${draf?.jumlah ?? 0}`;
  if (kelas.length === 1) satu++;
  else if (kelas.length === 0) kosong++;
  else banyak++;
  const tanda = kelas.length === 1 ? "✓" : kelas.length === 0 ? "–" : "✗";
  console.log(`  ${tanda} muka ${String(i + 1).padStart(3)}: kelas=[${kelas.join(", ")}] slot=${slot}`);
}

console.log(
  `\n${satu} muka = satu kelas (boleh dibaca)` +
    `${kosong ? `, ${kosong} tanpa kelas (dilangkau)` : ""}` +
    `${banyak ? `, ${banyak} dengan BEBERAPA kelas (perlu disokong)` : ""}`,
);
// Muka tanpa kelas adalah normal (muka hadapan). Beberapa kelas satu muka
// bukan — itu bentuk yang belum disokong, jadi ia keluar bukan-sifar.
process.exit(banyak > 0 ? 1 : 0);
