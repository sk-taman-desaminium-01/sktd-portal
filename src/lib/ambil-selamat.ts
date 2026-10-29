/**
 * Ambil data sampingan tanpa menyembunyikan kegagalan. `.catch(() => [])` lama
 * menjadikan kegagalan pangkalan data kelihatan seperti "tiada rekod".
 * Punca dilog; halaman memaparkan `AmaranMuatGagal` dan selebihnya tetap dipaparkan.
 */
export async function ambilSelamat<T>(
  janji: Promise<T>,
  label: string,
  lalai: T,
): Promise<{ data: T; gagal: boolean }> {
  try {
    return { data: await janji, gagal: false };
  } catch (e) {
    console.error(`[${label}] gagal dimuatkan`, e);
    return { data: lalai, gagal: true };
  }
}
