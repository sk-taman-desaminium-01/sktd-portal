/**
 * Tahap Penguasaan (TP) 1–6.
 *
 * ⚠️ TAFSIRAN GENERIK. DSKP setiap mata pelajaran mempunyai penyataan TP
 * yang KHUSUS kepada subjek itu — "TP4 Bahasa Melayu" berbunyi berbeza
 * daripada "TP4 Matematik". Yang di bawah ialah rangka umum KPM yang
 * dikongsi semua subjek, dan ia dipapar pada slip sebagai PANDUAN ibu bapa,
 * bukan sebagai petikan DSKP.
 *
 * Tandakan ⚠️ SAHKAN dikekalkan sehingga pejabat sekolah mengesahkan
 * perkataannya — ikut cara `sekolah.ts`. Membuangnya kerana ia kelihatan
 * tidak kemas bermakna ibu bapa membaca ayat yang tiada sesiapa sahkan.
 */

export interface Tahap {
  tp: number;
  tajuk: string;
  huraian: string;
}

export const TAHAP: Tahap[] = [
  { tp: 1, tajuk: "Tahu", huraian: "Murid tahu perkara asas, atau boleh melakukan kemahiran asas." },
  { tp: 2, tajuk: "Tahu dan Faham", huraian: "Murid menunjukkan kefahaman dengan menjelaskan sesuatu yang dipelajari." },
  { tp: 3, tajuk: "Tahu, Faham dan Boleh Buat", huraian: "Murid menggunakan pengetahuan untuk melaksanakan sesuatu kemahiran." },
  { tp: 4, tajuk: "Boleh Buat dengan Beradab", huraian: "Murid melaksanakan kemahiran dengan beradab, iaitu mengikut prosedur." },
  { tp: 5, tajuk: "Beradab Terpuji", huraian: "Murid melaksanakan kemahiran dengan beradab dan boleh dicontohi." },
  { tp: 6, tajuk: "Beradab Mithali", huraian: "Murid melaksanakan kemahiran dengan beradab, boleh dicontohi dan boleh dijadikan model." },
];

export function huraianTahap(tp: number | null | undefined): string {
  if (tp === null || tp === undefined) return "";
  return TAHAP.find((t) => t.tp === tp)?.tajuk ?? "";
}
