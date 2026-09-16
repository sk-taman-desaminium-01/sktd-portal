"use client";

import { useEffect } from "react";

/**
 * Sempadan ralat untuk seluruh bahagian /admin.
 *
 * KENAPA: bila render Server Component gagal dalam binaan produksi, React
 * menyembunyikan mesej sebenar dan memberi "Minified React error #441"
 * sahaja — supaya butiran sensitif tidak bocor. Itu betul, tetapi ia
 * bermakna admin sekolah melihat teks yang tidak membawa apa-apa makna dan
 * tidak tahu sama ada kerja mereka tersimpan atau tidak.
 *
 * Skrin ini menggantikannya dengan sesuatu yang boleh ditindaklanjuti: apa
 * yang berlaku, apa yang TIDAK berlaku kepada data mereka, dan `digest` —
 * rujukan yang memadankan ralat ini dengan entri penuhnya dalam log pelayan.
 */
export default function RalatAdmin({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Peraturan #4: jangan telan. Dalam pelayar, konsol ialah satu-satunya
    // tempat butiran ini boleh dilihat semasa menyiasat.
    console.error("[admin] ralat render:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-2xl font-bold text-navy-800">Skrin ini gagal dimuat</h1>

      <div className="mt-5 rounded-xl border border-[#e7bcbc] bg-[#fbeaea] p-5">
        <p className="text-sm leading-relaxed text-[#8f2424]">
          Sesuatu gagal di pelayan semasa menyediakan halaman ini. Kandungan
          dan senarai akses anda <b>tidak diubah</b> oleh kegagalan ini — ia
          berlaku semasa memapar, bukan semasa menyimpan.
        </p>
        {error.digest && (
          <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 font-mono text-xs text-[#6b1c1c]">
            Rujukan: {error.digest}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700"
        >
          Cuba lagi
        </button>
        <a
          href="/portal/admin"
          className="rounded-lg border border-garis px-4 py-2.5 text-sm font-semibold text-navy-700 hover:border-navy-700"
        >
          Urus Laman
        </a>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Kalau ia berulang, beritahu nombor rujukan di atas — itu yang
        memadankan kegagalan ini dengan butiran penuhnya dalam log pelayan.
      </p>
    </main>
  );
}
