import { NextResponse } from "next/server";
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
  "/kebenaran",
  "/kebenaran/(.*)",
]);

/**
 * SATU PINTU MASUK, bukan dua.
 *
 * Portal boleh dicapai melalui dua alamat: `portal.sktd.edu.my` terus, dan
 * `sktd.edu.my/portal` melalui proksi Worker Cloudflare. Proksi itu WUJUD
 * atas sebab yang sah — iOS membuka asal LAIN dalam pelayar-dalam-app dengan
 * bar Safari, dan itu memecahkan app yang dipasang.
 *
 * Tetapi dua alamat menghasilkan DUA SESI. Worker membuang atribut `Domain=`
 * daripada setiap kuki (ia terpaksa: kuki `Domain=portal.sktd.edu.my` ditolak
 * pelayar pada halaman sktd.edu.my), jadi kuki log masuk yang dibuat melalui
 * proksi menjadi milik sktd.edu.my SAHAJA. Guru yang log masuk di satu
 * alamat mendapati dirinya belum log masuk di alamat yang satu lagi — dan
 * jabat tangan Clerk yang berulang itu ialah masa menunggu yang mereka rasa.
 *
 * Maka alamat langsung MELENCONG ke alamat proksi. Permintaan yang datang
 * DARI Worker dikecualikan (ia membawa `X-Forwarded-Host`); tanpa
 * pengecualian itu, proksi dan lencongan akan berbalas-balas selamanya.
 *
 * Diukur pada domain hidup: proksi menambah 50–170ms setiap permintaan.
 * Itu harga yang dibayar untuk satu sesi dan app iOS yang tidak pecah —
 * dan ia jauh lebih kecil daripada saat-saat yang hilang kepada log masuk
 * berulang.
 */
const HOS_LANGSUNG = "portal.sktd.edu.my";
const HOS_UTAMA = "https://sktd.edu.my";

export default clerkMiddleware(
  async (auth, req) => {
    const hos = req.headers.get("host") ?? "";
    const dariProksi = req.headers.has("x-forwarded-host");
    if (hos === HOS_LANGSUNG && !dariProksi) {
      const url = new URL(req.url);
      return Response.redirect(`${HOS_UTAMA}${url.pathname}${url.search}`, 308);
    }

    const kepala = new Headers(req.headers);
    kepala.delete("x-sktd-borang-awam");
    const path = req.nextUrl.pathname.replace(/^\/portal(?=\/|$)/, "");
    if (path === "/kebenaran" || path.startsWith("/kebenaran/")) kepala.set("x-sktd-borang-awam", "1");
    if (!LALUAN_AWAM(req)) await auth.protect();
    const res = NextResponse.next({ request: { headers: kepala } });
    if (kepala.has("x-sktd-borang-awam")) {
      res.headers.set("Referrer-Policy", "no-referrer");
      res.headers.set("Cache-Control", "private, no-store");
    }
    return res;
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
