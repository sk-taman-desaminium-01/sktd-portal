"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Sempadan ralat SELURUH PORTAL.
 *
 * Sebelum ini hanya `/admin` ada sempadan sendiri. Mana-mana kegagalan di
 * luar itu — Disiplin, RMT, Borang, ePBD — jatuh kepada skrin lalai Next,
 * yang dalam binaan produksi hanyalah "Application error: a client-side
 * exception has occurred". Bagi guru itu skrin putih tanpa makna: mereka
 * tidak tahu sama ada kerja mereka tersimpan, dan tiada jalan ke hadapan.
 *
 * Skrin ini memberi tiga perkara: apa yang berlaku, apa yang TIDAK berlaku
 * kepada data mereka, dan `digest` untuk dipadankan dengan log pelayan.
 */
export default function RalatPortal({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[portal] ralat render:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-5 py-12">
      <div className="rounded-2xl border border-[#e9d9ae] bg-[#fdf9f0] p-6">
        <h1 className="text-xl font-bold text-navy-800">Halaman ini tidak dapat dipaparkan</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#7a5a12]">
          Sesuatu gagal semasa memuat halaman ini. <b>Tiada data anda yang hilang</b> —
          apa yang sudah disimpan sebelum ini kekal seperti biasa.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button" onClick={reset}
            className="min-h-11 rounded-lg bg-navy-800 px-4 text-sm font-semibold text-white"
          >
            Cuba muat semula
          </button>
          <Link
            href="/"
            className="min-h-11 rounded-lg border border-navy-700 px-4 py-2.5 text-sm font-semibold text-navy-700"
          >
            Kembali ke Portal
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-slate-500">
            Kalau ia berulang, beritahu admin kod ini: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
    </main>
  );
}
