"use client";

import { useState } from "react";
import { janaDrafTakwim, simpanDrafTakwim } from "@/lib/tindakan-umum";
import { NAMA_KATEGORI, type KumpulanMasa, type DrafUmum } from "@/data/umum-takwim";

/**
 * DRAF PENGUMUMAN dari takwim.
 *
 * Takwim sekolah sudah mengandungi setiap tarikh yang ibu bapa perlu tahu.
 * Menaip semula setiap satu sebagai pengumuman ialah kerja yang sistem
 * sepatutnya buat — tetapi keputusan APA yang diumumkan kekal milik manusia,
 * kerana takwim tidak menulis konteks yang sekolah tahu.
 *
 * Jadi: sistem mencadangkan dan mengarang, manusia memilih dan menerbitkan.
 */
export default function DrafTakwim() {
  const [kumpulan, setKumpulan] = useState<KumpulanMasa[] | null>(null);
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [sudahAda, setSudahAda] = useState<Set<string>>(new Set());
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [buka, setBuka] = useState(false);

  async function jana() {
    setSibuk(true);
    setNota(null);
    try {
      const r = await janaDrafTakwim();
      setNota({ ok: r.ok, teks: r.mesej });
      setKumpulan(r.kumpulan ?? null);
      setSudahAda(new Set(r.sudahAda ?? []));
      // Pilihan awal ialah SYOR sistem: akan datang dan disyorkan sahaja.
      // Yang sudah wujud tidak dipilih — menciptanya semula tidak berguna.
      const awal = new Set<string>();
      for (const k of r.kumpulan ?? []) {
        if (k.masa === "berlalu") continue;
        for (const d of k.draf) {
          if (d.disyorkan && !(r.sudahAda ?? []).includes(d.kunci)) awal.add(d.kunci);
        }
      }
      setPilih(awal);
    } finally {
      setSibuk(false);
    }
  }

  async function simpan() {
    setSibuk(true);
    try {
      const r = await simpanDrafTakwim([...pilih]);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setSudahAda((s) => new Set([...s, ...pilih]));
        setPilih(new Set());
      }
    } finally {
      setSibuk(false);
    }
  }

  function togol(kunci: string) {
    setPilih((s) => {
      const b = new Set(s);
      if (b.has(kunci)) b.delete(kunci); else b.add(kunci);
      return b;
    });
  }

  return (
    <section className="mt-6 rounded-2xl border border-garis bg-white p-4 sm:p-5">
      <button
        onClick={() => setBuka((b) => !b)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold text-navy-800">
            Draf pengumuman dari takwim
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
            Sistem membaca takwim, memilih acara yang melibatkan ibu bapa, dan
            mengarang ayatnya. Semuanya disimpan sebagai <b>draf</b> — tiada apa
            yang terbit sehingga anda menerbitkannya.
          </span>
        </span>
        <span className="shrink-0 text-xs text-slate-500">{buka ? "▴" : "▾"}</span>
      </button>

      {buka && (
        <div className="mt-4 border-t border-garis pt-4">
          {nota && (
            <p
              className={`mb-3 rounded-lg border p-2.5 text-xs leading-relaxed ${
                nota.ok
                  ? "border-[#c6e2d1] bg-[#eef8f2] text-[#167a4b]"
                  : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
              }`}
            >
              {nota.teks}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void jana()}
              disabled={sibuk}
              className="rounded-lg border border-navy-700 px-4 py-2 text-xs font-semibold text-navy-700 disabled:opacity-50"
            >
              {sibuk && !kumpulan ? "Membaca takwim…" : "Baca takwim"}
            </button>
            {kumpulan && (
              <button
                onClick={() => void simpan()}
                disabled={sibuk || pilih.size === 0}
                className="rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                {sibuk ? "…" : `Simpan ${pilih.size} draf`}
              </button>
            )}
          </div>

          {kumpulan?.map((k) => (
            <div key={k.masa} className="mt-5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-emas-gelap">
                {k.label} · {k.draf.length}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">{k.nota}</p>

              <ul className="mt-2 space-y-1.5">
                {k.draf.map((d) => (
                  <Baris
                    key={d.kunci}
                    d={d}
                    lalu={k.masa === "berlalu"}
                    dipilih={pilih.has(d.kunci)}
                    wujud={sudahAda.has(d.kunci)}
                    togol={() => togol(d.kunci)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Baris({ d, lalu, dipilih, wujud, togol }: {
  d: DrafUmum;
  lalu: boolean;
  dipilih: boolean;
  wujud: boolean;
  togol: () => void;
}) {
  return (
    <li
      className={`rounded-lg border p-2.5 ${
        // Hijau = tarikh telah berlalu, selesai. Sama seperti kad Takwim,
        // supaya warna itu bermaksud perkara yang sama di kedua-dua skrin.
        lalu
          ? "border-[#cfe9db] bg-[#f2faf5]"
          : dipilih
            ? "border-navy-700 bg-navy-50/50"
            : "border-garis"
      }`}
    >
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={dipilih}
          onChange={togol}
          disabled={wujud}
          className="mt-0.5 shrink-0"
          aria-label={`Pilih ${d.tajuk}`}
        />
        <span className="min-w-0 flex-1">
          <span className={`block text-xs leading-relaxed ${lalu ? "text-[#2f7d57]" : "text-navy-800"}`}>
            {lalu && <span aria-hidden="true" className="mr-1">✓</span>}
            {d.ayat}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
            <span className="rounded bg-navy-50 px-1.5 py-0.5 font-semibold text-navy-700">
              {NAMA_KATEGORI[d.kategori]}
            </span>
            {wujud ? (
              <span className="text-slate-500">Sudah ada sebagai pos</span>
            ) : d.disyorkan ? (
              <span className="text-[#167a4b]">Disyorkan · {d.sebab}</span>
            ) : (
              <span className="text-slate-500">{d.sebab}</span>
            )}
          </span>
        </span>
      </label>
    </li>
  );
}
