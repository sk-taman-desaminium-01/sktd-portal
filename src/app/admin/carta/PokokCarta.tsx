"use client";

import { useMemo, useRef, useState } from "react";
import MuatTurun from "@/components/MuatTurun";
import type { NodCarta } from "@/data/carta";

/**
 * Carta organisasi sebagai POKOK MENURUN, bukan senarai berlekuk.
 *
 * Keputusan pengguna (17 Sep 2026): carta mesti "drop dari guru besar",
 * mengikut bentuk carta KPM. Senarai berlekuk betul dari segi data tetapi
 * salah dari segi bentuk — carta organisasi ialah dokumen yang dicetak dan
 * ditampal, dan orang membacanya dari atas ke bawah.
 *
 * DILUKIS SEBAGAI SVG, dan itu yang menyelesaikan masalah kedua: muat turun
 * PDF melalui `window.print()` TIDAK berfungsi pada telefon — pelayar mudah
 * alih tidak semuanya membuka dialog cetak, dan pengguna melaporkan carta
 * tidak boleh dimuat turun langsung di telefon. SVG boleh ditukar kepada
 * PNG dalam pelayar dan diturunkan sebagai fail biasa, yang berfungsi di
 * mana-mana.
 *
 * HANYA TIGA ARAS dilukis: Guru Besar, Penolong Kanan, dan unit di bawah
 * mereka. Melukis 400 nama sebagai kotak menghasilkan gambar selebar tiga
 * meter yang tiada sesiapa boleh baca; nama penuh setiap unit ada dalam
 * senarai boleh sunting di bawah carta.
 */

const LEBAR = 178;
const TINGGI = 54;
const JURANG_X = 18;
const JURANG_Y = 74;
const PADDING = 24;

interface Kotak {
  x: number;
  y: number;
  label: string;
  jawatan: string;
  bil: number;
  aras: number;
  anak: Kotak[];
}

/** Susun atur pokok: lebar subpokok menentukan kedudukan induk. */
function susun(nod: NodCarta, aras: number, hadAras: number, mulaX: number): Kotak {
  const anakNod = aras >= hadAras ? [] : nod.anak.filter((a) => a.jenis === "unit" || aras === 0);

  if (anakNod.length === 0) {
    return {
      x: mulaX, y: aras * (TINGGI + JURANG_Y),
      label: nod.label, jawatan: nod.jawatan,
      bil: kiraDaun(nod), aras, anak: [],
    };
  }

  const anak: Kotak[] = [];
  let x = mulaX;
  for (const a of anakNod) {
    const k = susun(a, aras + 1, hadAras, x);
    anak.push(k);
    x = lebarSubpokok(k) + k.x + JURANG_X;
  }

  // Induk berada di TENGAH anak-anaknya. Itu yang menjadikannya kelihatan
  // seperti carta dan bukan senarai bertingkat.
  const kiri = anak[0].x;
  const kanan = anak[anak.length - 1].x;
  return {
    x: (kiri + kanan) / 2,
    y: aras * (TINGGI + JURANG_Y),
    label: nod.label, jawatan: nod.jawatan,
    bil: kiraDaun(nod), aras, anak,
  };
}

function lebarSubpokok(k: Kotak): number {
  if (k.anak.length === 0) return LEBAR;
  const kanan = k.anak[k.anak.length - 1];
  return kanan.x + lebarSubpokok(kanan) - k.anak[0].x;
}

function kiraDaun(n: NodCarta): number {
  if (n.anak.length === 0) return n.jenis === "orang" && !n.rujukan ? 1 : 0;
  return n.anak.reduce((a, x) => a + kiraDaun(x), 0);
}

function semuaKotak(k: Kotak, keluar: Kotak[] = []): Kotak[] {
  keluar.push(k);
  for (const a of k.anak) semuaKotak(a, keluar);
  return keluar;
}

/** Pecah teks kepada baris yang muat dalam kotak. */
function pecah(teks: string, maks: number): string[] {
  const kata = teks.split(/\s+/);
  const baris: string[] = [];
  let semasa = "";
  for (const w of kata) {
    if (semasa === "") semasa = w;
    else if ((semasa + " " + w).length <= maks) semasa += " " + w;
    else { baris.push(semasa); semasa = w; }
    if (baris.length >= 2) break;
  }
  if (semasa && baris.length < 2) baris.push(semasa);
  return baris.map((b, i) =>
    i === 1 && b.length > maks ? b.slice(0, maks - 1) + "…" : b,
  );
}

export default function PokokCarta({
  punca, tahun, namaSekolah,
}: {
  punca: NodCarta;
  tahun: number;
  namaSekolah: string;
}) {
  const [hadAras, setHadAras] = useState(2);
  const svgRef = useRef<SVGSVGElement>(null);

  const { kotak, lebar, tinggi } = useMemo(() => {
    const akar = susun(punca, 0, hadAras, 0);
    const semua = semuaKotak(akar);
    const minX = Math.min(...semua.map((k) => k.x));
    for (const k of semua) k.x -= minX;
    const maxX = Math.max(...semua.map((k) => k.x));
    const maxY = Math.max(...semua.map((k) => k.y));
    return {
      kotak: semua,
      lebar: maxX + LEBAR + PADDING * 2,
      tinggi: maxY + TINGGI + PADDING * 2 + 46,
    };
  }, [punca, hadAras]);

  /** Fail SVG yang lengkap dan berdiri sendiri. */
  function svgTeks(): string {
    const el = svgRef.current;
    if (!el) return "";
    const salin = el.cloneNode(true) as SVGSVGElement;
    salin.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(salin);
  }

  function turun(nama: string, isi: Blob) {
    const url = URL.createObjectURL(isi);
    const a = document.createElement("a");
    a.href = url;
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  const asas = `carta-organisasi-${tahun}`;

  const pilihan = [
    {
      label: "PNG (gambar)",
      nota: "Berfungsi di telefon — boleh dikongsi dan dicetak.",
      jalan: async () => {
        // SVG → kanvas → PNG. Ini laluan yang berfungsi pada telefon;
        // `window.print()` tidak dibuka oleh setiap pelayar mudah alih,
        // dan itu sebabnya muat turun carta gagal di sana sebelum ini.
        const teks = svgTeks();
        if (!teks) return;
        const skala = 2;
        const img = new Image();
        img.decoding = "sync";
        const siap = new Promise<void>((selesai, tolak) => {
          img.onload = () => selesai();
          img.onerror = () => tolak(new Error("gagal melukis"));
        });
        // `data:` URI, bukan `blob:` — Safari menolak blob SVG dalam <img>.
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(teks);
        await siap;

        const kanvas = document.createElement("canvas");
        kanvas.width = lebar * skala;
        kanvas.height = tinggi * skala;
        const ctx = kanvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, kanvas.width, kanvas.height);
        ctx.drawImage(img, 0, 0, kanvas.width, kanvas.height);
        const blob = await new Promise<Blob | null>((r) => kanvas.toBlob(r, "image/png"));
        if (blob) turun(`${asas}.png`, blob);
      },
    },
    {
      label: "SVG (boleh disunting)",
      nota: "Untuk dimasukkan ke dalam Buku Pengurusan.",
      jalan: () => {
        const teks = svgTeks();
        if (teks) turun(`${asas}.svg`, new Blob([teks], { type: "image/svg+xml" }));
      },
    },
  ];

  return (
    <section className="tiada-cetak mt-6">
      <div className="flex flex-wrap items-center gap-3 rounded-t-xl border border-b-0 border-garis bg-white p-3">
        <label className="text-xs text-slate-600">
          Aras
          <select
            value={hadAras}
            onChange={(e) => setHadAras(Number(e.target.value))}
            className="ml-2 rounded-lg border border-garis px-2 py-1.5 text-xs"
          >
            <option value={1}>Guru Besar &amp; Penolong Kanan</option>
            <option value={2}>Hingga unit</option>
            <option value={3}>Hingga jawatankuasa</option>
          </select>
        </label>
        <p className="min-w-0 flex-1 text-xs text-slate-400">
          Leret ke sisi untuk melihat carta penuh.
        </p>
        <MuatTurun pilihan={pilihan} tajuk="Muat turun carta" />
      </div>

      <div className="overflow-x-auto rounded-b-xl border border-garis bg-white">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${lebar} ${tinggi}`}
          width={lebar}
          height={tinggi}
          role="img"
          aria-label={`Carta organisasi ${namaSekolah} ${tahun}`}
          style={{ maxWidth: "none" }}
        >
          <rect width={lebar} height={tinggi} fill="#ffffff" />
          <text x={lebar / 2} y={22} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0b2545">
            CARTA ORGANISASI {namaSekolah.toUpperCase()}
          </text>
          <text x={lebar / 2} y={38} textAnchor="middle" fontSize="10" fill="#64748b">
            Tahun {tahun}
          </text>

          <g transform={`translate(${PADDING}, ${PADDING + 30})`}>
            {/* Garis penyambung dilukis DAHULU supaya kotak menutupinya. */}
            {kotak.map((k) =>
              k.anak.map((a) => {
                const x1 = k.x + LEBAR / 2;
                const y1 = k.y + TINGGI;
                const x2 = a.x + LEBAR / 2;
                const y2 = a.y;
                const tengah = y1 + JURANG_Y / 2;
                return (
                  <path
                    key={`${k.label}-${a.label}-${a.x}`}
                    d={`M${x1} ${y1} V${tengah} H${x2} V${y2}`}
                    fill="none"
                    stroke="#c7d2e0"
                    strokeWidth="1.4"
                  />
                );
              }),
            )}

            {kotak.map((k) => {
              const warna = k.aras === 0 ? "#0b2545" : k.aras === 1 ? "#123561" : "#ffffff";
              const teksWarna = k.aras <= 1 ? "#ffffff" : "#123561";
              const baris = pecah(k.label, 24);
              return (
                <g key={`${k.label}-${k.x}-${k.y}`} transform={`translate(${k.x}, ${k.y})`}>
                  <rect
                    width={LEBAR} height={TINGGI} rx="7"
                    fill={warna} stroke={k.aras <= 1 ? warna : "#c7d2e0"} strokeWidth="1.2"
                  />
                  {baris.map((b, i) => (
                    <text
                      key={i}
                      x={LEBAR / 2}
                      y={baris.length === 1 ? 22 : 17 + i * 12}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight="700"
                      fill={teksWarna}
                    >
                      {b}
                    </text>
                  ))}
                  <text
                    x={LEBAR / 2} y={TINGGI - 13} textAnchor="middle"
                    fontSize="8.5" fill={k.aras <= 1 ? "#ffffffb8" : "#64748b"}
                  >
                    {pecah(k.jawatan || (k.bil > 0 ? `${k.bil} orang` : ""), 30)[0] ?? ""}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </section>
  );
}
