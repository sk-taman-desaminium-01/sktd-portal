/**
 * Mengecilkan gambar DALAM PELAYAR sebelum ia dimuat naik.
 *
 * MASALAH YANG INI SELESAIKAN: telefon hari ini menghasilkan gambar 8–15 MB,
 * dan kamera sekolah lebih besar lagi. Laman sekolah memaparkannya pada
 * lebar paling banyak 1,600px. Menyimpan yang asal bermakna membayar storan
 * untuk piksel yang tiada sesiapa akan lihat — dan storan percuma Supabase
 * habis diam-diam sehingga sistem TERKUNCI, bukan menjadi perlahan
 * (peraturan keras #8).
 *
 * Maka: pelayar mengecilkannya dahulu. Fail 1 GB tidak pernah menyeberang
 * rangkaian; yang dihantar ialah kira-kira 200–400 KB.
 *
 * KENAPA DALAM PELAYAR, BUKAN DI PELAYAN: mengecilkan di pelayan bermakna
 * 1 GB itu MESTI sampai ke pelayan dahulu — melebihi setiap had badan
 * permintaan yang wujud, dan membayar lebar jalur untuk bait yang akan
 * dibuang sebentar lagi.
 *
 * KUALITI TIDAK DIKORBANKAN SECARA MEMBUTA: gambar yang sudah kecil
 * dibiarkan seadanya, dan hasil yang ternyata lebih BESAR daripada asal
 * ditolak — pengekodan semula PNG grafik menjadi WebP kadang menambah saiz,
 * dan menyimpan yang lebih besar ialah kerugian bersih.
 */

export interface HasilKecil {
  fail: File;
  /** Saiz asal dalam bait — untuk memberitahu pengguna apa yang berlaku. */
  saizAsal: number;
  lebarAsal: number;
  tinggiAsal: number;
  lebarBaharu: number;
  tinggiBaharu: number;
  /** Benar bila fail asal dikembalikan tanpa diubah. */
  kekalAsal: boolean;
}

export interface TetapanKecil {
  /** Lebar/tinggi maksimum. Nisbah bentuk sentiasa dikekalkan. */
  maksSisi?: number;
  /** 0–1. */
  kualiti?: number;
  /** Jenis keluaran. WebP jauh lebih kecil pada kualiti yang sama. */
  jenis?: "image/webp" | "image/jpeg";
}

/**
 * 1,600px: dua kali lebar paparan terbesar laman (800px), supaya skrin
 * Retina kekal tajam. Lebih daripada itu tidak menambah apa-apa yang mata
 * boleh lihat pada laman ini.
 */
const MAKS_SISI = 1600;
const KUALITI = 0.82;

/** Had muat naik: gambar sebesar ini pun diterima, kerana ia dikecilkan. */
export const HAD_GAMBAR_BAIT = 1024 * 1024 * 1024; // 1 GB

export function bolehDikecilkan(fail: File): boolean {
  // SVG ialah teks, bukan piksel — melukisnya ke kanvas memusnahkannya.
  // HEIC tidak boleh dinyahkod oleh setiap pelayar; kalau `createImageBitmap`
  // gagal, fungsi di bawah memulangkan fail asal dengan jujur.
  return fail.type.startsWith("image/") && fail.type !== "image/svg+xml";
}

export async function kecilkanGambar(
  fail: File,
  tetapan: TetapanKecil = {},
): Promise<HasilKecil> {
  const maks = tetapan.maksSisi ?? MAKS_SISI;
  const kualiti = tetapan.kualiti ?? KUALITI;
  const jenis = tetapan.jenis ?? "image/webp";

  const tiadaUbah = (l = 0, t = 0): HasilKecil => ({
    fail, saizAsal: fail.size, lebarAsal: l, tinggiAsal: t,
    lebarBaharu: l, tinggiBaharu: t, kekalAsal: true,
  });

  if (!bolehDikecilkan(fail)) return tiadaUbah();

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(fail);
  } catch {
    // Format yang pelayar ini tidak faham (HEIC pada sesetengah pelayar).
    // Pulangkan yang asal dan biarkan lapisan di atas memutuskan — menolak
    // fail yang sah kerana kita tidak boleh mengecilkannya adalah lebih
    // teruk daripada memuat naiknya sebagaimana adanya.
    return tiadaUbah();
  }

  const { width: lebarAsal, height: tinggiAsal } = bitmap;
  const skala = Math.min(1, maks / Math.max(lebarAsal, tinggiAsal));
  const lebar = Math.max(1, Math.round(lebarAsal * skala));
  const tinggi = Math.max(1, Math.round(tinggiAsal * skala));

  const kanvas = document.createElement("canvas");
  kanvas.width = lebar;
  kanvas.height = tinggi;
  const ctx = kanvas.getContext("2d");
  if (!ctx) { bitmap.close(); return tiadaUbah(lebarAsal, tinggiAsal); }

  // `high` penting: lalai pelayar menghasilkan tepi bergerigi apabila
  // gambar dikecilkan lebih daripada dua kali, dan wajah dalam gambar
  // pentadbir ialah tepat apa yang paling ketara.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, lebar, tinggi);
  bitmap.close();

  const blob = await new Promise<Blob | null>((selesai) =>
    kanvas.toBlob(selesai, jenis, kualiti),
  );
  if (!blob) return tiadaUbah(lebarAsal, tinggiAsal);

  // Hasil yang lebih besar daripada asal ialah kerugian bersih.
  if (blob.size >= fail.size && skala === 1) return tiadaUbah(lebarAsal, tinggiAsal);

  const sambungan = jenis === "image/webp" ? "webp" : "jpg";
  const namaBaharu = `${fail.name.replace(/\.[^.]+$/, "")}.${sambungan}`;

  return {
    fail: new File([blob], namaBaharu, { type: jenis, lastModified: Date.now() }),
    saizAsal: fail.size,
    lebarAsal, tinggiAsal,
    lebarBaharu: lebar, tinggiBaharu: tinggi,
    kekalAsal: false,
  };
}

/** "8.4 MB → 240 KB (4032×3024 → 1600×1200)" */
export function ceritaKecil(h: HasilKecil): string {
  if (h.kekalAsal) return `${bait(h.saizAsal)} — tidak perlu dikecilkan.`;
  return (
    `${bait(h.saizAsal)} → ${bait(h.fail.size)} ` +
    `(${h.lebarAsal}×${h.tinggiAsal} → ${h.lebarBaharu}×${h.tinggiBaharu})`
  );
}

export function bait(n: number): string {
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/**
 * Nama fail untuk salinan ASAL yang disimpan di Google Drive.
 *
 * Nama dari telefon ("IMG_4821.HEIC") tidak memberitahu sesiapa apa-apa
 * enam bulan kemudian. Nama ini membawa tarikh, tujuan dan nama asal —
 * cukup untuk sesiapa mencarinya dalam Drive tanpa membuka setiap fail.
 */
export function namaUntukDrive(fail: File, tujuan: string): string {
  const t = new Date();
  const cap = [
    t.getFullYear(),
    String(t.getMonth() + 1).padStart(2, "0"),
    String(t.getDate()).padStart(2, "0"),
  ].join("-");
  const bersih = tujuan.replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").slice(0, 60);
  const asal = fail.name.replace(/[/\\]/g, "-");
  return `${cap}_${bersih || "gambar"}_${asal}`;
}
