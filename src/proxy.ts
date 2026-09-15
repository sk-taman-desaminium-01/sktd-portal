import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { AWALAN } from "@/lib/laluan";

/**
 * Perlindungan laluan untuk SELURUH portal.
 *
 * Next 16 menamakan fail ini `proxy.ts` (dahulu `middleware.ts`) — disahkan
 * dalam node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
 *
 * KENAPA DI SINI, BUKAN DI UI: peraturan projek menetapkan hab dan semua
 * laluan kakitangan WAJIB log masuk, dikawal di lapisan ini. Menyembunyikan
 * pautan di UI bukan kawalan — orang awam yang menaip URL terus mesti ditolak
 * sebelum sebarang halaman dirender.
 *
 * Lalai: SEMUA tertutup. Hanya laluan dalam senarai di bawah terbuka. Cara ini
 * bermakna halaman baharu yang kita lupa fikirkan adalah TERTUTUP secara lalai,
 * bukan terdedah.
 */
const LALUAN_AWAM = createRouteMatcher([
  "/masuk(.*)",
  "/daftar(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (!LALUAN_AWAM(req)) {
      await auth.protect();
    }
  },
  {
    // Tanpa ini, pengguna yang belum log masuk dapat 404 dan bukan dialih ke
    // skrin log masuk — guru akan sangka portal rosak. Disahkan pada domain
    // hidup: / dan /admin kedua-duanya 404 sebelum ini ditetapkan.
    // MESTI membawa basePath. Clerk membina lencongan daripada nilai ini
    // secara harfiah — ia tidak tahu tentang `basePath` Next, jadi "/masuk"
    // menghasilkan sktd.edu.my/masuk yang tiada di sana (halaman laman awam),
    // bukan portal. Disahkan tempatan: tanpa awalan, lencongan menuju /masuk.
    signInUrl: `${AWALAN}/masuk`,
  },
);

export const config = {
  matcher: [
    // Akar app secara EKSPLISIT.
    // Dengan `basePath: "/portal"`, Next menambah awalan kepada setiap corak
    // matcher — jadi corak am di bawah menjadi `/portal/(...)` dan TIDAK
    // pernah memadankan `/portal` telanjang. Akibatnya clerkMiddleware tidak
    // berjalan untuk muka depan portal dan `auth()` melontar 500.
    // Disahkan secara tempatan: /portal = 500 sebelum baris ini, 307 selepas.
    "/",
    // Semua laluan kecuali fail statik Next dan aset dengan sambungan fail.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
