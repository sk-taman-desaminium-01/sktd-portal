/**
 * Awalan laluan app. MESTI sepadan dengan `basePath` dalam `next.config.ts`.
 *
 * `next/link` dan `next/router` menambah awalan ini sendiri, TETAPI
 * `next/image` TIDAK (didokumenkan dalam
 * node_modules/next/dist/docs/.../basePath.md). Begitu juga `<img src>`
 * mentah, `manifest.ts`, dan apa-apa URL yang kita bina sebagai teks.
 *
 * Jadi: guna `aset()` untuk setiap fail dalam `public/`.
 */
export const AWALAN = "/portal";

export function aset(laluan: string): string {
  return `${AWALAN}${laluan.startsWith("/") ? laluan : `/${laluan}`}`;
}
