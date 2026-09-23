"use client";

import { useEffect, useRef, useState } from "react";
import { naikTandaTangan } from "@/lib/tandatangan";
import { prosesGambarTandatangan, kecilkanLukisan, gambarDisokong } from "@/data/tandatangan-imej";

/**
 * Tandatangan digital — DUA cara (permintaan pengguna A.5):
 *   1. Lukis terus dengan jari/tetikus/stylus pada papan.
 *   2. Muat naik gambar tandatangan sedia ada — latar belakang dibuang dan
 *      dipotong ketat secara automatik (di PELAYAR, sebelum dimuat naik).
 *
 * KENAPA PEMBUANGAN LATAR DI PELAYAR, BUKAN PELAYAN: gambar tandatangan
 * biasanya kertas putih diimbas dengan telefon — piksel latar hampir putih
 * tulen. Ambang mudah (RGB semua > 235) cukup untuk kes ini dan tidak
 * memerlukan pustaka pemprosesan imej baharu di pelayan.
 */
export default function TandaTangan({
  nilai, tetap, tempatan = false,
}: {
  nilai: string | null;
  tetap: (url: string | null) => void;
  /** Simpan sebagai data URL dalam borang awam; tiada endpoint muat naik terbuka. */
  tempatan?: boolean;
}) {
  const [mod, setMod] = useState<"lukis" | "naik">("lukis");
  const [sibuk, setSibuk] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const kanvasRef = useRef<HTMLCanvasElement | null>(null);
  const melukisRef = useRef(false);
  const kosongRef = useRef(true);

  useEffect(() => {
    const kv = kanvasRef.current;
    if (!kv) return;
    const ctx = kv.getContext("2d");
    if (!ctx) return;
    // KANVAS KEKAL LUT SINAR. Mengisi putih menjadikan PNG membawa kotak
    // putih, dan kotak itu kelihatan di atas borang bercetak. Latar putih
    // yang dilihat pengguna datang daripada CSS kanvas, bukan piksel.
    ctx.clearRect(0, 0, kv.width, kv.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0a1e3c";
  }, [mod]);

  function titik(e: React.PointerEvent<HTMLCanvasElement>) {
    const kv = kanvasRef.current!;
    const r = kv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * kv.width, y: ((e.clientY - r.top) / r.height) * kv.height };
  }

  function mula(e: React.PointerEvent<HTMLCanvasElement>) {
    melukisRef.current = true;
    kosongRef.current = false;
    const ctx = kanvasRef.current!.getContext("2d")!;
    const { x, y } = titik(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function lukis(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!melukisRef.current) return;
    const ctx = kanvasRef.current!.getContext("2d")!;
    const { x, y } = titik(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function habis() {
    melukisRef.current = false;
  }
  function kosongkan() {
    const kv = kanvasRef.current;
    if (!kv) return;
    kv.getContext("2d")!.clearRect(0, 0, kv.width, kv.height);
    kosongRef.current = true;
  }

  async function simpanBlob(blob: Blob) {
    setSibuk(true);
    setRalat(null);
    try {
      // Blob sudah dikecilkan ke ≤ 600×200 px (±5–40 KB) sebelum sampai ke sini.
      if (blob.size > 250_000) throw new Error("Tandatangan terlalu besar. Cuba lukis semula atau ambil gambar lebih dekat.");
      if (tempatan) {
        const dataUrl = await blobKeDataUrl(blob);
        if (dataUrl.length > 350_000) throw new Error("Tandatangan terlalu besar untuk disimpan.");
        tetap(dataUrl);
        return;
      }
      const fd = new FormData();
      fd.set("fail", new File([blob], "tandatangan.png", { type: "image/png" }));
      const r = await naikTandaTangan(fd);
      if (r.ok && r.url) tetap(r.url);
      else setRalat(r.mesej);
    } catch (err) {
      setRalat(err instanceof Error ? err.message : "Gagal menyimpan tandatangan.");
    } finally {
      setSibuk(false);
    }
  }

  function simpanLukisan() {
    if (kosongRef.current) {
      setRalat("Lukis tandatangan dahulu.");
      return;
    }
    void kecilkanLukisan(kanvasRef.current!).then(simpanBlob, () => setRalat("Gagal menyediakan tandatangan."));
  }

  async function pilihFail(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!gambarDisokong(f) || f.size > 25 * 1024 * 1024) {
      setRalat("Pilih gambar (JPG/PNG) sehingga 25 MB.");
      return;
    }
    setSibuk(true);
    setRalat(null);
    try {
      const diproses = await prosesGambarTandatangan(f);
      await simpanBlob(diproses);
    } catch (err) {
      setRalat(err instanceof Error ? err.message : "Gagal memproses gambar.");
      setSibuk(false);
    }
  }

  if (nilai) {
    return (
      <div className="rounded-xl border border-garis bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={nilai} alt="Tandatangan" className="h-20 object-contain" />
        <button
          type="button"
          onClick={() => tetap(null)}
          className="mt-2 min-h-10 text-sm font-semibold text-[#8f2424] underline"
        >
          Buang & tandatangan semula
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-garis bg-white p-4">
      <div className="flex flex-wrap gap-2 text-sm font-semibold">
        <button
          type="button" onClick={() => setMod("lukis")}
          className={`min-h-10 rounded-full px-4 py-1.5 ${mod === "lukis" ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-700"}`}
        >
          Lukis
        </button>
        <button
          type="button" onClick={() => setMod("naik")}
          className={`min-h-10 rounded-full px-4 py-1.5 ${mod === "naik" ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-700"}`}
        >
          Muat naik gambar
        </button>
      </div>

      {mod === "lukis" ? (
        <div className="mt-3">
          <canvas
            ref={kanvasRef} width={500} height={160}
            onPointerDown={mula} onPointerMove={lukis} onPointerUp={habis} onPointerLeave={habis}
            className="w-full touch-none rounded-lg border-2 border-dashed border-navy-700/40 bg-white"
          />
          <p className="mt-1 text-xs text-slate-500">Lukis dengan jari, kemudian tekan <b>Sahkan tandatangan</b>.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={kosongkan} className="min-h-10 rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold text-slate-600">
              Kosongkan
            </button>
            <button
              type="button" disabled={sibuk} onClick={simpanLukisan}
              className="min-h-10 rounded-lg bg-navy-800 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sibuk ? "Menyimpan…" : "Sahkan tandatangan"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          {/* Input fail sebenar disembunyikan; label besar berbingkai ialah
              sasaran sentuhan — "Choose File" kecil pelayar sukar dilihat. */}
          <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-4 text-center transition ${sibuk ? "border-slate-200 bg-slate-50" : "border-navy-700/40 bg-navy-50/40 hover:border-navy-700 active:bg-navy-50"}`}>
            <input type="file" accept="image/*" onChange={pilihFail} disabled={sibuk} className="sr-only" />
            <span aria-hidden="true" className="text-2xl">📷</span>
            <span className="text-sm font-bold text-navy-800">
              {sibuk ? "Memproses gambar…" : "[ Tekan di sini — ambil / pilih gambar tandatangan ]"}
            </span>
            <span className="text-xs text-slate-500">Tandatangan dengan pen gelap di atas kertas putih, ambil gambar dekat.</span>
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Latar belakang dibuang dan gambar dipotong ketat secara automatik.
          </p>
        </div>
      )}

      {ralat && <p className="mt-2 text-xs text-[#8f2424]">{ralat}</p>}
    </div>
  );
}

function blobKeDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const pembaca = new FileReader();
    pembaca.onload = () => typeof pembaca.result === "string" ? resolve(pembaca.result) : reject(new Error("Tandatangan tidak dapat dibaca."));
    pembaca.onerror = () => reject(new Error("Tandatangan tidak dapat dibaca."));
    pembaca.readAsDataURL(blob);
  });
}
