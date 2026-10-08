/**
 * KONTRAK TANDATANGAN PADAT — apa yang menghalang 50,000 borang daripada
 * memenuhkan pangkalan data.
 *
 * Tandatangan disimpan DALAM baris borang. PNG kanvas pelayar ialah 10–40 KB;
 * pelayan memadatkannya ke ±2 KB (`src/lib/padat-tandatangan.ts`). Ujian ini
 * mengunci tiga perkara: saiznya dijamin, gambarnya masih tandatangan yang
 * sama, dan SETIAP laluan tulis benar-benar memanggilnya. Tiada pangkalan
 * data diperlukan.
 */
import { readFileSync } from "node:fs";
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { padatkanTandatangan, HAD_TANDATANGAN_PADAT } from "../src/lib/padat-tandatangan.ts";

const akar = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baca = (laluan: string) => readFileSync(resolve(akar, laluan), "utf8");
const gagal: string[] = [];
let bil = 0;
const perlu = (nama: string, ada: boolean) => { bil++; if (!ada) gagal.push(nama); };

/* ---------- pengekod PNG ujian: RGBA/RGB 8-bit, penapis baris bergilir ---------- */
function ketul(jenis: string, isi: Buffer) {
  const badan = Buffer.concat([Buffer.from(jenis, "latin1"), isi]);
  const k = Buffer.alloc(8 + badan.length);
  k.writeUInt32BE(isi.length, 0); badan.copy(k, 4); k.writeUInt32BE(crc32(badan) >>> 0, 4 + badan.length);
  return k;
}
function png(lebar: number, tinggi: number, saluran: 3 | 4, piksel: Uint8Array, penapisTetap?: number): string {
  const bb = lebar * saluran;
  const mentah = Buffer.alloc((bb + 1) * tinggi);
  for (let y = 0; y < tinggi; y++) {
    const p = penapisTetap ?? y % 5; // 0 None · 1 Sub · 2 Up · 3 Average · 4 Paeth
    mentah[y * (bb + 1)] = p;
    for (let x = 0; x < bb; x++) {
      const v = piksel[y * bb + x];
      const kiri = x >= saluran ? piksel[y * bb + x - saluran] : 0;
      const atas = y > 0 ? piksel[(y - 1) * bb + x] : 0;
      const penjuru = y > 0 && x >= saluran ? piksel[(y - 1) * bb + x - saluran] : 0;
      let ramal = 0;
      if (p === 1) ramal = kiri; else if (p === 2) ramal = atas; else if (p === 3) ramal = (kiri + atas) >> 1;
      else if (p === 4) { const q = kiri + atas - penjuru, a = Math.abs(q - kiri), b = Math.abs(q - atas), c = Math.abs(q - penjuru); ramal = a <= b && a <= c ? kiri : b <= c ? atas : penjuru; }
      mentah[y * (bb + 1) + 1 + x] = (v - ramal) & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lebar, 0); ihdr.writeUInt32BE(tinggi, 4); ihdr[8] = 8; ihdr[9] = saluran === 4 ? 6 : 2;
  return "data:image/png;base64," + Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ketul("IHDR", ihdr), ketul("IDAT", deflateSync(mentah)), ketul("IEND", Buffer.alloc(0)),
  ]).toString("base64");
}

/** Tandatangan sintetik: lengkung tebal dengan tepi licin, seperti kanvas 500×160. */
function liputanContoh(lebar: number, tinggi: number, ulang: number): Uint8Array {
  const a = new Uint8Array(lebar * tinggi);
  for (let k = 0; k < ulang; k++) {
    for (let i = 0; i <= 4000; i++) {
      const t = i / 4000;
      const cx = lebar * (0.1 + 0.8 * t) + 16 * Math.sin(t * 40 + k);
      const cy = tinggi * (0.5 + 0.3 * Math.sin(t * 30 + k * 2) * Math.cos(t * 9));
      for (let y = Math.max(0, Math.floor(cy - 3)); y <= Math.min(tinggi - 1, Math.ceil(cy + 3)); y++) {
        for (let x = Math.max(0, Math.floor(cx - 3)); x <= Math.min(lebar - 1, Math.ceil(cx + 3)); x++) {
          const v = Math.max(0, Math.min(255, Math.round((1.9 - Math.hypot(x - cx, y - cy)) * 255)));
          if (v > a[y * lebar + x]) a[y * lebar + x] = v;
        }
      }
    }
  }
  return a;
}
function rgba(lebar: number, tinggi: number, liputan: Uint8Array) {
  const p = new Uint8Array(lebar * tinggi * 4);
  for (let i = 0; i < liputan.length; i++) { p[i * 4] = 10; p[i * 4 + 1] = 30; p[i * 4 + 2] = 60; p[i * 4 + 3] = liputan[i]; }
  return p;
}
function atasPutih(lebar: number, tinggi: number, liputan: Uint8Array) {
  const p = new Uint8Array(lebar * tinggi * 3);
  for (let i = 0; i < liputan.length; i++) { const a = liputan[i] / 255; [10, 30, 60].forEach((c, j) => { p[i * 3 + j] = Math.round(c * a + 255 * (1 - a)); }); }
  return p;
}
/** Baca semula PNG padat: dimensi, kedalaman, dan pecahan piksel berdakwat. */
function semak(dataUrl: string) {
  const b = Buffer.from(dataUrl.slice(22), "base64");
  const lebar = b.readUInt32BE(16), tinggi = b.readUInt32BE(20), dalam = b[24], warna = b[25];
  let i = 8, idat = Buffer.alloc(0);
  while (i < b.length) { const n = b.readUInt32BE(i), j = b.toString("latin1", i + 4, i + 8); if (j === "IDAT") idat = Buffer.concat([idat, b.subarray(i + 8, i + 8 + n)]); i += 12 + n; }
  const baris = inflateSync(idat), bb = Math.ceil((lebar * dalam) / 8);
  let dakwat = 0;
  for (let y = 0; y < tinggi; y++) for (let x = 0; x < lebar; x++) {
    if ((baris[y * (bb + 1) + 1 + ((x * dalam) >> 3)] >> (8 - dalam - ((x * dalam) & 7))) & ((1 << dalam) - 1)) dakwat++;
  }
  return { lebar, tinggi, dalam, warna, pecahan: dakwat / (lebar * tinggi) };
}

/* ---------------------------------------------------------------------- */
/* 1. Saiz dijamin, gambar terpelihara                                    */
/* ---------------------------------------------------------------------- */
const L = 500, T = 160;
const biasa = liputanContoh(L, T, 1);
const asal = png(L, T, 4, rgba(L, T, biasa));
const padat = padatkanTandatangan(asal);
const s = semak(padat);
perlu("Hasil ialah data URL PNG", /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(padat));
perlu("Hasil dalam had keras", padat.length <= HAD_TANDATANGAN_PADAT);
perlu(`Tandatangan biasa ≤ 3,000 aksara (dapat ${padat.length})`, padat.length <= 3_000);
perlu("PNG berpalet ≤ 2-bit", s.warna === 3 && s.dalam <= 2);
perlu("Dimensi dalam 360 × 120", s.lebar <= 360 && s.tinggi <= 120 && s.lebar > 200);
perlu(`Dakwat terpelihara (pecahan ${s.pecahan.toFixed(3)})`, s.pecahan > 0.02 && s.pecahan < 0.35);
perlu("Idempoten — memadatkan dua kali memberi hasil yang sama", padatkanTandatangan(padat) === padat);

// Setiap penapis baris PNG dinyahkod dengan betul: hasil mesti sama seperti tanpa penapis.
for (const p of [0, 1, 2, 3, 4]) {
  perlu(`Penapis PNG ${p} dinyahkod sama`, padatkanTandatangan(png(L, T, 4, rgba(L, T, biasa), p)) === padatkanTandatangan(png(L, T, 4, rgba(L, T, biasa), 0)));
}

// Tandatangan LAMA: latar putih legap, tiada saluran alfa.
const lama = semak(padatkanTandatangan(png(L, T, 3, atasPutih(L, T, biasa))));
perlu("Latar putih legap dibuang (bukan kotak penuh dakwat)", lama.pecahan > 0.02 && lama.pecahan < 0.35);

// Coretan paling padat tetap dipaksa masuk had.
const tebal = padatkanTandatangan(png(600, 200, 4, rgba(600, 200, liputanContoh(600, 200, 40))));
perlu("Coretan sangat padat tetap dalam had", tebal.length <= HAD_TANDATANGAN_PADAT);

/* ---------------------------------------------------------------------- */
/* 2. Input buruk ditolak, bukan disimpan                                 */
/* ---------------------------------------------------------------------- */
const ditolak = (v: string) => { try { padatkanTandatangan(v); return false; } catch { return true; } };
perlu("Kanvas kosong ditolak", ditolak(png(L, T, 4, new Uint8Array(L * T * 4))));
perlu("Bukan PNG ditolak", ditolak("data:image/png;base64,AAAA"));
perlu("JPEG ditolak", ditolak("data:image/jpeg;base64,AAAA"));
perlu("PNG terpotong ditolak", ditolak(asal.slice(0, asal.length >> 1)));
{
  // Kepala mendakwa 60,000 × 60,000 piksel: mesti ditolak SEBELUM memori diperuntukkan.
  const b = Buffer.from(asal.slice(22), "base64");
  b.writeUInt32BE(60_000, 16); b.writeUInt32BE(60_000, 20);
  perlu("Dimensi gergasi ditolak", ditolak("data:image/png;base64," + b.toString("base64")));
}

/* ---------------------------------------------------------------------- */
/* 3. Setiap laluan tulis memadatkan dahulu                               */
/* ---------------------------------------------------------------------- */
const aktiviti = baca("src/lib/borang-aktiviti.ts");
perlu("Borang aktiviti memadatkan tandatangan", aktiviti.includes("padatkanTandatangan(data.tandatangan)") && /rekod: AkuanAktiviti = \{[^}]*\btandatangan \}/.test(aktiviti));
const awam = baca("src/lib/surat-awam.ts");
perlu("Kebenaran gambar awam memadatkan tandatangan", awam.includes("padatkanTandatangan(") && awam.includes("tandatangan_url: tandatangan,") && !awam.includes("tandatangan_url: input.tandatangan_url"));
const surat = baca("src/lib/surat.ts");
perlu("Kebenaran gambar kakitangan memadatkan tandatangan", surat.includes("padatkanTandatangan(") && surat.includes("tandatangan_url: tandatangan,") && !surat.includes("tandatangan_url: input.tandatangan_url,"));
perlu("Muat naik tandatangan memadatkan", baca("src/lib/tandatangan.ts").includes("padatkanTandatangan("));

if (gagal.length) { console.error(`✗ ${gagal.length} daripada ${bil} semakan GAGAL:`); for (const g of gagal) console.error("  ·", g); process.exit(1); }
console.log(`✓ ${bil} semakan tandatangan padat lulus · tandatangan biasa ${asal.length} → ${padat.length} aksara (${(asal.length / padat.length).toFixed(1)}×)`);
