"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Bar navigasi bawah portal — hanya bila portal dipasang sebagai app.
 *
 * Sama sebabnya seperti di laman awam: tanpa bar alamat dan butang belakang,
 * app yang dipasang terasa seperti penanda buku. Bezanya di sini, tab
 * "Pentadbiran" hanya wujud untuk yang berkuasa — dan keputusan itu dibuat
 * di PELAYAN dan dihantar sebagai prop, bukan dikira dalam pelayar.
 */

type Tab = { href: string; nama: string; d: string };

/**
 * eRPM SENGAJA tidak berada di sini. Dengan tiga tab, butang bulat di tengah
 * tidak pernah jatuh betul-betul di tengah bar — ia kelihatan senget. eRPM
 * masih satu ketukan sahaja: ia kad dalam bahagian Kurikulum di hab.
 */
const TAB: Tab[] = [
  { href: "/", nama: "Hab", d: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" },
];

/**
 * Butang timbul di tengah — kembali ke laman sekolah.
 *
 * URL MUTLAK, bukan "/": bila portal dibuka melalui `portal.sktd.edu.my`,
 * "/" akan melencong semula ke `/portal` (lihat `redirects()` dalam
 * next.config.ts) dan pengguna terperangkap dalam gelung. Dari
 * `sktd.edu.my/portal` pula, URL mutlak ini SAMA-ASAL, jadi app yang
 * dipasang tidak melompat keluar ke pelayar.
 */
const LAMAN = "https://sktd.edu.my/";

const TAB_ADMIN: Tab = {
  href: "/admin", nama: "Urus", d: "M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6",
};

export default function BarBawahPortal({ bolehAdmin }: { bolehAdmin: boolean }) {
  const [dipasang, setDipasang] = useState(false);
  const laluan = usePathname();

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const semak = () =>
      setDipasang(
        mq.matches ||
          (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
      );
    semak();
    mq.addEventListener("change", semak);
    return () => mq.removeEventListener("change", semak);
  }, []);

  // Jangan papar pada pintu masuk — tiada apa untuk dinavigasi sebelum log masuk.
  if (!dipasang || laluan.startsWith("/masuk")) return null;

  const tab = bolehAdmin ? [...TAB, TAB_ADMIN] : TAB;

  // Bahagi tab kepada dua belah yang sama banyak; belah yang kurang diisi
  // dengan slot kosong supaya butang bulat kekal di tengah.
  const separuh = Math.ceil(tab.length / 2);
  const kiri: (Tab | null)[] = tab.slice(0, separuh);
  const kanan: (Tab | null)[] = tab.slice(separuh);
  while (kanan.length < kiri.length) kanan.push(null);
  while (kiri.length < kanan.length) kiri.unshift(null);

  const butangTab = (t: Tab | null, i: number) => {
    if (!t) return <li key={`kosong-${i}`} className="flex-1" aria-hidden="true" />;
    const aktif = t.href === "/" ? laluan === "/" : laluan.startsWith(t.href);
    return (
      <li key={t.href} className="flex-1">
        <Link
          href={t.href}
          aria-current={aktif ? "page" : undefined}
          className={`flex h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
            aktif ? "text-emas-muda" : "text-white/45"
          }`}
        >
          <svg
            viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]"
            fill="none" stroke="currentColor" strokeWidth={aktif ? 2.2 : 1.8}
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d={t.d} />
          </svg>
          {t.nama}
        </Link>
      </li>
    );
  };

  return (
    <>
      <div aria-hidden="true" className="h-[calc(60px+env(safe-area-inset-bottom))]" />
      <nav
        aria-label="Navigasi app"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-900/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* SUSUN ATUR: tab kiri | butang bulat | tab kanan.
            Kedua-dua belah diberi bilangan slot yang SAMA — slot kosong
            ditambah bila perlu — supaya bulatan itu jatuh betul-betul di
            tengah tidak kira sama ada pengguna nampak tab "Urus" atau tidak.
            Versi sebelum ini menyisipkan butang pada indeks yang dikira, dan
            ia kelihatan senget setiap kali bilangan tab ganjil. */}
        <ul className="mx-auto flex max-w-lg items-end">
          {kiri.map(butangTab)}
          <ButangLaman />
          {kanan.map(butangTab)}
        </ul>
      </nav>
    </>
  );
}

/** Butang bulat timbul: kembali ke laman sekolah. */
function ButangLaman() {
  return (
    <li className="w-16 shrink-0">
      <a
        href={LAMAN}
        className="flex h-[60px] flex-col items-center justify-end gap-1 text-[10px] font-semibold text-emas-muda"
      >
        <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-emas text-navy-900 shadow-lg ring-4 ring-navy-900">
          <svg
            viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />
          </svg>
        </span>
        Laman
      </a>
    </li>
  );
}
