"use client";

import { useEffect, useState } from "react";

/**
 * Skrin peralihan antara laman awam dan portal.
 *
 * KENAPA INI WUJUD: pertukaran antara laman dan portal memakan 0.7–1.4 saat
 * pada rangkaian sebenar, dan sebahagian besar daripadanya ialah jarak —
 * Cloudflare melayan domain ini dari Eropah walaupun pengguna di Malaysia
 * (diukur 16 Sep 2026). Jarak itu bukan dalam kawalan kod.
 *
 * Yang DALAM kawalan kita ialah apa yang berlaku dalam saat itu. Tanpa
 * apa-apa, klik kelihatan seperti tidak berfungsi dan orang menekannya lagi
 * — yang memulakan permintaan kedua dan menjadikannya lebih perlahan. Dengan
 * skrin ini, klik mendapat jawapan SERTA-MERTA.
 *
 * Ia dicetuskan pada `pointerdown`, bukan `click`: itu 100–150ms lebih awal,
 * dan pada peralihan yang panjang setiap milisaat yang kelihatan itu penting.
 * Pendengar dipasang pada `document` dalam fasa tangkapan supaya ia tetap
 * berjalan walaupun pautan itu menghentikan gelembung peristiwa.
 */

/**
 * Pautan yang MENINGGALKAN portal — iaitu pulang ke laman awam.
 *
 * URL mutlak, kerana portal boleh dibuka melalui DUA alamat: terus di
 * `portal.sktd.edu.my`, atau melalui proksi di `sktd.edu.my/portal`. Pautan
 * pulang ialah URL penuh dalam kedua-dua keadaan.
 */
const KELUAR = /^https?:\/\/(www\.)?sktd\.edu\.my\/?($|\?|#|[a-z])/i;

export default function Peralihan() {
  const [tunjuk, setTunjuk] = useState(false);

  useEffect(() => {
    const tekan = (e: PointerEvent) => {
      // Klik kanan, klik tengah, dan Cmd/Ctrl-klik membuka tab baharu —
      // halaman ini kekal, jadi menutupinya dengan skrin pemuat adalah
      // salah dan ia tidak akan pernah hilang.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const sasaran = (e.target as HTMLElement | null)?.closest("a");
      if (!sasaran) return;
      if (sasaran.target && sasaran.target !== "_self") return;
      if (sasaran.hasAttribute("download")) return;

      const href = sasaran.getAttribute("href") ?? "";
      if (!KELUAR.test(href)) return;
      setTunjuk(true);
    };

    // Kembali melalui butang "back" memaparkan halaman dari cache bfcache
    // dengan keadaan React yang SAMA — termasuk skrin pemuat yang tidak
    // pernah ditutup. `pageshow` ialah satu-satunya isyarat yang menangkapnya.
    const kembali = () => setTunjuk(false);

    document.addEventListener("pointerdown", tekan, true);
    window.addEventListener("pageshow", kembali);
    window.addEventListener("pagehide", kembali);
    return () => {
      document.removeEventListener("pointerdown", tekan, true);
      window.removeEventListener("pageshow", kembali);
      window.removeEventListener("pagehide", kembali);
    };
  }, []);

  // Jaring keselamatan: kalau navigasi dibatalkan atau gagal, skrin ini
  // tidak boleh menjadi dinding kekal.
  useEffect(() => {
    if (!tunjuk) return;
    const masa = window.setTimeout(() => setTunjuk(false), 12_000);
    return () => window.clearTimeout(masa);
  }, [tunjuk]);

  if (!tunjuk) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Membuka laman sekolah"
      // `pointer-events: none` WAJIB.
      //
      // Skrin ini muncul pada `pointerdown` — sebelum `click`. Tanpa baris
      // ini ia berada di bawah kursor menjelang `mouseup`, jadi `<a>` tidak
      // pernah menerima klik dan navigasi TIDAK BERLAKU. Hasilnya cincin
      // berputar selama-lamanya di halaman yang sama. Ia dilaporkan pengguna
      // pada 17 Sep 2026, dan ia pepijat yang SAMA seperti menutup menu
      // burger pada `pointerdown` dahulu: memindahkan elemen sebelum klik
      // selesai membatalkan klik itu.
      className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-navy-900/95 backdrop-blur-sm"
      style={{ animation: "sktd-masuk 160ms ease-out" }}
    >
      <style>{`
        @keyframes sktd-masuk { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sktd-pusing { to { transform: rotate(360deg) } }
        @media (prefers-reduced-motion: reduce) {
          .sktd-cincin { animation: none !important; opacity: .55 }
        }
      `}</style>

      <div className="relative grid h-32 w-32 place-items-center">
        {/* Cincin hijau mengelilingi logo. Ia lingkaran SEPARA supaya
            putarannya kelihatan — bulatan penuh yang berputar nampak statik. */}
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="sktd-cincin absolute inset-0 h-full w-full"
          style={{ animation: "sktd-pusing 900ms linear infinite" }}
        >
          <circle cx="50" cy="50" r="46" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="46" fill="none"
            stroke="#2fbf71" strokeWidth="4" strokeLinecap="round"
            strokeDasharray="80 209"
          />
        </svg>

        {/* eslint-disable-next-line @next/next/no-img-element --
            logo ini kecil dan dihidangkan dari laman awam; `next/image`
            tidak menambah apa-apa di sini. */}
        <img
          src="https://sktd.edu.my/logo-sktd.png"
          alt=""
          width={72}
          height={88}
          className="relative h-[72px] w-auto"
        />
      </div>

      <p className="mt-5 text-sm font-semibold tracking-wide text-white/80">
        Membuka laman sekolah…
      </p>
    </div>
  );
}
