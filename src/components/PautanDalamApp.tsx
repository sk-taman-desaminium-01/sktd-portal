"use client";

import { useEffect } from "react";

/**
 * PAUTAN LUAR KEKAL DALAM APP — bila portal dipasang (PWA) di laptop.
 *
 * Di telefon, pautan ke portal KPM (HRMIS, iDMe, eRPM…) dibuka DI DALAM app
 * oleh sistem operasi. Di laptop, `target="_blank"` membuka tab pelayar
 * biasa dan guru terkeluar dari app. Bila portal berjalan sebagai app yang
 * dipasang (display-mode standalone), pautan itu dibuka dalam tetingkap app
 * yang SAMA: Chrome/Edge memaparkan laman luar di dalam app dengan bar
 * alamat kecil dan butang ✕ untuk kembali ke portal — sama seperti telefon.
 *
 * Tidak menyentuh apa-apa dalam pelayar biasa, pautan muat turun (`download`),
 * blob/PDF, mailto/tel, atau klik dengan Ctrl/⌘/Shift (buka tab sengaja).
 */
export default function PautanDalamApp() {
  useEffect(() => {
    const apl = window.matchMedia("(display-mode: standalone), (display-mode: minimal-ui), (display-mode: window-controls-overlay)");
    const klik = (e: MouseEvent) => {
      if (!apl.matches || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[target=_blank]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.protocol !== "https:" && url.protocol !== "http:") return;
      e.preventDefault();
      location.assign(url.href);
    };
    document.addEventListener("click", klik);
    return () => document.removeEventListener("click", klik);
  }, []);
  return null;
}
