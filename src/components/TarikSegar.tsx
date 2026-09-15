"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tarik-untuk-segarkan (pull to refresh) — untuk app yang DIPASANG sahaja.
 *
 * KENAPA PERLU DITULIS SENDIRI: dalam pelayar biasa, Chrome dan Safari sudah
 * memberi gerak isyarat ini secara percuma. Tetapi sebaik laman dipasang
 * sebagai app (`display-mode: standalone`), bar pelayar hilang — dan bersama
 * ia, tarik-untuk-segarkan hilang juga. Pengguna yang biasa menariknya
 * mendapati app "beku" dengan kandungan lama dan tiada cara jelas untuk
 * memuat semula. Jadi kita kembalikan gerak isyarat itu.
 *
 * Sebab itu juga ia HANYA dipasang dalam mod standalone: kalau tidak, ia akan
 * bertindih dengan gerak isyarat pelayar sendiri dan pengguna akan merasakan
 * dua tarikan.
 *
 * Tiga perkara yang mesti dijaga, kalau tidak ia merosakkan skrol biasa:
 *  1. Hanya bermula bila halaman BENAR-BENAR di atas sekali.
 *  2. Hanya bila jari bergerak lebih menegak daripada mendatar — kalau tidak,
 *     ia merampas leretan mendatar jalur aktiviti.
 *  3. Rintangan: 100px jari = ~50px tarikan, supaya ia terasa berat dan tidak
 *     tercetus secara tidak sengaja.
 */

const HAD = 70;        // px tarikan sebelum ia benar-benar menyegarkan
const MAKS = 110;      // px tarikan maksimum yang dipaparkan

export default function TarikSegar() {
  const [tarik, setTarik] = useState(0);
  const [segar, setSegar] = useState(false);
  const mula = useRef<{ y: number; x: number } | null>(null);
  const aktif = useRef(false);

  useEffect(() => {
    const dipasang =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!dipasang) return;

    const kurangGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const padaMula = (e: TouchEvent) => {
      if (segar) return;
      // Hanya bila di atas sekali. `scrollY` boleh jadi negatif sedikit pada
      // iOS semasa lantunan, jadi guna <= 0.
      if (window.scrollY > 0) return;
      const t = e.touches[0];
      mula.current = { y: t.clientY, x: t.clientX };
      aktif.current = false;
    };

    const padaGerak = (e: TouchEvent) => {
      if (!mula.current || segar) return;
      const t = e.touches[0];
      const dy = t.clientY - mula.current.y;
      const dx = t.clientX - mula.current.x;

      if (dy <= 0) {                 // menarik ke atas = skrol biasa
        mula.current = null;
        setTarik(0);
        return;
      }
      if (!aktif.current) {
        // Tentukan sekali sahaja: ini tarikan menegak, atau leretan mendatar?
        if (Math.abs(dx) > Math.abs(dy)) { mula.current = null; return; }
        if (dy < 8) return;          // belum cukup untuk memutuskan
        aktif.current = true;
      }

      // Rintangan: semakin jauh ditarik, semakin berat.
      const jarak = Math.min(MAKS, dy * 0.5);
      setTarik(jarak);

      // Halang lantunan/overscroll pelayar supaya hanya penunjuk kita bergerak.
      if (e.cancelable) e.preventDefault();
    };

    const padaTamat = () => {
      if (!mula.current) { setTarik(0); return; }
      mula.current = null;
      if (!aktif.current) { setTarik(0); return; }
      aktif.current = false;

      setTarik((t) => {
        if (t >= HAD) {
          setSegar(true);
          // Biar bingkai penunjuk sempat dilukis sebelum halaman dibekukan
          // oleh muat semula — kalau tidak, tiada maklum balas langsung.
          window.setTimeout(() => window.location.reload(), kurangGerak ? 0 : 150);
          return HAD;
        }
        return 0;
      });
    };

    // `passive: false` kerana `padaGerak` memanggil preventDefault().
    window.addEventListener("touchstart", padaMula, { passive: true });
    window.addEventListener("touchmove", padaGerak, { passive: false });
    window.addEventListener("touchend", padaTamat, { passive: true });
    window.addEventListener("touchcancel", padaTamat, { passive: true });
    return () => {
      window.removeEventListener("touchstart", padaMula);
      window.removeEventListener("touchmove", padaGerak);
      window.removeEventListener("touchend", padaTamat);
      window.removeEventListener("touchcancel", padaTamat);
    };
  }, [segar]);

  if (tarik === 0 && !segar) return null;

  const kemajuan = Math.min(1, tarik / HAD);
  const sedia = kemajuan >= 1;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{
        transform: `translateY(${tarik - 44}px)`,
        // Tiada peralihan semasa jari masih menarik — ia mesti mengikut jari.
        transition: segar ? "transform 150ms ease-out" : "none",
      }}
    >
      <span
        className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy-700 shadow-lg ring-1 ring-black/5"
        style={{ opacity: Math.max(0.35, kemajuan) }}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 ${segar ? "sktd-pusing" : ""}`}
          style={{ transform: segar ? undefined : `rotate(${kemajuan * 270}deg)` }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {/* Lengkok terbuka + mata panah = ikon segar semula yang biasa. */}
          <path d="M20 12a8 8 0 1 1-2.34-5.66" />
          <path d="M20 4v4.5h-4.5" />
        </svg>
      </span>
      <span className="sr-only">
        {segar ? "Menyegarkan…" : sedia ? "Lepas untuk menyegarkan" : "Tarik untuk menyegarkan"}
      </span>
    </div>
  );
}
