/**
 * Kesan sama ada kegagalan Supabase bermakna pemasangan skema belum lengkap
 * — sama ada jadual, kolum, atau kekangan `on_conflict` belum wujud.
 *
 * SQL baharu (dalam laporan akhir) mesti dijalankan SEKALI oleh admin dalam
 * konsol Supabase sebelum ciri baharu berfungsi. Sebelum itu dijalankan,
 * skrin mesti berkata demikian dengan tenang (corak sedia ada — lihat
 * `src/lib/tindakan-bilik.ts`), bukan menghempas dengan mesej ralat generik.
 */
export function belumDipasang(e: unknown, ...namaJadual: string[]): boolean {
  const teks = e instanceof Error ? e.message : String(e);
  const corak = new RegExp(
    `${namaJadual.join("|")}|42P01|42703|42P10|PGRST204|does not exist|` +
      `no unique or exclusion constraint|schema cache|Not Found|404`,
    "i",
  );
  return corak.test(teks);
}
