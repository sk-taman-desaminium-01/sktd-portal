"use client";

import { useMemo, useState } from "react";
import MuatTurun, { barisCsv, turunkanTeks } from "@/components/MuatTurun";
import { suntingNod, padamNod } from "@/lib/tindakan-carta";
import type { NodCarta } from "@/data/carta";

/**
 * Carta organisasi — lihat, betulkan, muat turun.
 *
 * BOLEH DISUNTING kerana bacaan automatik PASTI silap sebahagiannya. Buku
 * sebenar mengandungi taip salah (`;` sebagai `:`), lajur yang beranjak
 * antara muka, dan 33 muka yang hanya gambar. Carta yang tidak boleh
 * dibetulkan bermakna satu kesilapan kecil menjadikan seluruh carta tidak
 * boleh digunakan, dan sekolah kembali menaipnya semula dalam Word.
 *
 * Suntingan menulis ke baris Buku Pengurusan yang SAMA, dan menyimpan bacaan
 * asal PDF dalam `asal` — jadi pembetulan boleh disemak semula, dan carta
 * tidak menjadi salinan kedua yang menyimpang dari sumbernya.
 */

interface Props {
  punca: NodCarta;
  tahun: number;
  namaSekolah: string;
  semuaDisahkan: boolean;
}

export default function PanelCarta({ punca, tahun, namaSekolah, semuaDisahkan }: Props) {
  const [pokok, setPokok] = useState(punca);
  const [tutup, setTutup] = useState<Set<string>>(new Set());
  const [sunting, setSunting] = useState<string | null>(null);
  const [mesej, setMesej] = useState<{ ok: boolean; teks: string } | null>(null);
  const [tapis, setTapis] = useState("");

  const carian = tapis.trim().toLowerCase();
  const ditapis = useMemo(() => (carian ? tapisPokok(pokok, carian) : pokok), [pokok, carian]);

  function togol(id: string) {
    setTutup((lama) => {
      const baharu = new Set(lama);
      if (baharu.has(id)) baharu.delete(id);
      else baharu.add(id);
      return baharu;
    });
  }

  async function simpan(nod: NodCarta, jawatan: string, nama: string) {
    if (!nod.barisId) return;
    // Baris Buku Pengurusan bagi senarai jawatankuasa ialah
    // [jawatankuasa, jawatan, nama] — kumpulan dikekalkan seadanya.
    const hasil = await suntingNod(nod.barisId, [kumpulanBagi(pokok, nod.id), jawatan, nama]);
    setMesej({ ok: hasil.ok, teks: hasil.mesej });
    if (hasil.ok) {
      setPokok((p) => gantiNod(p, nod.id, { ...nod, jawatan, label: nama }));
      setSunting(null);
    }
  }

  async function buang(nod: NodCarta) {
    if (!nod.barisId) return;
    const hasil = await padamNod(nod.barisId);
    setMesej({ ok: hasil.ok, teks: hasil.mesej });
    if (hasil.ok) setPokok((p) => buangNod(p, nod.id));
  }

  const turun = [
    {
      label: "PDF (cetak)",
      nota: "Buka dialog cetak — pilih “Simpan sebagai PDF”.",
      jalan: () => window.print(),
    },
    {
      label: "CSV",
      nota: "Untuk Excel — satu baris setiap jawatan.",
      jalan: () => {
        const baris = [barisCsv(["Aras", "Unit", "Jawatan", "Nama", "Kod"])];
        rataPokok(pokok, [], (laluan, n) => {
          if (n.jenis !== "orang" || n.rujukan) return;
          baris.push(barisCsv([laluan.length, laluan.join(" > "), n.jawatan, n.label, n.kod ?? ""]));
        });
        // BOM di hadapan: tanpanya Excel di Windows memaparkan nama bertanda
        // sebagai aksara rosak, dan sekolah menyangka data itu yang rosak.
        turunkanTeks(`carta-organisasi-${tahun}.csv`, "﻿" + baris.join("\r\n"));
      },
    },
  ];

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #carta-cetak, #carta-cetak * { visibility: visible; }
          #carta-cetak { position: absolute; inset: 0; width: 100%; }
          .tiada-cetak { display: none !important; }
          @page { size: A4 portrait; margin: 14mm; }
        }
      `}</style>

      {/* Baris alat: carian di kiri, muat turun di kanan. Butang itu duduk
          DALAM baris ini, bukan terapung di atas carta — itu yang menjadikan
          ia tidak bertindan pada skrin telefon. */}
      <div className="tiada-cetak mt-6 flex items-center gap-3 rounded-xl border border-garis bg-white p-3">
        <input
          value={tapis}
          onChange={(e) => setTapis(e.target.value)}
          placeholder="Cari nama, jawatan atau unit…"
          aria-label="Cari dalam carta"
          className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-2 text-sm"
        />
        <MuatTurun pilihan={turun} tajuk="Muat turun carta" />
      </div>

      {mesej && (
        <p
          className={`tiada-cetak mt-3 rounded-lg border p-3 text-sm ${
            mesej.ok
              ? "border-[#bfe3ce] bg-[#eef8f2] text-[#15693f]"
              : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
          }`}
        >
          {mesej.teks}
        </p>
      )}

      <div id="carta-cetak" className="mt-4">
        <div className="hidden print:block">
          <h1 className="text-center text-lg font-bold">Carta Organisasi</h1>
          <p className="mt-0.5 text-center text-sm">
            {namaSekolah} · {tahun}
          </p>
          {!semuaDisahkan && (
            <p className="mt-1 text-center text-xs">
              DRAF — sebahagian seksyen Buku Pengurusan belum disahkan.
            </p>
          )}
        </div>

        <Cabang
          nod={ditapis}
          aras={0}
          tutup={tutup}
          togol={togol}
          sunting={sunting}
          setSunting={setSunting}
          simpan={simpan}
          buang={buang}
        />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- cabang */

function Cabang({
  nod, aras, tutup, togol, sunting, setSunting, simpan, buang,
}: {
  nod: NodCarta;
  aras: number;
  tutup: Set<string>;
  togol: (id: string) => void;
  sunting: string | null;
  setSunting: (id: string | null) => void;
  simpan: (n: NodCarta, jawatan: string, nama: string) => Promise<void>;
  buang: (n: NodCarta) => Promise<void>;
}) {
  const adaAnak = nod.anak.length > 0;
  const dibuka = !tutup.has(nod.id);
  const unit = nod.jenis === "unit";

  return (
    <div className={aras === 0 ? "" : "ml-3 border-l border-garis pl-3 sm:ml-4 sm:pl-4"}>
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-1.5 ${
          aras === 0 ? "bg-navy-700 text-white" : unit ? "bg-navy-50/60" : ""
        }`}
      >
        {adaAnak && (
          <button
            type="button"
            onClick={() => togol(nod.id)}
            aria-label={dibuka ? `Tutup ${nod.label}` : `Buka ${nod.label}`}
            className={`tiada-cetak grid h-5 w-5 shrink-0 place-items-center rounded text-xs ${
              aras === 0 ? "text-white/70" : "text-slate-400"
            }`}
          >
            {dibuka ? "▾" : "▸"}
          </button>
        )}

        {sunting === nod.id ? (
          <BorangSunting nod={nod} batal={() => setSunting(null)} simpan={simpan} />
        ) : (
          <>
            <span
              className={`font-semibold ${
                aras === 0 ? "text-base" : unit ? "text-sm text-navy-800" : "text-sm"
              }`}
            >
              {nod.label}
            </span>
            {nod.jawatan && (
              <span className={`text-xs ${aras === 0 ? "text-white/75" : "text-slate-500"}`}>
                {nod.jawatan}
              </span>
            )}
            {nod.kod && (
              <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] font-bold text-navy-700">
                {nod.kod}
              </span>
            )}
            {nod.rujukan && (
              <span className="text-[10px] italic text-slate-400">rujukan kumpulan</span>
            )}
            {unit && adaAnak && <span className="text-[11px] text-slate-400">{nod.anak.length}</span>}

            {nod.barisId && (
              <span className="tiada-cetak ml-auto flex gap-1">
                <button
                  type="button"
                  onClick={() => setSunting(nod.id)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-navy-50 hover:text-navy-700"
                >
                  Sunting
                </button>
                <button
                  type="button"
                  onClick={() => void buang(nod)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-[#fdf1f1] hover:text-[#8f2b2b]"
                >
                  Buang
                </button>
              </span>
            )}
          </>
        )}
      </div>

      {adaAnak && dibuka && (
        <div className="mt-0.5">
          {nod.anak.map((a) => (
            <Cabang
              key={a.id}
              nod={a}
              aras={aras + 1}
              tutup={tutup}
              togol={togol}
              sunting={sunting}
              setSunting={setSunting}
              simpan={simpan}
              buang={buang}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BorangSunting({
  nod, batal, simpan,
}: {
  nod: NodCarta;
  batal: () => void;
  simpan: (n: NodCarta, jawatan: string, nama: string) => Promise<void>;
}) {
  const [jawatan, setJawatan] = useState(nod.jawatan);
  const [nama, setNama] = useState(nod.label);
  const [sibuk, setSibuk] = useState(false);

  return (
    <span className="flex w-full flex-wrap items-center gap-2">
      <input
        value={jawatan}
        onChange={(e) => setJawatan(e.target.value)}
        placeholder="Jawatan"
        aria-label="Jawatan"
        className="w-36 rounded border border-garis px-2 py-1 text-xs"
      />
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Nama"
        aria-label="Nama"
        className="min-w-0 flex-1 rounded border border-garis px-2 py-1 text-xs"
      />
      <button
        type="button"
        disabled={sibuk}
        onClick={async () => {
          setSibuk(true);
          try {
            await simpan(nod, jawatan, nama);
          } finally {
            setSibuk(false);
          }
        }}
        className="rounded bg-navy-700 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {sibuk ? "…" : "Simpan"}
      </button>
      <button type="button" onClick={batal} className="text-xs text-slate-400 underline">
        Batal
      </button>
    </span>
  );
}

/* -------------------------------------------------------------- penolong */

function gantiNod(p: NodCarta, id: string, baharu: NodCarta): NodCarta {
  if (p.id === id) return baharu;
  return { ...p, anak: p.anak.map((a) => gantiNod(a, id, baharu)) };
}

function buangNod(p: NodCarta, id: string): NodCarta {
  return { ...p, anak: p.anak.filter((a) => a.id !== id).map((a) => buangNod(a, id)) };
}

/**
 * Nama jawatankuasa yang memiliki nod ini — iaitu lajur PERTAMA baris
 * asalnya dalam Buku Pengurusan.
 *
 * Perlu semasa menyimpan: menulis semula baris tanpa lajur itu akan
 * memindahkan seseorang keluar dari jawatankuasanya secara senyap.
 */
function kumpulanBagi(p: NodCarta, id: string, kumpulanUnit = ""): string {
  for (const a of p.anak) {
    if (a.id === id) return p.jenis === "unit" ? kumpulanUnit : "";
    if (!adaNod(a, id)) continue;
    // Unit BERSARANG: unit dalam unit ialah sub-jawatankuasa, dan namanya
    // yang menjadi lajur pertama.
    return kumpulanBagi(a, id, a.jenis === "unit" && p.jenis === "unit" ? a.label : kumpulanUnit);
  }
  return kumpulanUnit;
}

function adaNod(p: NodCarta, id: string): boolean {
  return p.id === id || p.anak.some((a) => adaNod(a, id));
}

function rataPokok(
  n: NodCarta,
  laluan: string[],
  lihat: (laluan: string[], n: NodCarta) => void,
) {
  lihat(laluan, n);
  const bawah = n.jenis === "unit" ? [...laluan, n.label] : laluan;
  for (const a of n.anak) rataPokok(a, bawah, lihat);
}

/** Tapis pokok, kekalkan induk bagi setiap padanan. */
function tapisPokok(n: NodCarta, cari: string): NodCarta {
  const padan = (x: NodCarta) =>
    x.label.toLowerCase().includes(cari) ||
    x.jawatan.toLowerCase().includes(cari) ||
    (x.kod ?? "").toLowerCase().includes(cari);

  const jalan = (x: NodCarta): NodCarta | null => {
    const anak = x.anak.map(jalan).filter((a): a is NodCarta => a !== null);
    if (anak.length > 0 || padan(x)) return { ...x, anak };
    return null;
  };
  return jalan(n) ?? { ...n, anak: [] };
}
