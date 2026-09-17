"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { kiraBelumBaca } from "@/lib/tindakan-notifikasi";

/**
 * Loceng notifikasi.
 *
 * Kiraan dibaca sekali semasa dipasang, dan sekali lagi setiap kali tab
 * kembali menjadi tumpuan. TIADA tinjauan berkala: portal sekolah dibuka
 * oleh 130 orang sepanjang hari, dan menyoal pelayan setiap sepuluh saat
 * bagi setiap seorang menukar kiraan loceng menjadi beban terbesar sistem.
 * Guru yang kembali ke tab melihat kiraan yang betul, dan itu memadai.
 */
export default function Loceng() {
  const [bil, setBil] = useState(0);

  useEffect(() => {
    let hidup = true;
    const kira = () => {
      void kiraBelumBaca().then((n) => { if (hidup) setBil(n); });
    };
    kira();
    const bila = () => { if (document.visibilityState === "visible") kira(); };
    document.addEventListener("visibilitychange", bila);
    return () => { hidup = false; document.removeEventListener("visibilitychange", bila); };
  }, []);

  return (
    <Link
      href="/notifikasi"
      aria-label={bil > 0 ? `Notifikasi — ${bil} belum dibaca` : "Notifikasi"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-white/70 ring-1 ring-white/15 transition hover:bg-white/10 hover:text-white"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"
        fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {bil > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 min-w-[18px] rounded-full bg-[#c2410c] px-1 text-center text-[10px] font-bold leading-[18px] text-white"
        >
          {bil > 99 ? "99+" : bil}
        </span>
      )}
    </Link>
  );
}
