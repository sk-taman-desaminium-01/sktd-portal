"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pemotong gambar bulat untuk potret pentadbir.
 *
 * MATLAMATNYA "crop yang kemas", dan itu dijamin oleh alat ini, bukan oleh
 * pengesanan wajah. Pengesanan hanya meletakkan bingkai permulaan di tempat
 * yang betul; pengguna sentiasa boleh menyeret dan mengezum.
 *
 * KENAPA BUKAN MODEL PENGESANAN WAJAH YANG DIMUAT TURUN:
 * pakej pengesan wajah yang biasa ialah beberapa megabait wasm dan model.
 * Skrin ini digunakan kira-kira enam kali setahun. Membuat setiap pentadbir
 * memuat turun megabait untuk kerja yang satu seretan boleh selesaikan bukan
 * pertukaran yang baik pada data mudah alih sekolah.
 *
 * Jadi: `FaceDetector` asli pelayar digunakan bila ia ADA (Chrome tertentu —
 * percuma, sifar bait). Bila tiada — termasuk Safari iOS — bingkai permulaan
 * diletak mengikut cara potret biasa disusun: kepala berada di bahagian ATAS
 * tengah gambar, bukan di tengah-tengah tepat. Itu betul untuk hampir semua
 * gambar potret, dan yang selebihnya diselesaikan dengan satu seretan.
 *
 * Gambar keluar 400×400 JPEG — kecil, dan saiz yang sama untuk semua orang,
 * jadi barisan pentadbir kelihatan sekata di laman awam.
 */

const SAIZ = 400;

type Bingkai = { x: number; y: number; lebar: number };

/** Kotak wajah dari pengesan asli pelayar, jika ada. */
async function cariWajah(img: HTMLImageElement): Promise<DOMRectReadOnly | null> {
  const W = window as unknown as {
    FaceDetector?: new (o?: { fastMode?: boolean; maxDetectedFaces?: number }) =>
      { detect(i: HTMLImageElement): Promise<{ boundingBox: DOMRectReadOnly }[]> };
  };
  if (!W.FaceDetector) return null;
  try {
    const pengesan = new W.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const hasil = await pengesan.detect(img);
    return hasil[0]?.boundingBox ?? null;
  } catch {
    // Pengesan boleh gagal pada gambar tertentu. Itu bukan ralat yang perlu
    // ditunjukkan — kita hanya jatuh kembali kepada bingkai potret biasa.
    return null;
  }
}

/** Bingkai permulaan: dari wajah jika dikesan, jika tidak dari cara potret biasa. */
function bingkaiAwal(img: HTMLImageElement, wajah: DOMRectReadOnly | null): Bingkai {
  const { naturalWidth: W, naturalHeight: H } = img;

  if (wajah) {
    // Beri ruang di sekeliling kepala: wajah sahaja terlalu ketat, dan
    // potret yang kemas menunjukkan sedikit bahu dan ruang di atas kepala.
    const lebar = Math.min(W, H, Math.max(wajah.width, wajah.height) * 2.1);
    const tengahX = wajah.x + wajah.width / 2;
    // Dianjak ke ATAS sedikit supaya dagu tidak melekat di tepi bawah.
    const tengahY = wajah.y + wajah.height / 2 + lebar * 0.06;
    return {
      lebar,
      x: Math.min(Math.max(0, tengahX - lebar / 2), W - lebar),
      y: Math.min(Math.max(0, tengahY - lebar / 2), H - lebar),
    };
  }

  const lebar = Math.min(W, H);
  return {
    lebar,
    x: (W - lebar) / 2,
    // 12% dari atas, bukan di tengah: dalam gambar potret kepala berada di
    // bahagian atas, jadi bingkai yang berpusat tepat memotong dahi.
    y: Math.min(Math.max(0, (H - lebar) * 0.12), Math.max(0, H - lebar)),
  };
}

export default function PemotongWajah({
  fail, namaOrang, onBatal, onSiap,
}: {
  fail: File;
  namaOrang: string;
  onBatal: () => void;
  onSiap: (potong: File) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const kanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [siapMuat, setSiapMuat] = useState(false);
  const [bingkai, setBingkai] = useState<Bingkai | null>(null);
  const [dikesan, setDikesan] = useState<boolean | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const seret = useRef<{ x: number; y: number; bx: number; by: number } | null>(null);

  /* --- Muat gambar, kesan wajah, tetapkan bingkai permulaan --- */
  useEffect(() => {
    const url = URL.createObjectURL(fail);
    const img = new Image();
    img.onload = async () => {
      imgRef.current = img;
      const wajah = await cariWajah(img);
      setDikesan(wajah !== null);
      setBingkai(bingkaiAwal(img, wajah));
      setSiapMuat(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [fail]);

  /* --- Lukis pratonton --- */
  const lukis = useCallback(() => {
    const kanvas = kanvasRef.current;
    const img = imgRef.current;
    if (!kanvas || !img || !bingkai) return;
    const ctx = kanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, SAIZ, SAIZ);
    ctx.drawImage(img, bingkai.x, bingkai.y, bingkai.lebar, bingkai.lebar, 0, 0, SAIZ, SAIZ);
  }, [bingkai]);

  useEffect(() => { lukis(); }, [lukis, siapMuat]);

  /* --- Seret untuk alih --- */
  function mulaSeret(e: React.PointerEvent<HTMLDivElement>) {
    if (!bingkai) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    seret.current = { x: e.clientX, y: e.clientY, bx: bingkai.x, by: bingkai.y };
  }

  function gerakSeret(e: React.PointerEvent<HTMLDivElement>) {
    const s = seret.current;
    const img = imgRef.current;
    if (!s || !img || !bingkai) return;
    // Skala: gerakan 1px pada skrin = beberapa px pada gambar asal.
    const nisbah = bingkai.lebar / e.currentTarget.clientWidth;
    const x = s.bx - (e.clientX - s.x) * nisbah;
    const y = s.by - (e.clientY - s.y) * nisbah;
    setBingkai({
      lebar: bingkai.lebar,
      x: Math.min(Math.max(0, x), img.naturalWidth - bingkai.lebar),
      y: Math.min(Math.max(0, y), img.naturalHeight - bingkai.lebar),
    });
  }

  function habisSeret() { seret.current = null; }

  /* --- Zum --- */
  function zum(nilai: number) {
    const img = imgRef.current;
    if (!img || !bingkai) return;
    const maks = Math.min(img.naturalWidth, img.naturalHeight);
    const lebar = Math.min(maks, Math.max(maks * 0.2, nilai));
    // Kekalkan titik tengah semasa mengezum, supaya wajah tidak melompat.
    const cx = bingkai.x + bingkai.lebar / 2;
    const cy = bingkai.y + bingkai.lebar / 2;
    setBingkai({
      lebar,
      x: Math.min(Math.max(0, cx - lebar / 2), img.naturalWidth - lebar),
      y: Math.min(Math.max(0, cy - lebar / 2), img.naturalHeight - lebar),
    });
  }

  /* --- Hasilkan fail 400×400 --- */
  async function siap() {
    const kanvas = kanvasRef.current;
    if (!kanvas) return;
    setSibuk(true);
    const blob = await new Promise<Blob | null>((r) => kanvas.toBlob(r, "image/jpeg", 0.85));
    setSibuk(false);
    if (!blob) return;
    const nama = fail.name.replace(/\.[^.]+$/, "") + "-potret.jpg";
    onSiap(new File([blob], nama, { type: "image/jpeg" }));
  }

  const maksLebar = imgRef.current
    ? Math.min(imgRef.current.naturalWidth, imgRef.current.naturalHeight)
    : 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Potong gambar ${namaOrang}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/70 p-4 sm:items-center"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5">
        <h2 className="text-base font-bold text-navy-800">Potong gambar</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {namaOrang}
        </p>

        {!siapMuat ? (
          <div className="mt-4 h-64 animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <>
            <div
              onPointerDown={mulaSeret}
              onPointerMove={gerakSeret}
              onPointerUp={habisSeret}
              onPointerCancel={habisSeret}
              className="mx-auto mt-4 aspect-square w-56 cursor-grab touch-none overflow-hidden rounded-full ring-4 ring-navy-100 active:cursor-grabbing"
            >
              <canvas
                ref={kanvasRef}
                width={SAIZ}
                height={SAIZ}
                className="h-full w-full"
              />
            </div>

            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
              {dikesan
                ? "Wajah dikesan — bingkai diletak automatik. Seret untuk halus."
                : "Seret gambar untuk alih, dan guna slider untuk zum."}
            </p>

            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Zum
              <input
                type="range"
                min={Math.round(maksLebar * 0.2)}
                max={Math.round(maksLebar)}
                value={Math.round(bingkai?.lebar ?? maksLebar)}
                onChange={(e) => zum(Number(e.target.value))}
                // Slider terbalik: menolak ke kanan mesti MEMBESARKAN wajah,
                // iaitu MENGECILKAN bingkai.
                style={{ direction: "rtl" }}
                className="mt-1 block w-full"
              />
            </label>
          </>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button" onClick={siap} disabled={!siapMuat || sibuk}
            className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sibuk ? "Memotong…" : "Guna gambar ini"}
          </button>
          <button
            type="button" onClick={onBatal}
            className="rounded-lg border border-garis px-4 py-2.5 text-sm font-semibold text-slate-600"
          >
            Batal
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Gambar disimpan 400×400 supaya semua potret sama saiz di laman awam.
        </p>
      </div>
    </div>
  );
}
