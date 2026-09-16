"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Butang muat turun — IKON SAHAJA.
 *
 * Keputusan pengguna (16 Sep 2026): "letak icon je untuk kekemasan… tak
 * bertindan dan tak kelihatan berserabut." Maka butang ini 36px persegi,
 * duduk dalam baris tajuk kad (bukan terapung di atas kandungan), dan
 * menyembunyikan pilihan formatnya sehingga ditekan.
 *
 * Ia TETAP boleh dibaca pembaca skrin dan tetap ada tooltip — ikon tanpa nama
 * kemas untuk yang nampak dan tiada langsung untuk yang tidak.
 */

export interface PilihanTurun {
  label: string;
  nota?: string;
  jalan: () => void | Promise<void>;
}

export default function MuatTurun({
  pilihan, tajuk = "Muat turun",
}: {
  pilihan: PilihanTurun[];
  tajuk?: string;
}) {
  const [buka, setBuka] = useState(false);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const kotak = useRef<HTMLDivElement>(null);

  // Tutup bila klik di luar atau tekan Escape. Tanpa ini menu tergantung
  // terbuka dan bertindan dengan kandungan di bawahnya — persis yang
  // pengguna minta dielakkan.
  useEffect(() => {
    if (!buka) return;
    const luar = (e: PointerEvent) => {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false);
    };
    const kunci = (e: KeyboardEvent) => { if (e.key === "Escape") setBuka(false); };
    document.addEventListener("pointerdown", luar);
    document.addEventListener("keydown", kunci);
    return () => {
      document.removeEventListener("pointerdown", luar);
      document.removeEventListener("keydown", kunci);
    };
  }, [buka]);

  async function pilih(p: PilihanTurun) {
    setSibuk(p.label);
    try {
      await p.jalan();
      setBuka(false);
    } finally {
      setSibuk(null);
    }
  }

  // Satu pilihan sahaja? Jangan buat menu untuk satu perkara.
  if (pilihan.length === 1) {
    return (
      <button
        type="button"
        onClick={() => void pilih(pilihan[0])}
        title={`${tajuk} — ${pilihan[0].label}`}
        aria-label={`${tajuk} — ${pilihan[0].label}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-garis text-navy-700 transition hover:border-navy-700 hover:bg-navy-50 disabled:opacity-50"
        disabled={sibuk !== null}
      >
        <Ikon sibuk={sibuk !== null} />
      </button>
    );
  }

  return (
    <div ref={kotak} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        title={tajuk}
        aria-label={tajuk}
        aria-haspopup="menu"
        aria-expanded={buka}
        className="grid h-9 w-9 place-items-center rounded-lg border border-garis text-navy-700 transition hover:border-navy-700 hover:bg-navy-50"
      >
        <Ikon sibuk={sibuk !== null} />
      </button>

      {buka && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-garis bg-white shadow-lg"
        >
          {pilihan.map((p) => (
            <button
              key={p.label}
              role="menuitem"
              onClick={() => void pilih(p)}
              disabled={sibuk !== null}
              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-navy-50 disabled:opacity-50"
            >
              <span className="font-semibold text-navy-800">
                {sibuk === p.label ? "Menyediakan…" : p.label}
              </span>
              {p.nota && <span className="mt-0.5 block text-xs text-slate-500">{p.nota}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Ikon({ sibuk }: { sibuk: boolean }) {
  if (sibuk) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="animate-spin">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
        <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5v8.5m0 0L4.75 6.75M8 10l3.25-3.25"
        fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 11.5v1.5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-1.5"
        fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------- penolong */

/** Turunkan teks sebagai fail. Dipanggil dari pengendali klik pengguna. */
export function turunkanTeks(nama: string, isi: string, jenis = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([isi], { type: jenis }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Dilepaskan lewat: Safari membatalkan muat turun bila objek URL
  // dibatalkan terlalu awal.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Baris CSV yang selamat — petikan dan koma dalam nama tidak merosakkannya. */
export function barisCsv(sel: (string | number)[]): string {
  return sel
    .map((c) => {
      const t = String(c ?? "");
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    })
    .join(",");
}
