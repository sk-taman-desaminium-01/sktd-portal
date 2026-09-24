/** Teks SEBIJIK jadual D borang asal (termasuk ejaan "Hemophillia"). Jawapan disimpan ikut indeks, jadi teks boleh dipadankan tanpa migrasi. */
export const PENYAKIT = ["Alahan (Ubat/ makanan/ kontak)", "Asma/ Sesak Nafas/ Penyakit Paru-Paru", "Epilepsi/ Sawan", "Diabetes", "Sakit Jantung", "Thalasemia / Hemophillia / Leukemia", "Buah Pinggang", "Lain-lain (Nyatakan)"] as const;
/** `tarikh` = tarikh MULA; `tarikh_tamat` untuk kejohanan beberapa hari (null = satu hari). */
export interface AktivitiBorang { id: string; nama: string; tarikh: string; tarikh_tamat?: string | null; masa: string; tempat: string; anjuran: string; skop: string; tutup: string; pengurus_emel: string; aktif: boolean }
export interface AkuanAktiviti {
 muridNama: string; muridKp: string; kelas: string; penjagaNama: string; penjagaKp: string;
 alamat: string; telefon: string; bersetuju: boolean; penyakit: { ada: boolean; catatan: string }[];
 /** Tandatangan penjaga (data URL PNG/JPEG). Pilihan — borang lama tidak mempunyainya. */
 tandatangan?: string;
}
/**
 * Had tandatangan dalam jsonb.
 *
 * Tandatangan kini dikecilkan ke 600×200 px sebelum disimpan, jadi ia
 * 10–40 KB. Had lama 350 KB dikira: 2,252 murid × 350 KB = 770 MB setahun,
 * iaitu LEBIH BESAR daripada kuota 500 MB pangkalan data percuma — dan
 * pangkalan data yang penuh MENGUNCI sistem, bukan memperlahankannya.
 */
export const HAD_TANDATANGAN = 150_000;
export function semakAkuan(x: unknown): x is AkuanAktiviti {
 if (!x || typeof x !== "object") return false;
 const d = x as AkuanAktiviti;
 for (const k of ["muridNama","penjagaNama","alamat","telefon"] as const)
   if (typeof d[k] !== "string" || d[k].trim().length < 2 || d[k].length > 1000) return false;
 // Kelas diisi PELAYAN daripada senarai peserta pengurus — penjaga tidak menaipnya.
 if (typeof d.kelas !== "string" || d.kelas.length > 100) return false;
 if (d.tandatangan !== undefined && (typeof d.tandatangan !== "string" || d.tandatangan.length > HAD_TANDATANGAN ||
   !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(d.tandatangan))) return false;
 return typeof d.muridKp === "string" && typeof d.penjagaKp === "string" && /^\d{12}$/.test(d.muridKp) && /^\d{12}$/.test(d.penjagaKp) && typeof d.bersetuju === "boolean" &&
   Array.isArray(d.penyakit) && d.penyakit.length === PENYAKIT.length && d.penyakit.every((p) => p && typeof p.ada === "boolean" && typeof p.catatan === "string" && p.catatan.length <= 500);
}
export interface JawapanAktiviti { id: string; aktiviti_id: string; data: AkuanAktiviti; dicipta: string }

/** Token nama untuk padanan: huruf besar, BT/BINTI/B. → BIN, A/L → AL, A/P → AP. */
export function tokenNama(n: string): string[] {
 return n.toUpperCase().replace(/\bA\s*\/\s*L\b/g, " AL ").replace(/\bA\s*\/\s*P\b/g, " AP ")
   .replace(/[^A-Z0-9 ]+/g, " ").split(/\s+/).filter(Boolean)
   .map((t) => (t === "BINTI" || t === "BT" || t === "B" || t === "BTE" ? "BIN" : t));
}

/**
 * Nama taipan penjaga sepadan dengan nama rasmi? Tepat (selepas dinormalkan),
 * ATAU sekurang-kurangnya dua perkataan pertama nama rasmi mengikut urutan.
 * No. MyKid yang tepat sudah pun menjadi penentu utama.
 */
export function namaSepadan(rasmi: string, taip: string): boolean {
 const a = tokenNama(rasmi), b = tokenNama(taip);
 if (b.length === 0) return false;
 if (a.join(" ") === b.join(" ")) return true;
 if (b.length < 2) return false;
 return b.every((t, i) => a[i] === t);
}

const BULAN_BORANG = ["JANUARI", "FEBRUARI", "MAC", "APRIL", "MEI", "JUN", "JULAI", "OGOS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DISEMBER"];

/**
 * Julat tarikh seperti ditaip pada borang sekolah:
 *   "24 MEI 2026" · "24 HINGGA 26 MEI 2026" · "30 MEI HINGGA 2 JUN 2026"
 *   · "30 DISEMBER 2026 HINGGA 2 JANUARI 2027".
 */
export function julatTarikh(mula: string | null | undefined, tamat?: string | null, besar = true): string {
  // Nilai dari pangkalan data/JSON tidak semestinya teks — jangan hempas.
  const teks = (v: unknown) => (typeof v === "string" ? v : "");
  const p = (iso: unknown) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(teks(iso));
    return m ? { y: m[1], b: BULAN_BORANG[Number(m[2]) - 1] ?? "", h: String(Number(m[3])) } : null;
  };
  const a = p(mula), z = p(tamat);
  const ke = (t: string) => (besar ? t : t.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()).replace(/Hingga/g, "hingga"));
  if (!a) return teks(mula).toUpperCase();
  if (!z || tamat === mula) return ke(`${a.h} ${a.b} ${a.y}`);
  if (a.y !== z.y) return ke(`${a.h} ${a.b} ${a.y} HINGGA ${z.h} ${z.b} ${z.y}`);
  if (a.b !== z.b) return ke(`${a.h} ${a.b} HINGGA ${z.h} ${z.b} ${z.y}`);
  return ke(`${a.h} HINGGA ${z.h} ${z.b} ${z.y}`);
}
