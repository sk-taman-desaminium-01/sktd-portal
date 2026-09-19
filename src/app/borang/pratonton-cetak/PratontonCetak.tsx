"use client";

import { useEffect, useState } from "react";
import { AWALAN } from "@/lib/laluan";

type DataCetak = {
  versi: 1;
  tajuk: string;
  kertas: "portrait" | "landscape";
  kandungan: string;
};

function bacaData(): { data: DataCetak | null; kunci: string } {
  const kunci = new URLSearchParams(window.location.search).get("k") ?? "";
  if (!kunci) return { data: null, kunci };
  try {
    const data = JSON.parse(sessionStorage.getItem(`sktd-cetak:${kunci}`) ?? "null") as DataCetak | null;
    if (!data || data.versi !== 1 || !["portrait", "landscape"].includes(data.kertas)) return { data: null, kunci };
    return { data, kunci };
  } catch {
    return { data: null, kunci };
  }
}

export default function PratontonCetak() {
  const [rekod, setRekod] = useState<{ data: DataCetak | null; kunci: string } | null>(null);
  useEffect(() => {
    const bingkai = requestAnimationFrame(() => setRekod(bacaData()));
    return () => cancelAnimationFrame(bingkai);
  }, []);

  function kembali() {
    if (rekod?.kunci) sessionStorage.removeItem(`sktd-cetak:${rekod.kunci}`);
    if (window.history.length > 1) window.history.back();
    else window.location.href = `${AWALAN}/borang`;
  }

  // Kekalkan panggilan terus dalam acara sentuhan. Safari iOS boleh menyekat
  // dialog cetak jika window.print() dipanggil selepas await atau pemasa.
  function cetak() { window.print(); }

  if (!rekod) return <main className="grid min-h-screen place-items-center p-6 text-sm text-slate-600">Menyediakan pratonton...</main>;
  if (!rekod.data) return <main className="mx-auto max-w-lg p-6 text-center"><h1 className="text-xl font-bold text-navy-800">Pratonton tidak tersedia</h1><p className="mt-3 text-sm text-slate-600">Kembali ke borang dan tekan Pratonton sekali lagi.</p><button type="button" onClick={kembali} className="mt-5 min-h-11 rounded-lg bg-navy-800 px-5 py-2.5 font-semibold text-white">Kembali ke borang</button></main>;

  const { data } = rekod;
  const landskap = data.kertas === "landscape";
  const margin = landskap ? "9mm 10mm" : "18mm 19mm 17mm";

  return <div id="sktd-pratonton-akar" className="min-h-screen bg-slate-100 text-black">
    <header className="sktd-cetak-bar sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 bg-navy-800 px-3 py-2.5 text-white shadow-md">
      <button type="button" onClick={kembali} className="min-h-11 rounded-lg border border-white/50 px-3 text-sm font-semibold">← Kembali</button>
      <span className="truncate text-center text-sm font-semibold">{data.tajuk}</span>
      <button type="button" onClick={cetak} aria-label="Cetak atau simpan sebagai PDF" className="min-h-11 rounded-lg bg-white px-3 text-sm font-bold text-navy-800">Cetak / Simpan PDF</button>
    </header>
    <div className="sktd-cetak-viewport overflow-auto p-2.5 sm:p-4">
      <main className={`sktd-pratonton-dokumen mx-auto box-border bg-white shadow-lg ${landskap ? "w-[297mm] min-h-[210mm] p-[9mm_10mm]" : "w-[210mm] min-h-[297mm] p-[18mm_19mm_17mm]"}`}
        dangerouslySetInnerHTML={{ __html: data.kandungan }} />
    </div>
    <style>{`
      .sktd-cetak-bar { display: grid; grid-template-columns: 1fr; gap: 8px; }
      .sktd-cetak-bar button { min-height: 44px; touch-action: manipulation; cursor: pointer; }
      @media (min-width: 640px) { .sktd-cetak-bar { grid-template-columns: auto minmax(0, 1fr) auto; } }
      @page { size: A4 ${data.kertas}; margin: ${margin}; }
      @media print {
        html, body, #sktd-pratonton-akar { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .sktd-cetak-bar { display: none !important; }
        .sktd-cetak-viewport, .sktd-pratonton-dokumen {
          display: block !important; visibility: visible !important; position: static !important;
          width: auto !important; min-height: 0 !important; margin: 0 !important;
          padding: 0 !important; max-width: none !important; min-width: 0 !important;
          overflow: visible !important; box-shadow: none !important; background: #fff !important;
        }
        .sktd-pratonton-dokumen > [id] {
          display: block !important; visibility: visible !important; position: static !important;
          inset: auto !important; width: 100% !important; margin: 0 !important;
        }
        .sktd-pratonton-dokumen > [id], .sktd-pratonton-dokumen > [id] * { visibility: visible !important; }
      }
    `}</style>
  </div>;
}
