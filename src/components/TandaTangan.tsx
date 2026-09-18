"use client";

import { useEffect, useRef, useState } from "react";
import { naikTandaTangan } from "@/lib/tandatangan";

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
  nilai, tetap,
}: {
  nilai: string | null;
  tetap: (url: string | null) => void;
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
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, kv.width, kv.height);
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
    const ctx = kv.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, kv.width, kv.height);
    kosongRef.current = true;
  }

  async function simpanBlob(blob: Blob) {
    setSibuk(true);
    setRalat(null);
    try {
      const fd = new FormData();
      fd.set("fail", new File([blob], "tandatangan.png", { type: "image/png" }));
      const r = await naikTandaTangan(fd);
      if (r.ok && r.url) tetap(r.url);
      else setRalat(r.mesej);
    } finally {
      setSibuk(false);
    }
  }

  function simpanLukisan() {
    if (kosongRef.current) {
      setRalat("Lukis tandatangan dahulu.");
      return;
    }
    kanvasRef.current!.toBlob((b) => b && simpanBlob(b), "image/png");
  }

  async function pilihFail(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setSibuk(true);
    setRalat(null);
    try {
      const diproses = await buangLatarDanPotong(f);
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
          className="mt-2 text-xs text-[#8f2424] underline"
        >
          Buang & tandatangan semula
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-garis bg-white p-4">
      <div className="flex gap-2 text-xs font-semibold">
        <button
          type="button" onClick={() => setMod("lukis")}
          className={`rounded-full px-3 py-1 ${mod === "lukis" ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-700"}`}
        >
          Lukis
        </button>
        <button
          type="button" onClick={() => setMod("naik")}
          className={`rounded-full px-3 py-1 ${mod === "naik" ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-700"}`}
        >
          Muat naik gambar
        </button>
      </div>

      {mod === "lukis" ? (
        <div className="mt-3">
          <canvas
            ref={kanvasRef} width={500} height={160}
            onPointerDown={mula} onPointerMove={lukis} onPointerUp={habis} onPointerLeave={habis}
            className="w-full touch-none rounded-lg border border-dashed border-garis"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={kosongkan} className="rounded-lg border border-garis px-3 py-1.5 text-xs font-semibold text-slate-600">
              Kosongkan
            </button>
            <button
              type="button" disabled={sibuk} onClick={simpanLukisan}
              className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {sibuk ? "Menyimpan…" : "Sahkan tandatangan"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <input type="file" accept="image/*" onChange={pilihFail} disabled={sibuk} className="text-xs" />
          <p className="mt-1 text-xs text-slate-500">
            Latar belakang dibuang dan gambar dipotong ketat secara automatik.
          </p>
        </div>
      )}

      {ralat && <p className="mt-2 text-xs text-[#8f2424]">{ralat}</p>}
    </div>
  );
}

/**
 * Buang piksel hampir-putih (latar) daripada gambar tandatangan, jadikan
 * lut sinar (alpha 0), kemudian potong ketat kepada sempadan piksel yang
 * masih legap.
 */
async function buangLatarDanPotong(fail: File): Promise<Blob> {
  const gambar = await muatGambar(fail);
  const kv = document.createElement("canvas");
  kv.width = gambar.width;
  kv.height = gambar.height;
  const ctx = kv.getContext("2d")!;
  ctx.drawImage(gambar, 0, 0);

  const img = ctx.getImageData(0, 0, kv.width, kv.height);
  const d = img.data;
  const AMBANG = 235;
  let minX = kv.width, minY = kv.height, maxX = 0, maxY = 0;
  for (let y = 0; y < kv.height; y++) {
    for (let x = 0; x < kv.width; x++) {
      const i = (y * kv.width + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r > AMBANG && g > AMBANG && b > AMBANG) {
        d[i + 3] = 0; // telus
      } else {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  if (maxX <= minX || maxY <= minY) {
    // Tiada piksel gelap ditemui (gambar kosong/putih) — pulangkan penuh
    // daripada melontar, supaya pengguna nampak mesej yang jelas nanti.
    return await new Promise<Blob>((res) => kv.toBlob((b) => res(b!), "image/png"));
  }

  const sempadan = 6; // sedikit jidar supaya tepi tidak terpotong
  const lebar = Math.min(kv.width, maxX - minX + 1 + sempadan * 2);
  const tinggi = Math.min(kv.height, maxY - minY + 1 + sempadan * 2);
  const potong = document.createElement("canvas");
  potong.width = lebar;
  potong.height = tinggi;
  potong.getContext("2d")!.drawImage(
    kv,
    Math.max(0, minX - sempadan), Math.max(0, minY - sempadan), lebar, tinggi,
    0, 0, lebar, tinggi,
  );
  return await new Promise<Blob>((res) => potong.toBlob((b) => res(b!), "image/png"));
}

function muatGambar(fail: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Gambar tidak boleh dibaca."));
    img.src = URL.createObjectURL(fail);
  });
}
