"use client";

import { useEffect } from "react";

/**
 * PAUTAN LUAR KEKAL DALAM APP — hanya pada SKRIN BESAR.
 *
 * Di laptop, `target="_blank"` membuka tab pelayar biasa dan guru terkeluar
 * dari app yang dipasang. Bila portal berjalan sebagai app (display-mode
 * standalone), pautan itu dibuka dalam tetingkap app yang SAMA: Chrome/Edge
 * memaparkan laman luar dengan bar alamat kecil dan butang ✕ untuk kembali.
 *
 * DI TELEFON IA TIDAK BOLEH BERBUAT BEGITU, dan versi awal komponen ini
 * silap kerana `display-mode: standalone` turut padan pada telefon yang
 * memasang portal. Akibatnya laman KPM — HRMIS, eOperasi, SISPA, yang
 * kesemuanya bereka bentuk untuk skrin desktop — dibuka DI DALAM tetingkap
 * app: tiada bar alamat, tiada butang putar, dan cubitan untuk mengezum
 * tidak berfungsi kerana tetingkap app bukan tab pelayar. Guru melihat
 * borang yang terpotong dan tidak boleh berbuat apa-apa mengenainya.
 *
 * Dibiarkan sendiri, sistem telefon membuka pautan itu dalam pelayar
 * (Custom Tab / Safari) yang MEMANG ada bar alamat, zum cubit, dan putaran
 * skrin. Itu yang guru perlukan untuk mengisi borang KPM.
 *
 * Maka: hanya pintas pada skrin lebar. Tidak menyentuh apa-apa dalam pelayar
 * biasa, pautan muat turun (`download`), blob/PDF, mailto/tel, atau klik
 * dengan Ctrl/⌘/Shift (buka tab sengaja).
 */
export default function PautanDalamApp() {
  useEffect(() => {
    const apl = window.matchMedia("(display-mode: standalone), (display-mode: minimal-ui), (display-mode: window-controls-overlay)");
    // Ambang skrin: di bawah ini, pelayar peranti melakukan kerja yang lebih
    // baik daripada kita. 1024px ialah sempadan tablet/laptop yang sama
    // digunakan di seluruh laman ini.
    const luas = window.matchMedia("(min-width: 1024px)");
    const klik = (e: MouseEvent) => {
      if (!apl.matches || !luas.matches || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
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
