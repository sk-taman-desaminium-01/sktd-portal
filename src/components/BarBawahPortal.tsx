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

const TAB: Tab[] = [
  { href: "/", nama: "Hab", d: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" },
  { href: "/erpm", nama: "eRPM", d: "M4 5h11l5 5v9H4zM15 5v5h5M8 14h8M8 17h5" },
];

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

  return (
    <>
      <div aria-hidden="true" className="h-[calc(60px+env(safe-area-inset-bottom))]" />
      <nav
        aria-label="Navigasi app"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-900/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-lg">
          {tab.map((t) => {
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
          })}
        </ul>
      </nav>
    </>
  );
}
