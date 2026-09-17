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

const VERSI = "portal-v3";
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

/* ----------------------------------------------------- pemberitahuan tolak */

/**
 * Pemberitahuan yang naik di skrin telefon walaupun portal ditutup.
 *
 * `userVisibleOnly: true` dituntut oleh setiap pelayar, dan ia bermakna
 * SETIAP push MESTI memaparkan sesuatu. Push yang tiba tanpa muatan yang
 * boleh dibaca tetap memaparkan pemberitahuan am — kalau tidak, pelayar
 * menarik balik kebenaran tapak ini selepas beberapa kali.
 */
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { tajuk: "Portal SKTD", teks: e.data ? e.data.text() : "" };
  }

  const tajuk = data.tajuk || "Portal SKTD";
  const pilihan = {
    body: data.teks || "",
    icon: "/portal/ikon-192.png",
    badge: "/portal/ikon-192.png",
    tag: data.tag || undefined,
    data: { pautan: data.pautan || "/portal/notifikasi" },
  };
  e.waitUntil(self.registration.showNotification(tajuk, pilihan));
});

/**
 * Ketukan pada pemberitahuan membuka tab yang SUDAH ada, kalau ada.
 *
 * Membuka tab baharu setiap kali meninggalkan guru dengan enam salinan
 * portal selepas seminggu.
 */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const pautan = (e.notification.data && e.notification.data.pautan) || "/portal/notifikasi";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tetingkap) => {
      for (const w of tetingkap) {
        if (w.url.includes("/portal") && "focus" in w) {
          w.navigate(pautan);
          return w.focus();
        }
      }
      return self.clients.openWindow(pautan);
    }),
  );
});
