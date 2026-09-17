"use client";

import { useEffect, useState } from "react";

/**
 * Skrin peralihan ke laman awam — logo SKTD dengan cincin hijau berputar.
 *
 * Pasangan komponen dalam `sktd-web`, arah bertentangan: portal → sktd.edu.my.
 * Peraturannya SAMA, dan sebabnya sama. Baca nota di bawah sebelum mengubah
 * mana-mana satu; kedua-duanya mesti kekal berkelakuan serupa.
 *
 * ── BACA INI SEBELUM MENGUBAH APA-APA DI SINI ───────────────────────────
 *
 * Versi pertama komponen ini MEMATAHKAN navigasi ke portal selama tiga
 * pusingan, dan puncanya berlapis:
 *
 *  1. Tindanan itu MENELAN KLIK. Ia dipaparkan di atas halaman tanpa
 *     `pointer-events: none`, jadi klik kedua mengenai tindanan.
 *
 *  2. "Pembetulan" saya melancarkan `location.assign()` 1.2 saat kemudian
 *     sebagai jaring keselamatan. Jaring itu MEMBATALKAN navigasi sebenar
 *     yang sedang berjalan — surih Chrome menunjukkan `/portal` dimulakan
 *     DUA KALI, dan yang kedua membunuh yang pertama. Pengguna kekal di
 *     sktd.edu.my dengan cincin yang muncul dan padam.
 *
 * PENGAJARANNYA, dan peraturan komponen ini sekarang:
 *
 *  · JANGAN sentuh navigasi. Tiada `preventDefault`. Tiada `location.assign`.
 *    Tiada `router.push`. Pautan itu pautan biasa; pelayar yang menavigasi.
 *    Komponen ini HANYA melukis sesuatu di atas halaman yang sedang pergi.
 *
 *  · `pointer-events: none` SENTIASA, bukan selepas animasi selesai.
 *
 *  · Portal berada pada asal yang BERBEZA (portal.sktd.edu.my). Tiada cara
 *    untuk mengetahui bila ia selesai dimuat — jadi jangan cuba. Tindanan
 *    ditanggalkan oleh peristiwa `pagehide`, dan dipadam oleh `pageshow`
 *    apabila pengguna menekan Kembali (bfcache memulihkan DOM sebagaimana
 *    ia ditinggalkan, termasuk tindanan yang masih kelihatan).
 *
 *  · Had 12 saat. Kalau navigasi gagal sepenuhnya — luar talian, log masuk
 *    disekat — tindanan menghilang sendiri dan bukannya meninggalkan
 *    pengguna memandang cincin selama-lamanya.
 */

export default function Peralihan() {
  const [nampak, setNampak] = useState(false);

  useEffect(() => {
    let masa: ReturnType<typeof setTimeout> | undefined;

    function klik(e: MouseEvent) {
      // Klik yang diubah suai membuka tab baharu. Halaman ini kekal, jadi
      // tindanan tidak sepatutnya muncul langsung.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const sasaran = (e.target as Element | null)?.closest?.("a");
      if (!(sasaran instanceof HTMLAnchorElement)) return;
      if (sasaran.target && sasaran.target !== "_self") return;
      if (sasaran.hasAttribute("download")) return;

      const jalan = sasaran.getAttribute("href") ?? "";
      if (!/^https:\/\/(www\.)?sktd\.edu\.my(\/|$)/.test(jalan)) return;

      // TIADA preventDefault. Pelayar meneruskan navigasi seperti biasa;
      // kita cuma melukis di atasnya.
      setNampak(true);
      masa = setTimeout(() => setNampak(false), 12000);
    }

    // Fasa TANGKAP, supaya tindanan muncul walaupun sesuatu di bawahnya
    // menghentikan penyebaran peristiwa.
    document.addEventListener("click", klik, true);

    const pergi = () => setNampak(false);
    const balik = (e: PageTransitionEvent) => { if (e.persisted) setNampak(false); };
    window.addEventListener("pagehide", pergi);
    window.addEventListener("pageshow", balik);

    return () => {
      document.removeEventListener("click", klik, true);
      window.removeEventListener("pagehide", pergi);
      window.removeEventListener("pageshow", balik);
      if (masa) clearTimeout(masa);
    };
  }, []);

  if (!nampak) return null;

  return (
    <div
      // `pointer-events-none` ialah sebab komponen versi pertama dibuang.
      // Ia tidak boleh dialih keluar, walau apa pun.
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-white/92 backdrop-blur-sm"
      style={{ animation: "peralihan-masuk 180ms ease-out" }}
      aria-hidden="true"
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full">
          {/* Cincin latar — memberi bentuk kepada bahagian yang belum
              dilalui, supaya cincin berputar tidak kelihatan seperti
              serpihan yang hilang. */}
          <circle cx="56" cy="56" r="52" fill="none" stroke="#e6efe9" strokeWidth="4" />
          <circle
            cx="56" cy="56" r="52" fill="none"
            stroke="#1f7a4d" strokeWidth="4" strokeLinecap="round"
            strokeDasharray="82 245"
            className="peralihan-cincin"
            style={{ transformOrigin: "56px 56px" }}
          />
        </svg>
        <img
          src="/logo-sktd.png"
          alt=""
          width={72}
          height={72}
          className="h-[72px] w-[72px] object-contain"
        />
      </div>

      <style>{`
        @keyframes peralihan-masuk { from { opacity: 0 } to { opacity: 1 } }
        @keyframes peralihan-putar { to { transform: rotate(360deg) } }
        .peralihan-cincin { animation: peralihan-putar 900ms linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .peralihan-cincin { animation: none; }
        }
      `}</style>
    </div>
  );
}
