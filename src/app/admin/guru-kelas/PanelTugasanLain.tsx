"use client";

import { useState } from "react";
import { tetapTugasan, buangTugasan, type BarisTugasan, type JenisTugasan } from "@/lib/tugasan";
import PilihCari from "@/components/PilihCari";

/**
 * Tugasan yang BUKAN guru kelas — guru RMT, guru disiplin, pengurus pasukan.
 *
 * Satu komponen, tiga jenis (permintaan pengguna D.1/E.1/3.1): bentuknya
 * sama — nama orang + nama skop — jadi tiga skrin berasingan untuk kerja
 * yang sama ialah kerja berulang yang tidak perlu.
 */
export default function PanelTugasanLain({
  jenis, tajuk, ringkas, placeholderSkop, awal, orang, skopTunggal,
}: {
  jenis: JenisTugasan;
  tajuk: string;
  ringkas: string;
  placeholderSkop: string;
  awal: BarisTugasan[];
  orang: { id: string; nama: string; emel: string | null }[];
  /** Benar untuk guru_rmt/guru_disiplin — satu skop sahaja ("SEKOLAH"), tiada
   *  medan nama skop dipapar. Palsu untuk pengurus_pasukan — skop = nama pasukan. */
  skopTunggal?: boolean;
}) {
  const [senarai, setSenarai] = useState(awal);
  const [guruId, setGuruId] = useState("");
  const [skop, setSkop] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [mesej, setMesej] = useState<string | null>(null);

  async function tambah() {
    if (!guruId) return;
    setSibuk(true);
    setMesej(null);
    const r = await tetapTugasan(jenis, guruId, skopTunggal ? "SEKOLAH" : skop);
    if (r.ok) {
      const g = orang.find((o) => o.id === guruId);
      setSenarai((s) => [
        ...s.filter((b) => b.skop !== (skopTunggal ? "SEKOLAH" : skop.trim() || "SEKOLAH")),
        { guru_id: guruId, nama: g?.nama ?? "", emel: g?.emel ?? null, skop: skopTunggal ? "SEKOLAH" : (skop.trim() || "SEKOLAH") },
      ]);
      setGuruId("");
      setSkop("");
    }
    setMesej(r.mesej);
    setSibuk(false);
  }

  async function buang(s: string) {
    setSibuk(true);
    const r = await buangTugasan(jenis, s);
    if (r.ok) setSenarai((sn) => sn.filter((b) => b.skop !== s));
    setMesej(r.mesej);
    setSibuk(false);
  }

  return (
    <section className="mt-8 rounded-xl border border-garis bg-white p-5">
      <h2 className="text-base font-bold text-navy-800">{tajuk}</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{ringkas}</p>

      {senarai.length > 0 && (
        <ul className="mt-4 space-y-2">
          {senarai.map((b) => (
            <li key={b.skop} className="flex items-center justify-between gap-3 rounded-lg border border-garis px-3 py-2 text-sm">
              <span>
                <b>{b.nama}</b>
                {!skopTunggal && <span className="text-slate-500"> — {b.skop}</span>}
              </span>
              <button
                type="button" disabled={sibuk} onClick={() => buang(b.skop)}
                className="text-xs text-[#8f2424] underline disabled:opacity-50"
              >
                Buang
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="min-w-[12rem] flex-1">
          <PilihCari
            id={`tugasan-${jenis}`} label="Pilih orang" sembunyiLabel
            nilai={guruId} tukar={setGuruId} placeholder="Taip nama guru…"
            pilihan={orang.map((o) => ({ nilai: o.id, label: o.nama }))}
          />
        </div>
        {!skopTunggal && (
          <input
            value={skop} onChange={(e) => setSkop(e.target.value)}
            placeholder={placeholderSkop}
            className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-2 text-sm"
          />
        )}
        <button
          type="button" disabled={sibuk || !guruId} onClick={tambah}
          className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Tambah
        </button>
      </div>
      {mesej && <p className="mt-2 text-xs text-slate-500">{mesej}</p>}
    </section>
  );
}
