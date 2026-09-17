"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Pemilih yang boleh DICARI.
 *
 * `<select>` biasa memaksa pengguna menatal 57 kelas atau 130 nama guru
 * dengan ibu jari. Pada telefon senarai itu menjadi roda yang panjang, dan
 * memilih kelas yang salah berlaku sekurang-kurangnya sekali setiap sesi.
 *
 * Komponen ini kekal sebagai satu medan sehingga ditekan; barulah ia membuka
 * kotak carian dan senarai yang menapis semasa menaip. Bila pilihannya
 * sedikit (lapan atau kurang) ia tidak menunjukkan kotak carian langsung —
 * mencari antara tiga perkara bukan masalah yang perlu diselesaikan.
 */

export interface PilihanCari {
  nilai: string;
  label: string;
  /** Baris kedua yang lebih kecil — emel, bilangan murid, dan seumpamanya. */
  nota?: string;
}

export default function PilihCari({
  pilihan, nilai, tukar, label, placeholder = "Cari…", id,
}: {
  pilihan: PilihanCari[];
  nilai: string;
  tukar: (nilai: string) => void;
  label: string;
  placeholder?: string;
  id: string;
}) {
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState("");
  const kotak = useRef<HTMLDivElement>(null);
  const medan = useRef<HTMLInputElement>(null);

  const dipilih = pilihan.find((p) => p.nilai === nilai);

  const ditapis = useMemo(() => {
    const t = cari.trim().toLowerCase();
    if (!t) return pilihan;
    return pilihan.filter(
      (p) =>
        p.label.toLowerCase().includes(t) || (p.nota ?? "").toLowerCase().includes(t),
    );
  }, [pilihan, cari]);

  useEffect(() => {
    if (!buka) return;
    medan.current?.focus();
    const luar = (e: PointerEvent) => {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false);
    };
    const kunci = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("pointerdown", luar);
    document.addEventListener("keydown", kunci);
    return () => {
      document.removeEventListener("pointerdown", luar);
      document.removeEventListener("keydown", kunci);
    };
  }, [buka]);

  function pilih(v: string) {
    tukar(v);
    setBuka(false);
    setCari("");
  }

  return (
    <div ref={kotak} className="relative min-w-0">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-500">
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-haspopup="listbox"
        aria-expanded={buka}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-garis bg-white px-3 py-2 text-left text-sm text-navy-800 hover:border-navy-700"
      >
        <span className="min-w-0 truncate">
          {dipilih?.label ?? <span className="text-slate-400">Pilih…</span>}
        </span>
        <span aria-hidden="true" className="shrink-0 text-xs text-slate-400">▾</span>
      </button>

      {buka && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-garis bg-white shadow-lg">
          {/* Kotak carian disembunyikan bila senarainya pendek — mencari
              antara tiga perkara bukan masalah yang perlu diselesaikan. */}
          {pilihan.length > 8 && (
            <input
              ref={medan}
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder={placeholder}
              aria-label={`Cari ${label}`}
              className="w-full border-b border-garis px-3 py-2 text-sm outline-none"
            />
          )}
          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {ditapis.map((p) => (
              <li key={p.nilai}>
                <button
                  type="button"
                  role="option"
                  aria-selected={p.nilai === nilai}
                  onClick={() => pilih(p.nilai)}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-navy-50 ${
                    p.nilai === nilai ? "bg-navy-50 font-semibold text-navy-800" : "text-slate-700"
                  }`}
                >
                  {p.label}
                  {p.nota && <span className="mt-0.5 block text-xs text-slate-400">{p.nota}</span>}
                </button>
              </li>
            ))}
            {ditapis.length === 0 && (
              <li className="px-3 py-3 text-sm text-slate-500">Tiada yang sepadan.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
