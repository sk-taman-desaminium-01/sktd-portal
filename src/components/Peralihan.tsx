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
      {/*
        LOGO BERPUTAR 3D — seperti syiling, bukan seperti jatuh.

        Paksi Y, bukan X. Putaran pada paksi X menjungkirkan logo sekolah
        ke bawah, dan logo sekolah yang terbalik ialah perkara yang tiada
        siapa patut lihat — apatah lagi sebagai kesan hiasan.

        DUA SALINAN, bukan satu. Putaran Y biasa memaparkan bayangan cermin
        logo untuk separuh pusingan: tulisan terbalik, jata songsang. Salinan
        kedua diputar 180° dari awal dan kedua-duanya menyembunyikan
        permukaan belakang, jadi mata sentiasa melihat logo yang BETUL —
        sama seperti syiling yang mempunyai muka pada kedua-dua belah.
      */}
      <div className="peralihan-pentas">
        <div className="peralihan-syiling">
          <img
            src="/logo-sktd.png" alt=""
            width={96} height={96}
            className="peralihan-muka h-24 w-24 object-contain"
          />
          <img
            src="/logo-sktd.png" alt=""
            width={96} height={96}
            className="peralihan-muka peralihan-belakang h-24 w-24 object-contain"
          />
        </div>
      </div>

      <style>{`
        @keyframes peralihan-masuk { from { opacity: 0 } to { opacity: 1 } }
        @keyframes peralihan-pusing {
          from { transform: rotateY(0deg) }
          to   { transform: rotateY(360deg) }
        }
        .peralihan-pentas {
          /* Perspektif memberi putaran itu kedalaman. Tanpanya ia hanya
             logo yang dipicit mendatar dan kembali. */
          perspective: 700px;
          width: 6rem;
          height: 6rem;
        }
        .peralihan-syiling {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: peralihan-pusing 1600ms cubic-bezier(.45,.05,.55,.95) infinite;
        }
        .peralihan-muka {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .peralihan-belakang { transform: rotateY(180deg); }

        @media (prefers-reduced-motion: reduce) {
          .peralihan-syiling { animation: none; }
        }
      `}</style>
    </div>
  );
}
