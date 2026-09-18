/**
 * Kesan sama ada kegagalan Supabase bermakna "jadual belum wujud" — bukan
 * ralat sebenar.
 *
 * SQL baharu (dalam laporan akhir) mesti dijalankan SEKALI oleh admin dalam
 * konsol Supabase sebelum ciri baharu berfungsi. Sebelum itu dijalankan,
 * skrin mesti berkata demikian dengan tenang (corak sedia ada — lihat
 * `src/lib/tindakan-bilik.ts`), bukan menghempas dengan mesej ralat generik.
 */
export function belumDipasang(e: unknown, ...namaJadual: string[]): boolean {
  const teks = e instanceof Error ? e.message : String(e);
  const corak = new RegExp(`${namaJadual.join("|")}|42P01|does not exist|Not Found|404`, "i");
  return corak.test(teks);
}
