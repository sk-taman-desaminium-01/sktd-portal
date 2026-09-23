"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import { tetapkanRujukan, tolakSuratRasmi, type BarisSurat, type DataSuratRasmi } from "@/lib/surat";
import CetakSurat, { type KepalaSurat } from "@/components/CetakSurat";

/**
 * Peti masuk Urusan Pejabat — kerani/pentadbir/admin isi nombor rujukan
 * kami bagi setiap surat rasmi (permintaan B.3).
 */
export default function PanelPejabat({ senarai, kepala }: { senarai: BarisSurat[]; kepala: KepalaSurat }) {
  const [data, setData] = useState(senarai);
  const [rujukan, setRujukan] = useState<Record<string, string>>({});
  const [komen, setKomen] = useState<Record<string, string>>({});
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [cetak, setCetak] = useState<BarisSurat | null>(null);
  const [nota, setNota] = useState<Record<string, { ok: boolean; teks: string }>>({});

  function bukaCetak(baris: BarisSurat) {
    // Safari hanya membenarkan dialog cetak yang datang terus daripada klik.
    flushSync(() => setCetak(baris));
    mulaCetak("surat-cetak", baris.tajuk);
  }

  async function simpan(id: string) {
    try {
      const nilai = rujukan[id]?.trim();
      if (!nilai) return;
      setSibuk(id);
      const r = await tetapkanRujukan(id, nilai);
      setNota((n) => ({ ...n, [id]: { ok: r.ok, teks: r.mesej } }));
      if (r.ok) {
        setData((d) => d.map((b) => b.id === id ? {
          ...b, rujukan_kami: nilai, status: "selesai",
          data: { ...(b.data as DataSuratRasmi), keputusanPejabat: "diluluskan", komenPejabat: undefined },
        } : b));
      }
      setSibuk(null);
    } catch {
    } finally {
      setSibuk(null);
    }
  }

  async function tolak(id: string) {
    try {
      setSibuk(id);
      const r = await tolakSuratRasmi(id, komen[id] ?? "");
      setNota((n) => ({ ...n, [id]: { ok: r.ok, teks: r.mesej } }));
      if (r.ok) {
        setData((d) => d.map((b) => b.id === id ? {
          ...b, rujukan_kami: null, status: "selesai",
          data: { ...(b.data as DataSuratRasmi), keputusanPejabat: "ditolak", komenPejabat: komen[id]?.trim() },
        } : b));
      }
      setSibuk(null);
    } catch {
    } finally {
      setSibuk(null);
    }
  }

  if (data.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-garis bg-white p-6 text-center text-sm text-slate-500">
        Belum ada surat rasmi dihantar.
      </p>
    );
  }

  return (
    <>
      <ul className="mt-6 space-y-3">
        {data.map((b) => {
          const d = b.data as DataSuratRasmi;
          const ditolak = d.keputusanPejabat === "ditolak";
          const labelStatus = ditolak ? "ditolak" : d.keputusanPejabat === "diluluskan" ? "diluluskan" : b.status;
          return (
            <li key={b.id} className="rounded-xl border border-garis bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-800">{b.tajuk}</p>
                  <p className="text-xs text-slate-500">
                    Dari {b.pemohon_nama} ({b.pemohon_emel}) · {new Date(b.dicipta).toLocaleDateString("ms-MY")}
                  </p>
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  ditolak ? "bg-[#fdecec] text-[#9a2e2e]" : b.status === "selesai" ? "bg-[#e5f4ec] text-[#167a4b]" : "bg-[#fdf3dc] text-[#9a6b06]"
                }`}>
                  {labelStatus}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-line text-xs text-slate-600">{d.isi.slice(0, 220)}{d.isi.length > 220 ? "…" : ""}</p>

              {ditolak && d.komenPejabat && (
                <p className="mt-3 rounded-lg bg-[#fdecec] px-3 py-2 text-xs leading-relaxed text-[#8f2424]"><b>Komen penolakan:</b> {d.komenPejabat}</p>
              )}

              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                {b.rujukan_kami && !ditolak ? (
                  <span className="text-xs text-slate-600">Rujukan Kami: <b>{b.rujukan_kami}</b></span>
                ) : (
                  <>
                    <input
                      value={rujukan[b.id] ?? ""} onChange={(e) => setRujukan((r) => ({ ...r, [b.id]: e.target.value }))}
                      placeholder="Nombor rujukan kami" className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-1.5 text-xs"
                    />
                    <button type="button" disabled={sibuk === b.id} onClick={() => simpan(b.id)}
                      className="min-h-11 touch-manipulation rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                      Simpan
                    </button>
                  </>
                )}
                <button type="button" onClick={() => bukaCetak(b)} className="min-h-11 touch-manipulation px-1 text-xs font-semibold text-navy-700 underline">
                  Cetak PDF
                </button>
              </div>
              {!b.rujukan_kami && (
                <div className="mt-3 rounded-lg border border-[#efcccc] bg-[#fff8f8] p-3">
                  <label className="block text-xs font-semibold text-[#7f2929]" htmlFor={`komen-${b.id}`}>Komen jika ditolak</label>
                  <textarea id={`komen-${b.id}`} value={komen[b.id] ?? ""} maxLength={500} rows={2}
                    onChange={(e) => setKomen((k) => ({ ...k, [b.id]: e.target.value }))}
                    placeholder="Nyatakan pembetulan yang perlu dibuat…"
                    className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-[#e5bcbc] bg-white px-3 py-2 text-xs" />
                  <button type="button" disabled={sibuk === b.id || !(komen[b.id]?.trim())} onClick={() => void tolak(b.id)}
                    className="mt-2 min-h-11 touch-manipulation rounded-lg bg-[#9a2e2e] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                    Tolak dan hantar komen
                  </button>
                </div>
              )}
              {nota[b.id] && <p className={`mt-2 text-xs ${nota[b.id].ok ? "text-[#167a4b]" : "text-red-600"}`}>{nota[b.id].teks}</p>}
            </li>
          );
        })}
      </ul>

      {cetak && <CetakSurat surat={cetak} data={cetak.data as DataSuratRasmi} kepala={kepala} />}
    </>
  );
}
