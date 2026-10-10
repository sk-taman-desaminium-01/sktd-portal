"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * `<Link>` portal: pramuat hanya bila pengguna MENUNJUKKAN MINAT.
 *
 * `<Link>` biasa memramuat setiap pautan sebaik ia masuk ke skrin. Diukur
 * dalam Chrome berlog masuk (11 Okt 2026): hab menghantar 6 permintaan
 * pramuat sebelum apa-apa disentuh, Urus Laman 10, Urusan Pejabat lebih
 * daripada itu — dua permintaan bagi setiap pautan, untuk halaman yang
 * kebanyakannya tidak dibuka. Setiap satu dikira terhadap had harian Worker
 * Cloudflare (100,000) DAN had bulanan Vercel (1,000,000; lebih = portal
 * digantung 30 hari). Pada 150 kakitangan yang aktif, pramuat sahaja boleh
 * menghabiskan had Vercel.
 *
 * Di sini pramuat bermula bila kursor menyentuh pautan, jari menyentuhnya,
 * atau papan kekunci sampai padanya — kira-kira 200 ms sebelum klik. Halaman
 * yang hendak dibuka tetap terasa serta-merta; yang tidak dibuka tidak lagi
 * memakan kuota. Corak ini dari dokumen Next sendiri
 * (docs/01-app/02-guides/prefetching.md, "prefetch only on hover").
 *
 * `prefetch` yang ditulis jelas pada pautan DIHORMATI: halaman awam menulis
 * `prefetch={false}` dan kekal begitu.
 *
 * SEMUA fail mengimport ini, bukan "next/link" — `uji:kuota` menguatkuasakannya.
 */
export default function Pautan({
  prefetch, onMouseEnter, onTouchStart, onFocus, ...lain
}: ComponentProps<typeof Link>) {
  const [berminat, setBerminat] = useState(false);
  return (
    <Link
      {...lain}
      prefetch={prefetch !== undefined ? prefetch : berminat ? null : false}
      onMouseEnter={(e) => { setBerminat(true); onMouseEnter?.(e); }}
      onTouchStart={(e) => { setBerminat(true); onTouchStart?.(e); }}
      onFocus={(e) => { setBerminat(true); onFocus?.(e); }}
    />
  );
}
