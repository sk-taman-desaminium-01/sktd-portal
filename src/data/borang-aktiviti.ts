/** Teks SEBIJIK jadual D borang asal (termasuk ejaan "Hemophillia"). Jawapan disimpan ikut indeks, jadi teks boleh dipadankan tanpa migrasi. */
export const PENYAKIT = ["Alahan (Ubat/ makanan/ kontak)", "Asma/ Sesak Nafas/ Penyakit Paru-Paru", "Epilepsi/ Sawan", "Diabetes", "Sakit Jantung", "Thalasemia / Hemophillia / Leukemia", "Buah Pinggang", "Lain-lain (Nyatakan)"] as const;
export interface AktivitiBorang { id: string; nama: string; tarikh: string; masa: string; tempat: string; anjuran: string; skop: string; tutup: string; pengurus_emel: string; aktif: boolean }
export interface AkuanAktiviti {
 muridNama: string; muridKp: string; kelas: string; penjagaNama: string; penjagaKp: string;
 alamat: string; telefon: string; bersetuju: boolean; penyakit: { ada: boolean; catatan: string }[];
 /** Tandatangan penjaga (data URL PNG/JPEG). Pilihan — borang lama tidak mempunyainya. */
 tandatangan?: string;
}
/** Had tandatangan dalam jsonb. Lukisan jari biasanya 8–40 KB. */
export const HAD_TANDATANGAN = 350_000;
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
