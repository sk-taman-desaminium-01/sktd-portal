/**
 * PADATKAN TANDATANGAN — di PELAYAN, sebelum ia menyentuh pangkalan data.
 *
 * Kenapa (8 Okt 2026): tandatangan disimpan sebagai `data:image/png` DALAM
 * baris borang. PNG kanvas pelayar ialah RGBA 32-bit, 10–40 KB sebaris.
 * 50,000 borang × 25 KB = 1.25 GB, iaitu 2.5× kuota 500 MB pangkalan data
 * percuma — dan pangkalan data penuh MENGUNCI semua tulisan (peraturan #8),
 * bukan memperlahankannya.
 *
 * Tandatangan hanyalah SATU warna dakwat di atas latar lut sinar. Jadi ia
 * dikod semula sebagai PNG berpalet 2-bit (4 tahap legap), dipotong ketat
 * dan dihadkan kepada 360 × 120 px. Hasilnya ±2 KB (diukur: 6–20× lebih
 * kecil daripada PNG kanvas) — masih PNG biasa, jadi
 * setiap `<img>` dan cetakan sedia ada terus berfungsi tanpa diubah.
 *
 * Ia dibuat di pelayan, bukan di pelayar, supaya SATU tempat menjamin saiz:
 * apa pun yang dihantar pelayar (versi lama dalam cache, Safari lama, atau
 * permintaan buatan), yang tersimpan tidak pernah melebihi
 * `HAD_TANDATANGAN_PADAT`.
 *
 * Tiada pustaka imej: PNG dinyahkod dengan `node:zlib` sahaja.
 */
import { crc32, deflateSync, inflateSync } from "node:zlib";

/** Had keras panjang data URL yang disimpan (aksara). */
export const HAD_TANDATANGAN_PADAT = 5_000;
const LEBAR_MAKS = 360;
const TINGGI_MAKS = 120;
/** Had piksel input — menolak "bom nyahmampat" sebelum memori diperuntukkan. */
const PIKSEL_MAKS = 4_000_000;
const DAKWAT = [10, 30, 60];
const TANDA_PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const AWALAN = "data:image/png;base64,";
const RALAT = "Tandatangan tidak dapat diproses. Lukis atau muat naik semula.";

interface Imej { lebar: number; tinggi: number; /** 0 = kosong, 255 = dakwat penuh */ liputan: Uint8Array }

function bacaKetul(png: Buffer) {
  if (png.length < 33 || !png.subarray(0, 8).equals(TANDA_PNG)) throw new Error(RALAT);
  const ketul = new Map<string, Buffer[]>();
  let i = 8;
  while (i + 12 <= png.length) {
    const panjang = png.readUInt32BE(i);
    const jenis = png.toString("latin1", i + 4, i + 8);
    if (i + 12 + panjang > png.length) throw new Error(RALAT);
    const senarai = ketul.get(jenis) ?? [];
    senarai.push(png.subarray(i + 8, i + 8 + panjang));
    ketul.set(jenis, senarai);
    i += 12 + panjang;
    if (jenis === "IEND") break;
  }
  return ketul;
}

function kepala(ketul: Map<string, Buffer[]>) {
  const h = ketul.get("IHDR")?.[0];
  if (!h || h.length !== 13) throw new Error(RALAT);
  return { lebar: h.readUInt32BE(0), tinggi: h.readUInt32BE(4), dalam: h[8], warna: h[9], jalin: h[12] };
}

/** PNG → liputan dakwat setiap piksel. Menyokong apa yang dihasilkan kanvas pelayar dan alat biasa. */
function nyahkod(png: Buffer): Imej {
  const ketul = bacaKetul(png);
  const { lebar, tinggi, dalam, warna, jalin } = kepala(ketul);
  const saluran = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[warna];
  if (!saluran || jalin !== 0 || lebar < 1 || tinggi < 1 || lebar * tinggi > PIKSEL_MAKS) throw new Error(RALAT);
  if (warna === 3 ? ![1, 2, 4, 8].includes(dalam) : dalam !== 8) throw new Error(RALAT);

  const bitPiksel = saluran * dalam;
  const baitPiksel = Math.max(1, bitPiksel >> 3);
  const baitBaris = Math.ceil((lebar * bitPiksel) / 8);
  let mentah: Buffer;
  try {
    mentah = inflateSync(Buffer.concat(ketul.get("IDAT") ?? []), { maxOutputLength: (baitBaris + 1) * tinggi });
  } catch { throw new Error(RALAT); }
  if (mentah.length !== (baitBaris + 1) * tinggi) throw new Error(RALAT);

  // Buang penapis baris (PNG §9): setiap bait diramal daripada jiran kiri/atas.
  const data = Buffer.alloc(baitBaris * tinggi);
  for (let y = 0; y < tinggi; y++) {
    const penapis = mentah[y * (baitBaris + 1)];
    const masuk = y * (baitBaris + 1) + 1, keluar = y * baitBaris;
    for (let x = 0; x < baitBaris; x++) {
      const kiri = x >= baitPiksel ? data[keluar + x - baitPiksel] : 0;
      const atas = y > 0 ? data[keluar - baitBaris + x] : 0;
      const penjuru = y > 0 && x >= baitPiksel ? data[keluar - baitBaris + x - baitPiksel] : 0;
      let ramal = 0;
      if (penapis === 1) ramal = kiri;
      else if (penapis === 2) ramal = atas;
      else if (penapis === 3) ramal = (kiri + atas) >> 1;
      else if (penapis === 4) {
        const p = kiri + atas - penjuru;
        const a = Math.abs(p - kiri), b = Math.abs(p - atas), c = Math.abs(p - penjuru);
        ramal = a <= b && a <= c ? kiri : b <= c ? atas : penjuru;
      } else if (penapis !== 0) throw new Error(RALAT);
      data[keluar + x] = (mentah[masuk + x] + ramal) & 255;
    }
  }

  const palet = ketul.get("PLTE")?.[0];
  const lutPalet = ketul.get("tRNS")?.[0];
  if (warna === 3 && !palet) throw new Error(RALAT);
  const n = lebar * tinggi;
  const cerah = new Uint8Array(n), alfa = new Uint8Array(n);
  let adaLutSinar = false;
  for (let y = 0; y < tinggi; y++) {
    for (let x = 0; x < lebar; x++) {
      const i = y * lebar + x;
      let r: number, g: number, b: number, a = 255;
      if (warna === 3) {
        const bait = data[y * baitBaris + ((x * dalam) >> 3)];
        const indeks = (bait >> (8 - dalam - ((x * dalam) & 7))) & ((1 << dalam) - 1);
        r = palet![indeks * 3] ?? 0; g = palet![indeks * 3 + 1] ?? 0; b = palet![indeks * 3 + 2] ?? 0;
        a = lutPalet && indeks < lutPalet.length ? lutPalet[indeks] : 255;
      } else {
        const o = y * baitBaris + x * saluran;
        if (warna === 0 || warna === 4) { r = g = b = data[o]; if (warna === 4) a = data[o + 1]; }
        else { r = data[o]; g = data[o + 1]; b = data[o + 2]; if (warna === 6) a = data[o + 3]; }
      }
      cerah[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      alfa[i] = a;
      if (a < 255) adaLutSinar = true;
    }
  }

  // Latar lut sinar → alfa IALAH dakwat. Tandatangan lama berlatar putih
  // legap → kegelapan ialah dakwat, diregang supaya dakwat paling gelap = 255.
  const liputan = new Uint8Array(n);
  if (adaLutSinar) liputan.set(alfa);
  else {
    let gelap = 255;
    for (let i = 0; i < n; i++) if (cerah[i] < gelap) gelap = cerah[i];
    const julat = Math.max(1, 235 - gelap);
    for (let i = 0; i < n; i++) liputan[i] = Math.max(0, Math.min(255, Math.round(((235 - cerah[i]) * 255) / julat)));
  }
  return { lebar, tinggi, liputan };
}

/** Potong ketat pada dakwat, kemudian kecilkan (purata kotak) ke dalam had. */
function potongDanSkala(imej: Imej, lebarMaks: number, tinggiMaks: number): Imej {
  const { lebar, tinggi, liputan } = imej;
  let x0 = lebar, y0 = tinggi, x1 = -1, y1 = -1;
  for (let y = 0; y < tinggi; y++) for (let x = 0; x < lebar; x++) {
    if (liputan[y * lebar + x] > 96) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error("Tandatangan kosong. Lukis atau muat naik semula.");
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2);
  x1 = Math.min(lebar - 1, x1 + 2); y1 = Math.min(tinggi - 1, y1 + 2);
  const lp = x1 - x0 + 1, tp = y1 - y0 + 1;
  const skala = Math.min(1, lebarMaks / lp, tinggiMaks / tp);
  const lb = Math.max(1, Math.round(lp * skala)), tb = Math.max(1, Math.round(tp * skala));
  const keluar = new Uint8Array(lb * tb);
  for (let y = 0; y < tb; y++) {
    const ya = y0 + Math.floor((y * tp) / tb), yb = Math.max(ya + 1, y0 + Math.floor(((y + 1) * tp) / tb));
    for (let x = 0; x < lb; x++) {
      const xa = x0 + Math.floor((x * lp) / lb), xb = Math.max(xa + 1, x0 + Math.floor(((x + 1) * lp) / lb));
      let jumlah = 0;
      for (let v = ya; v < yb; v++) for (let u = xa; u < xb; u++) jumlah += liputan[v * lebar + u];
      keluar[y * lb + x] = Math.round(jumlah / ((yb - ya) * (xb - xa)));
    }
  }
  return { lebar: lb, tinggi: tb, liputan: keluar };
}

function ketulPng(jenis: string, isi: Buffer): Buffer {
  const badan = Buffer.concat([Buffer.from(jenis, "latin1"), isi]);
  const k = Buffer.alloc(8 + badan.length);
  k.writeUInt32BE(isi.length, 0);
  badan.copy(k, 4);
  k.writeUInt32BE(crc32(badan) >>> 0, 4 + badan.length);
  return k;
}

/** Liputan → PNG berpalet `bit`-bit: satu warna dakwat, tahap legap dalam tRNS. */
function kod(imej: Imej, bit: 1 | 2): string {
  const { lebar, tinggi, liputan } = imej;
  const tahap = (1 << bit) - 1;
  const baitBaris = Math.ceil((lebar * bit) / 8);
  const baris = Buffer.alloc((baitBaris + 1) * tinggi);
  for (let y = 0; y < tinggi; y++) {
    for (let x = 0; x < lebar; x++) {
      const indeks = Math.round((liputan[y * lebar + x] * tahap) / 255);
      baris[y * (baitBaris + 1) + 1 + ((x * bit) >> 3)] |= indeks << (8 - bit - ((x * bit) & 7));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lebar, 0);
  ihdr.writeUInt32BE(tinggi, 4);
  ihdr[8] = bit; ihdr[9] = 3;
  const palet = Buffer.alloc((tahap + 1) * 3), lut = Buffer.alloc(tahap + 1);
  for (let i = 0; i <= tahap; i++) { palet.set(DAKWAT, i * 3); lut[i] = Math.round((i * 255) / tahap); }
  const png = Buffer.concat([
    TANDA_PNG, ketulPng("IHDR", ihdr), ketulPng("PLTE", palet), ketulPng("tRNS", lut),
    ketulPng("IDAT", deflateSync(baris, { level: 9 })), ketulPng("IEND", Buffer.alloc(0)),
  ]);
  return AWALAN + png.toString("base64");
}

/** Sudah dalam bentuk padat? Maka jangan sentuh — memadatkan dua kali mesti memberi hasil yang SAMA. */
function sudahPadat(png: Buffer, panjang: number): boolean {
  try {
    const h = kepala(bacaKetul(png));
    return panjang <= HAD_TANDATANGAN_PADAT && h.warna === 3 && h.dalam <= 2 && h.lebar <= LEBAR_MAKS && h.tinggi <= TINGGI_MAKS;
  } catch { return false; }
}

/**
 * Data URL PNG tandatangan → data URL PNG padat (≤ `HAD_TANDATANGAN_PADAT`).
 * Melontar `Error` berbahasa pengguna jika gambar tidak boleh dibaca atau kosong.
 */
export function padatkanTandatangan(dataUrl: string): string {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith(AWALAN) || dataUrl.length > 400_000) throw new Error(RALAT);
  const png = Buffer.from(dataUrl.slice(AWALAN.length), "base64");
  if (sudahPadat(png, dataUrl.length)) return dataUrl;
  const asal = nyahkod(png);
  // Tangga jatuh: 2-bit dahulu (tepi licin); coretan yang sangat padat turun
  // ke 1-bit, kemudian mengecil — sehingga had dijamin dipatuhi.
  for (let skala = 1; skala > 0.2; skala *= 0.8) {
    const imej = potongDanSkala(asal, Math.round(LEBAR_MAKS * skala), Math.round(TINGGI_MAKS * skala));
    for (const bit of [2, 1] as const) {
      const hasil = kod(imej, bit);
      if (hasil.length <= HAD_TANDATANGAN_PADAT) return hasil;
    }
  }
  throw new Error(RALAT);
}
