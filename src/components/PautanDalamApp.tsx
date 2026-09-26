"use client";

import { useEffect } from "react";

/**
 * PAUTAN LUAR KEKAL DALAM APP — pada skrin besar, dipasang atau tidak.
 *
 * MASALAH YANG INI SELESAIKAN
 * Pautan portal KPM membawa `target="_blank"`, jadi ia membuka tetingkap
 * pelayar baharu. Guru yang membukanya dari app terkeluar dari app; guru
 * yang membukanya dari tab biasa mendapat tab kedua yang perlu ditutup
 * sendiri. Versi awal komponen ini hanya memintas apabila portal berjalan
 * sebagai app yang DIPASANG — jadi di Windows dengan pelayar biasa, tetingkap
 * baharu tetap muncul. Itu yang pengguna laporkan.
 *
 * Sekarang ia memintas pada setiap skrin besar: laman KPM dibuka dalam
 * tetingkap yang SAMA, dan butang kembali pelayar membawa guru pulang.
 * Satu tingkah laku, sama ada portal dipasang atau tidak.
 *
 * KENAPA TIDAK DI TELEFON
 * Laman KPM bereka bentuk untuk skrin desktop. Di telefon, pelayar peranti
 * memberi bar alamat, zum cubit dan putaran skrin — ketiga-tiganya tidak
 * wujud dalam tetingkap app, dan tanpanya borang KPM terpotong dan tidak
 * boleh diisi. Ini keputusan pengguna selepas mengujinya sendiri.
 *
 * KERJA YANG BELUM DISIMPAN DILINDUNGI
 * Kekal dalam tetingkap sama bermakna meninggalkan halaman semasa. Kalau ada
 * medan yang sudah diubah, pautan dibiarkan membuka tab baharu seperti biasa
 * — guru mendapat laman KPM DAN kerjanya kekal.
 *
 * Tidak menyentuh pautan muat turun (`download`), blob/PDF, mailto/tel, atau
 * klik dengan Ctrl/⌘/Shift (buka tab dengan sengaja).
 */
export default function PautanDalamApp() {
  useEffect(() => {
    // Ambang skrin: DI BAWAH ini, pelayar peranti melakukan kerja yang lebih
    // baik daripada kita — bar alamat, zum cubit, putaran skrin. Laman KPM
    // bereka bentuk desktop, jadi ketiga-tiganya diperlukan di telefon.
    // 1024px ialah sempadan tablet/laptop yang sama digunakan di seluruh
    // laman ini.
    const luas = window.matchMedia("(min-width: 1024px)");

    /**
     * ADA KERJA YANG BELUM DISIMPAN DI SKRIN INI?
     *
     * Kekal dalam tetingkap yang sama bermakna meninggalkan halaman semasa.
     * Kalau guru sedang menaip rekod disiplin atau mengisi borang aktiviti,
     * itu memusnahkan kerja mereka tanpa amaran.
     *
     * Dikesan dengan membandingkan nilai semasa dengan nilai asal setiap
     * medan — tiada daftar untuk diselenggara, jadi borang baharu dilindungi
     * secara automatik tanpa sesiapa perlu ingat mendaftarkannya.
     */
    const adaKerjaBelumSimpan = () => {
      for (const m of document.querySelectorAll<HTMLInputElement>("input")) {
        if (m.type === "checkbox" || m.type === "radio") {
          if (m.checked !== m.defaultChecked) return true;
        } else if (m.type !== "hidden" && m.value !== m.defaultValue) return true;
      }
      for (const m of document.querySelectorAll<HTMLTextAreaElement>("textarea")) {
        if (m.value !== m.defaultValue) return true;
      }
      return false;
    };

    const klik = (e: MouseEvent) => {
      if (!luas.matches || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[target=_blank]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.protocol !== "https:" && url.protocol !== "http:") return;
      // Kerja belum disimpan: biarkan tab baharu dibuka seperti biasa. Itu
      // TEPAT keadaan di mana tetingkap berasingan ialah jawapan yang betul —
      // guru mendapat laman KPM, dan kerjanya kekal di sini.
      if (adaKerjaBelumSimpan()) return;
      e.preventDefault();
      location.assign(url.href);
    };
    document.addEventListener("click", klik);
    return () => document.removeEventListener("click", klik);
  }, []);
  return null;
}
