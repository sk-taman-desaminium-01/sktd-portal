export const PENYAKIT = ["Alahan (ubat/makanan/kontak)", "Asma/Sesak Nafas/Penyakit Paru-Paru", "Epilepsi/Sawan", "Diabetes", "Sakit Jantung", "Thalasemia/Hemophillia/Leukemia", "Buah Pinggang", "Lain-lain (nyatakan)"] as const;
export interface AktivitiBorang { id: string; nama: string; tarikh: string; masa: string; tempat: string; anjuran: string; skop: string; tutup: string; pengurus_emel: string; aktif: boolean }
export interface AkuanAktiviti {
 muridNama: string; muridKp: string; kelas: string; penjagaNama: string; penjagaKp: string;
 alamat: string; telefon: string; bersetuju: boolean; penyakit: { ada: boolean; catatan: string }[];
}
export function semakAkuan(x: unknown): x is AkuanAktiviti {
 if (!x || typeof x !== "object") return false;
 const d = x as AkuanAktiviti;
 for (const k of ["muridNama","kelas","penjagaNama","alamat","telefon"] as const)
   if (typeof d[k] !== "string" || d[k].trim().length < 2 || d[k].length > 1000) return false;
 return typeof d.muridKp === "string" && typeof d.penjagaKp === "string" && /^\d{12}$/.test(d.muridKp) && /^\d{12}$/.test(d.penjagaKp) && typeof d.bersetuju === "boolean" &&
   Array.isArray(d.penyakit) && d.penyakit.length === PENYAKIT.length && d.penyakit.every((p) => p && typeof p.ada === "boolean" && typeof p.catatan === "string" && p.catatan.length <= 500);
}
export interface JawapanAktiviti { id: string; aktiviti_id: string; data: AkuanAktiviti; dicipta: string }
