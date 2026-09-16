import type { NextConfig } from "next";

/**
 * BASE PATH `/portal` — kenapa.
 *
 * Bila laman sekolah dipasang sebagai app pada iPhone, sebarang navigasi ke
 * ASAL LAIN (termasuk subdomain sendiri) dibuka iOS dalam pelayar-dalam-app,
 * lengkap dengan bar Safari di bawah skrin: belakang · kongsi · muat semula ·
 * kompas. `scope` manifest tidak boleh membetulkannya — skop ditakrifkan
 * dalam satu asal sahaja, dan `portal.sktd.edu.my` ialah asal yang BERBEZA
 * daripada `sktd.edu.my`.
 *
 * Maka portal mesti turut boleh dicapai SAMA-ASAL. Ia disajikan di bawah
 * `/portal`, dan Worker Cloudflare di `sktd-web` memproksikan
 * `sktd.edu.my/portal/*` ke sini. Subdomain KEKAL hidup dan berfungsi penuh
 * di `portal.sktd.edu.my/portal/*`; ia bukan diganti, cuma tidak lagi
 * satu-satunya jalan masuk.
 *
 * ⚠️ `basePath` ditanam ke dalam bundle pelanggan semasa BINAAN. Menukarnya
 * memerlukan binaan semula — ia bukan tetapan masa jalan.
 */
const nextConfig: NextConfig = {
  basePath: "/portal",

  experimental: {
    serverActions: {
      /**
       * WAJIB kerana portal disajikan melalui proksi.
       *
       * Next membandingkan hos dalam tajuk `Origin` permintaan dengan hos
       * app sendiri (`x-forwarded-host` atau `host`) dan MENOLAK tindakan
       * bila kedua-duanya berbeza — perlindungan CSRF.
       *
       * Melalui proksi Cloudflare, pelayar menghantar
       * `Origin: https://sktd.edu.my` sedangkan Vercel menerima
       * `Host: portal.sktd.edu.my`. Ia tidak sama, jadi SETIAP Server Action
       * ditolak: meluluskan guru, menukar peranan, menerbitkan pos. Memuat
       * halaman (GET) tidak disemak begitu, jadi skrin kelihatan normal
       * sepenuhnya — itulah sebabnya kegagalan ini mengelirukan.
       *
       * Kedua-dua hos disenaraikan kerana portal boleh dicapai melalui
       * kedua-duanya, dan kedua-duanya milik sekolah.
       */
      allowedOrigins: ["sktd.edu.my", "portal.sktd.edu.my"],
    },
  },

  async redirects() {
    return [
      {
        // `portal.sktd.edu.my/` kosong selepas basePath ditetapkan. Tanpa
        // lencongan ini, sesiapa yang menanda buku subdomain itu mendapat 404.
        // `basePath: false` menghalang Next daripada menambah awalan dua kali.
        source: "/",
        destination: "/portal",
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
