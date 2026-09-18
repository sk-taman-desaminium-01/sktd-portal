"use client";

import { useEffect, useState } from "react";
import { tetapkanRujukan, type BarisSurat, type DataSuratRasmi } from "@/lib/surat";
import CetakSurat, { type KepalaSurat } from "@/components/CetakSurat";

/**
 * Peti masuk Urusan Pejabat — kerani/pentadbir/admin isi nombor rujukan
 * kami bagi setiap surat rasmi (permintaan B.3).
 */
export default function PanelPejabat({ senarai, kepala }: { senarai: BarisSurat[]; kepala: KepalaSurat }) {
  const [data, setData] = useState(senarai);
  const [rujukan, setRujukan] = useState<Record<string, string>>({});
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [cetak, setCetak] = useState<BarisSurat | null>(null);

  useEffect(() => {
    if (cetak) {
      const t = setTimeout(() => window.print(), 50);
      return () => clearTimeout(t);
    }
  }, [cetak]);

  async function simpan(id: string) {
    const nilai = rujukan[id]?.trim();
    if (!nilai) return;
    setSibuk(id);
    const r = await tetapkanRujukan(id, nilai);
    if (r.ok) {
      setData((d) => d.map((b) => (b.id === id ? { ...b, rujukan_kami: nilai, status: "selesai" } : b)));
    }
    setSibuk(null);
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
                  b.status === "selesai" ? "bg-[#e5f4ec] text-[#167a4b]" : "bg-[#fdf3dc] text-[#9a6b06]"
                }`}>
                  {b.status}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-line text-xs text-slate-600">{d.isi.slice(0, 220)}{d.isi.length > 220 ? "…" : ""}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {b.rujukan_kami ? (
                  <span className="text-xs text-slate-600">Rujukan Kami: <b>{b.rujukan_kami}</b></span>
                ) : (
                  <>
                    <input
                      value={rujukan[b.id] ?? ""} onChange={(e) => setRujukan((r) => ({ ...r, [b.id]: e.target.value }))}
                      placeholder="Nombor rujukan kami" className="flex-1 rounded-lg border border-garis px-3 py-1.5 text-xs"
                    />
                    <button type="button" disabled={sibuk === b.id} onClick={() => simpan(b.id)}
                      className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                      Simpan
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setCetak(b)} className="text-xs font-semibold text-navy-700 underline">
                  Cetak PDF
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {cetak && <CetakSurat surat={cetak} data={cetak.data as DataSuratRasmi} kepala={kepala} />}
    </>
  );
}
