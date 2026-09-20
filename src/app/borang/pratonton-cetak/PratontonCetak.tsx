"use client";

import { useEffect, useRef, useState } from "react";
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
  const [menjanaPdf, setMenjanaPdf] = useState(false);
  const [ralatPdf, setRalatPdf] = useState("");
  const [pdfSedia, setPdfSedia] = useState<{ url: string; nama: string } | null>(null);
  const dokumenRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const bingkai = requestAnimationFrame(() => setRekod(bacaData()));
    return () => cancelAnimationFrame(bingkai);
  }, []);

  useEffect(() => () => {
    if (pdfSedia) URL.revokeObjectURL(pdfSedia.url);
  }, [pdfSedia]);

  function kembali() {
    if (rekod?.kunci) sessionStorage.removeItem(`sktd-cetak:${rekod.kunci}`);
    if (window.history.length > 1) window.history.back();
    else window.location.href = `${AWALAN}/borang`;
  }

  function namaPdf(tajuk: string) {
    const nama = tajuk.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    return `${nama || "dokumen-sktd"}.pdf`;
  }

  function gunaPdf(url: string, nama: string) {
    const pautan = document.createElement("a");
    pautan.href = url;
    pautan.download = nama;
    pautan.rel = "noopener";
    document.body.appendChild(pautan);
    pautan.click();
    pautan.remove();
  }

  function perantiMudahAlih() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  }

  async function janaPdf() {
    const akar = dokumenRef.current;
    if (!akar || !rekod?.data || menjanaPdf) return;
    setMenjanaPdf(true);
    setRalatPdf("");
    try {
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas-pro"),
      ]);
      const landskap = rekod.data.kertas === "landscape";
      const pdf = new jsPDF({
        orientation: landskap ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      pdf.setProperties({ title: rekod.data.tajuk, creator: "Portal SKTD" });

      const lebarKertas = pdf.internal.pageSize.getWidth();
      const tinggiKertas = pdf.internal.pageSize.getHeight();
      const marginX = landskap ? 10 : 19;
      const marginAtas = landskap ? 9 : 18;
      const marginBawah = landskap ? 9 : 17;
      const lebarIsi = lebarKertas - marginX * 2;
      const tinggiIsi = tinggiKertas - marginAtas - marginBawah;
      const helaian = [...akar.querySelectorAll<HTMLElement>(".satu-slip")];
      const akarDokumen = akar.querySelector<HTMLElement>(":scope > [id]");
      const sasaran = helaian.length > 0 ? helaian : [akarDokumen ?? akar];

      for (let i = 0; i < sasaran.length; i += 1) {
        const kanvas = await html2canvas(sasaran[i], {
          backgroundColor: "#ffffff",
          scale: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)),
          useCORS: true,
          logging: false,
          windowWidth: Math.max(akar.scrollWidth, sasaran[i].scrollWidth),
        });
        if (i > 0) pdf.addPage();
        let lebar = lebarIsi;
        let tinggi = kanvas.height * lebar / kanvas.width;
        if (tinggi > tinggiIsi) {
          tinggi = tinggiIsi;
          lebar = kanvas.width * tinggi / kanvas.height;
        }
        const x = (lebarKertas - lebar) / 2;
        pdf.addImage(kanvas.toDataURL("image/jpeg", 0.94), "JPEG", x, marginAtas, lebar, tinggi, undefined, "FAST");
        kanvas.width = 1;
        kanvas.height = 1;
      }

      const nama = namaPdf(rekod.data.tajuk);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfSedia((lama) => {
        if (lama) URL.revokeObjectURL(lama.url);
        return { url, nama };
      });

      const fail = new File([blob], nama, { type: "application/pdf" });
      if (typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [fail] })) {
        try {
          await navigator.share({ files: [fail], title: rekod.data.tajuk });
          return;
        } catch (ralat) {
          if (ralat instanceof DOMException && ralat.name === "AbortError") return;
        }
      }
      gunaPdf(url, nama);
    } catch (ralat) {
      setRalatPdf(ralat instanceof Error ? ralat.message : "PDF gagal disediakan.");
    } finally {
      setMenjanaPdf(false);
    }
  }

  function cetak() {
    // PWA/iOS/Android tidak semestinya melaksanakan window.print(). Pada
    // peranti itu jana fail PDF sebenar; desktop kekal menggunakan dialog
    // cetak sistem yang lebih pantas.
    if (perantiMudahAlih()) void janaPdf();
    else window.print();
  }

  if (!rekod) return <main className="grid min-h-screen place-items-center p-6 text-sm text-slate-600">Menyediakan pratonton...</main>;
  if (!rekod.data) return <main className="mx-auto max-w-lg p-6 text-center"><h1 className="text-xl font-bold text-navy-800">Pratonton tidak tersedia</h1><p className="mt-3 text-sm text-slate-600">Kembali ke borang dan tekan Pratonton sekali lagi.</p><button type="button" onClick={kembali} className="mt-5 min-h-11 rounded-lg bg-navy-800 px-5 py-2.5 font-semibold text-white">Kembali ke borang</button></main>;

  const { data } = rekod;
  const landskap = data.kertas === "landscape";
  const margin = landskap ? "9mm 10mm" : "18mm 19mm 17mm";

  return <div id="sktd-pratonton-akar" className="min-h-screen bg-slate-100 text-black">
    <header className="sktd-cetak-bar sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 bg-navy-800 px-3 py-2.5 text-white shadow-md">
      <button type="button" onClick={kembali} className="min-h-11 rounded-lg border border-white/50 px-3 text-sm font-semibold">← Kembali</button>
      <span className="truncate text-center text-sm font-semibold">{data.tajuk}</span>
      <button type="button" onClick={cetak} disabled={menjanaPdf} aria-label="Cetak atau simpan sebagai PDF" className="min-h-11 touch-manipulation rounded-lg bg-white px-3 text-sm font-bold text-navy-800 disabled:opacity-60">{menjanaPdf ? "Menyediakan PDF…" : "Cetak / Simpan PDF"}</button>
    </header>
    {(ralatPdf || pdfSedia) && <div className="sktd-pdf-status sticky top-[132px] z-10 mx-auto flex max-w-xl items-center justify-center gap-3 bg-white p-3 text-center text-sm shadow sm:top-[68px]">
      {ralatPdf ? <span className="text-red-700">{ralatPdf}</span> : <><span className="text-emerald-800">PDF sudah tersedia.</span><a href={pdfSedia?.url} download={pdfSedia?.nama} target="_blank" rel="noopener" className="min-h-11 touch-manipulation rounded-lg bg-navy-800 px-4 py-3 font-bold text-white">Buka / Simpan PDF</a></>}
    </div>}
    <div className="sktd-cetak-viewport overflow-auto p-2.5 sm:p-4">
      <main ref={dokumenRef} className={`sktd-pratonton-dokumen mx-auto box-border bg-white shadow-lg ${landskap ? "w-[297mm] min-h-[210mm] p-[9mm_10mm]" : "w-[210mm] min-h-[297mm] p-[18mm_19mm_17mm]"}`}
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
        .sktd-pdf-status { display: none !important; }
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
