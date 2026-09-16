/**
 * Had saiz fail — SATU tempat, dikongsi pelayan dan pelayar.
 *
 * Nombor ini muncul di tiga tempat yang mesti sepadan: semakan dalam
 * pelayar (supaya ralat berlaku sebelum apa-apa dihantar), `HAD_SAIZ`
 * dalam `src/lib/storan.ts`, dan `bodySizeLimit` dalam `next.config.ts`.
 * Bila ia TIDAK sepadan, fail ditolak oleh lapisan yang tidak tahu apa-apa
 * tentang fail — dan pengguna mendapat mesej yang tidak menyebut saiz.
 */
export const HAD_MB = 10;
export const HAD_BAIT = HAD_MB * 1024 * 1024;

/** Mesej ralat jika terlalu besar; null jika saiznya diterima. */
export function semakSaiz(fail: File): string | null {
  if (fail.size <= HAD_BAIT) return null;
  return (
    `Fail ini ${(fail.size / 1048576).toFixed(1)} MB — had ${HAD_MB} MB. ` +
    `Cuba simpan semula sebagai .xlsx atau .csv; fail jadual dalam bentuk itu ` +
    `biasanya jauh lebih kecil daripada PDF atau imbasan.`
  );
}
