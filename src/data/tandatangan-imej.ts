"use client";

/**
 * PROSES GAMBAR TANDATANGAN — di pelayar, sebelum dihantar.
 *
 * Kenapa ditulis semula (22 Sep 2026): versi lama menganggap kertas PUTIH
 * TULEN (RGB > 235). Foto telefon di bawah lampu kelas memberi kertas
 * kelabu 170–220, jadi latar tidak dibuang, seluruh foto dikekalkan, PNG
 * menjadi 1–3 MB dan ditolak "terlalu besar" — ibu bapa tidak dapat memuat
 * naik tandatangan langsung.
 *
 * Kini:
 *  1. Kecilkan dahulu (sisi panjang ≤ 1400 px) — jimat memori telefon.
 *  2. Ambang SETEMPAT: kecerahan kertas dianggar bagi setiap blok kecil,
 *     jadi cahaya tidak sekata dan bayang-bayang tidak menjadi "dakwat".
 *  3. Dakwat dijadikan biru tua seragam dengan alfa mengikut kegelapan —
 *     tepi licin, latar lut sinar, PNG kecil.
 *  4. Potong ketat, kemudian skala ke maksimum 600 × 200 px.
 */

const WARNA_DAKWAT: [number, number, number] = [10, 30, 60];

function kecerahan(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Ambang Otsu pada histogram kecerahan 0–255. */
function ambangOtsu(hist: number[], jumlah: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, maks = 0, ambang = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = jumlah - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const antara = wB * wF * (mB - mF) * (mB - mF);
    if (antara > maks) { maks = antara; ambang = t; }
  }
  return ambang;
}

async function bukaImej(fail: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(fail); } catch { /* jatuh ke <img> — Safari lama */ }
  }
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(fail);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Gambar tidak boleh dibaca. Cuba ambil gambar JPG/PNG.")); };
    img.src = url;
  });
}

function keBlob(kv: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => kv.toBlob((b) => (b ? res(b) : rej(new Error("Gagal menyediakan gambar."))), "image/png"));
}

/** Skala kanvas ke dalam kotak maks × maks (tidak membesarkan). */
function muatKotak(kv: HTMLCanvasElement, maksL: number, maksT: number): HTMLCanvasElement {
  const skala = Math.min(1, maksL / kv.width, maksT / kv.height);
  if (skala === 1) return kv;
  const k = document.createElement("canvas");
  k.width = Math.max(1, Math.round(kv.width * skala));
  k.height = Math.max(1, Math.round(kv.height * skala));
  const ctx = k.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(kv, 0, 0, k.width, k.height);
  return k;
}

/** Foto/gambar tandatangan → PNG lut sinar, dipotong, ≤ 600×200 px. */
export async function prosesGambarTandatangan(fail: Blob): Promise<Blob> {
  const imej = await bukaImej(fail);
  const skala = Math.min(1, 1400 / Math.max(imej.width, imej.height));
  const kv = document.createElement("canvas");
  kv.width = Math.max(1, Math.round(imej.width * skala));
  kv.height = Math.max(1, Math.round(imej.height * skala));
  const ctx = kv.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, kv.width, kv.height);
  ctx.drawImage(imej, 0, 0, kv.width, kv.height);
  if ("close" in imej && typeof imej.close === "function") imej.close();

  const data = ctx.getImageData(0, 0, kv.width, kv.height);
  const d = data.data;
  const n = kv.width * kv.height;
  const cerah = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3] / 255; // PNG lut sinar: anggap latar putih
    const c = Math.round(kecerahan(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) * a + 255 * (1 - a));
    cerah[i] = c;
  }
  // LATAR SETEMPAT: foto di bawah lampu kelas terang sebelah, gelap
  // sebelah (150 → 210). Satu ambang untuk seluruh foto menjadikan sisi gelap
  // "dakwat". Maka kecerahan kertas dianggar bagi setiap blok (persentil
  // ke-85 — kertas mendominasi setiap blok), dilicinkan secara bilinear, dan
  // dakwat = piksel yang JAUH lebih gelap daripada kertas di sekitarnya.
  const B = Math.max(16, Math.round(Math.max(kv.width, kv.height) / 40));
  const bl = Math.ceil(kv.width / B), bt = Math.ceil(kv.height / B);
  const latarBlok = new Float32Array(bl * bt);
  const h = new Uint32Array(256);
  for (let by = 0; by < bt; by++) {
    for (let bx = 0; bx < bl; bx++) {
      h.fill(0);
      let bil = 0;
      for (let y = by * B; y < Math.min(kv.height, (by + 1) * B); y++) {
        for (let x = bx * B; x < Math.min(kv.width, (bx + 1) * B); x++) { h[cerah[y * kv.width + x]]++; bil++; }
      }
      let k = 0, v = 255;
      for (let i = 0; i < 256; i++) { k += h[i]; if (k >= bil * 0.85) { v = i; break; } }
      latarBlok[by * bl + bx] = v;
    }
  }
  const latar = (x: number, y: number) => {
    const fx = Math.min(bl - 1, Math.max(0, x / B - 0.5)), fy = Math.min(bt - 1, Math.max(0, y / B - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(bl - 1, x0 + 1), y1 = Math.min(bt - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const a = latarBlok[y0 * bl + x0] * (1 - tx) + latarBlok[y0 * bl + x1] * tx;
    const c = latarBlok[y1 * bl + x0] * (1 - tx) + latarBlok[y1 * bl + x1] * tx;
    return a * (1 - ty) + c * ty;
  };

  // Kontras dakwat sebenar dianggar daripada Otsu pada beza (latar − piksel).
  const beza = new Uint8Array(n);
  const hb = new Array<number>(256).fill(0);
  for (let y = 0; y < kv.height; y++) {
    for (let x = 0; x < kv.width; x++) {
      const i = y * kv.width + x;
      const v = Math.max(0, Math.min(255, Math.round(latar(x, y) - cerah[i])));
      beza[i] = v;
      hb[v]++;
    }
  }
  const delta = Math.max(28, ambangOtsu(hb, n));

  let minX = kv.width, minY = kv.height, maxX = -1, maxY = -1;
  for (let i = 0; i < n; i++) {
    const v = beza[i];
    const o = i * 4;
    // Alfa licin: 0 di bawah 0.6×delta, legap penuh pada 1.4×delta.
    const alfa = v >= delta * 1.4 ? 255 : v <= delta * 0.6 ? 0 : Math.round(255 * (v - delta * 0.6) / (delta * 0.8));
    d[o] = WARNA_DAKWAT[0]; d[o + 1] = WARNA_DAKWAT[1]; d[o + 2] = WARNA_DAKWAT[2]; d[o + 3] = alfa;
    if (alfa > 128) {
      const x = i % kv.width, y = (i / kv.width) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("Tandatangan tidak dapat dikesan dalam gambar ini.");
  ctx.putImageData(data, 0, 0);

  const jidar = 6;
  const x0 = Math.max(0, minX - jidar), y0 = Math.max(0, minY - jidar);
  const lebar = Math.min(kv.width - x0, maxX - minX + 1 + jidar * 2);
  const tinggi = Math.min(kv.height - y0, maxY - minY + 1 + jidar * 2);
  const potong = document.createElement("canvas");
  potong.width = lebar;
  potong.height = tinggi;
  potong.getContext("2d")!.drawImage(kv, x0, y0, lebar, tinggi, 0, 0, lebar, tinggi);
  kv.width = 1; kv.height = 1;
  return keBlob(muatKotak(potong, 600, 200));
}

/** Lukisan kanvas → PNG ≤ 600×200 px. */
export async function kecilkanLukisan(kanvas: HTMLCanvasElement): Promise<Blob> {
  return keBlob(muatKotak(kanvas, 600, 200));
}

export function gambarDisokong(f: File): boolean {
  return f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name);
}
