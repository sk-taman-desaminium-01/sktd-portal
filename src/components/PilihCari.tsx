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

/** Huruf kecil tanpa tanda/ruang berganda — "4bestari" sepadan "4 BESTARI". */
function norm(t: string): string {
  return t.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export default function PilihCari({
  pilihan, nilai, tukar, label, placeholder = "Taip untuk cari…", id, disabled = false, sembunyiLabel = false,
}: {
  pilihan: PilihanCari[];
  nilai: string;
  tukar: (nilai: string) => void;
  label: string;
  placeholder?: string;
  id: string;
  disabled?: boolean;
  /** Label hanya untuk pembaca skrin (medan dalam jadual/baris padat). */
  sembunyiLabel?: boolean;
}) {
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState("");
  const [aktif, setAktif] = useState(0);
  const kotak = useRef<HTMLDivElement>(null);
  const medan = useRef<HTMLInputElement>(null);

  const dipilih = pilihan.find((p) => p.nilai === nilai);

  // SETIAP perkataan yang ditaip mesti ada (mana-mana susunan): "ros aini"
  // menjumpai "NOR AINI BINTI ROSLAN". Ruang juga diabaikan supaya "4b"
  // menjumpai "4 BESTARI".
  const ditapis = useMemo(() => {
    const kata = norm(cari).split(" ").filter(Boolean);
    if (kata.length === 0) return pilihan;
    return pilihan.filter((p) => {
      const teks = norm(`${p.label} ${p.nota ?? ""}`);
      const rapat = teks.replace(/ /g, "");
      return kata.every((k) => teks.includes(k) || rapat.includes(k));
    });
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
    if (pilihan.length <= 8) kotak.current?.querySelector<HTMLButtonElement>("[role=option]")?.focus();
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
    setAktif(0);
  }

  function kekunci(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setAktif((a) => Math.min(a + 1, ditapis.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAktif((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const p = ditapis[aktif]; if (p) pilih(p.nilai); }
  }

  return (
    <div ref={kotak} className="relative min-w-0">
      <label htmlFor={id} className={sembunyiLabel ? "sr-only" : "block text-xs font-semibold text-slate-500"}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setBuka((b) => !b)}
        aria-haspopup="listbox"
        aria-expanded={buka}
        className={`${sembunyiLabel ? "" : "mt-1 "}flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-garis bg-white px-3 py-2 text-left text-sm text-navy-800 hover:border-navy-700 disabled:opacity-60`}
      >
        <span className="min-w-0 truncate">
          {dipilih?.label ?? <span className="text-slate-500">Pilih…</span>}
        </span>
        <span aria-hidden="true" className="shrink-0 text-xs text-slate-500">▾</span>
      </button>

      {buka && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-garis bg-white shadow-lg">
          {/* Kotak carian disembunyikan bila senarainya pendek — mencari
              antara tiga perkara bukan masalah yang perlu diselesaikan. */}
          {pilihan.length > 8 && (
            <input
              ref={medan}
              value={cari}
              onChange={(e) => { setCari(e.target.value); setAktif(0); }}
              onKeyDown={kekunci}
              enterKeyHint="search"
              autoComplete="off"
              placeholder={placeholder}
              aria-label={`Cari ${label}`}
              className="w-full border-b border-garis px-3 py-2 text-sm outline-none"
            />
          )}
          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {ditapis.map((p, i) => (
              <li key={p.nilai}>
                <button
                  type="button"
                  role="option"
                  aria-selected={p.nilai === nilai}
                  onClick={() => pilih(p.nilai)}
                  onMouseEnter={() => setAktif(i)}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-navy-50 ${
                    p.nilai === nilai ? "bg-navy-50 font-semibold text-navy-800" : i === aktif && cari ? "bg-slate-100 text-slate-800" : "text-slate-700"
                  }`}
                >
                  {p.label}
                  {p.nota && <span className="mt-0.5 block text-xs text-slate-500">{p.nota}</span>}
                </button>
              </li>
            ))}
            {cari && ditapis.length > 0 && (
              <li className="sticky bottom-0 border-t border-garis bg-white px-3 py-1 text-[11px] text-slate-500">{ditapis.length} padanan · Enter untuk pilih</li>
            )}
            {ditapis.length === 0 && (
              <li className="px-3 py-3 text-sm text-slate-500">Tiada yang sepadan.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
