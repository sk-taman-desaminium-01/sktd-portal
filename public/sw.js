/* Service worker Portal Kakitangan SKTD
 * ==========================================================================
 * SENGAJA JAUH LEBIH KETAT daripada service worker laman awam.
 *
 * Portal ini dilindungi log masuk dan memapar data sekolah. Service worker
 * berkongsi satu storan cache untuk SEMUA pengguna peranti itu. Kalau HTML
 * dicache, halaman admin seorang guru boleh dipapar kepada guru lain yang
 * log masuk kemudian pada telefon yang sama — kebocoran data sebenar, sama
 * keluarga dengan K8 dalam docs/pertahanan-risiko.md.
 *
 * Maka: HANYA aset tetap tanpa nama pengguna di dalamnya yang dicache —
 * bundle JS/CSS bercap kandungan dan ikon. Setiap HTML, setiap panggilan
 * data, setiap permintaan Clerk pergi terus ke rangkaian, setiap kali.
 *
 * JANGAN tambah caching HTML di sini. Kalau portal perlu sokongan luar
 * talian, ia mesti dibina dengan storan per-pengguna yang dibersihkan semasa
 * log keluar — bukan dengan melonggarkan fail ini.
 */

const VERSI = "portal-v1";
const ASET = `aset-${VERSI}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((n) => Promise.all(n.filter((x) => !x.endsWith(VERSI)).map((x) => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hanya bundle bercap kandungan dan ikon. Tiada yang lain.
  // Laluan sebenar termasuk basePath `/portal`.
  const selamat =
    url.pathname.startsWith("/portal/_next/static/") ||
    /^\/portal\/(ikon-|apple-touch-icon|logo-sktd)/.test(url.pathname);
  if (!selamat) return;

  e.respondWith(
    caches.match(request).then((hit) =>
      hit || fetch(request).then((res) => {
        if (res.ok) {
          const salinan = res.clone();
          caches.open(ASET).then((c) => c.put(request, salinan));
        }
        return res;
      })
    )
  );
});
