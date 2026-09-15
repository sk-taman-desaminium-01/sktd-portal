"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker.
 *
 * Sengaja ditangguh sehingga `load`: mendaftar semasa halaman masih memuat
 * bersaing dengan permintaan yang pengguna sebenarnya sedang menunggu.
 *
 * Kegagalan pendaftaran TIDAK dilaporkan kepada pengguna — laman berfungsi
 * sepenuhnya tanpa service worker; ia hanya kehilangan sokongan luar talian.
 * Tetapi ia dicatat ke konsol supaya kita boleh melihatnya semasa menguji.
 */
export default function DaftarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const daftar = () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => {
        console.warn("[sw] pendaftaran gagal:", e);
      });
    };
    if (document.readyState === "complete") daftar();
    else window.addEventListener("load", daftar, { once: true });
  }, []);
  return null;
}
