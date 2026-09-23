"use client";

import { useMemo, useState } from "react";
import MuatTurun, { barisCsv, turunkanTeks } from "@/components/MuatTurun";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import { suntingNod, padamNod, ambilCarta } from "@/lib/tindakan-carta";
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
  const [sahBuang, setSahBuang] = useState<string | null>(null);
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

  /**
   * Simpan suntingan — DUA BENTUK BARIS, dua laluan.
   *
   * Nod jawatankuasa datang dari baris [jawatankuasa, jawatan, nama]. Nod di
   * bawah "Guru & Kakitangan Lain" datang dari SENARAI NAMA GURU, yang
   * bentuknya [bil, nama, kod, opsyen] — dan kadang-kadang satu sel sahaja,
   * "NAMA KPT (JAWATAN)". Menulis bentuk jawatankuasa ke atas baris itu
   * memusnahkan kod dan opsyen sekali gus, jadi pelayan yang mencari sel
   * nama dan menukar hanya bahagian itu.
   */
  async function simpan(nod: NodCarta, sel: string[]) {
    if (!nod.barisId) return;
    try {
      const hasil = await suntingNod(nod.barisId, sel);
      setMesej({ ok: hasil.ok, teks: hasil.mesej });
      if (hasil.ok) {
        const carta = await ambilCarta();
        if (carta.punca) setPokok(carta.punca);
        else setMesej({ ok: false, teks: "Suntingan disimpan tetapi carta gagal dimuat semula. " + carta.mesej });
        setSunting(null);
      }
    } catch {
      setMesej({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    }
  }

  /**
   * Buang seorang dari carta — dan dari edisi akan datang juga.
   *
   * Pengesahan diperlukan kerana ini memadam baris Buku Pengurusan, bukan
   * sekadar menyembunyikan nod. Guru yang bertukar sekolah memang perlu
   * dibuang; tekan silap pada nama yang betul pula memerlukan muat naik
   * semula seluruh buku untuk dipulihkan.
   */
  async function buang(nod: NodCarta) {
    if (!nod.barisId) return;
    try {
      const hasil = await padamNod(nod.barisId);
      setMesej({ ok: hasil.ok, teks: hasil.mesej });
      if (hasil.ok) setPokok((p) => buangNod(p, nod.id));
      setSahBuang(null);
    } catch {
      setMesej({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    }
  }

  const turun = [
    {
      label: "PDF (cetak)",
      nota: "Buka dialog cetak — pilih “Simpan sebagai PDF”.",
      jalan: () => mulaCetak("carta-cetak", `Carta Organisasi ${tahun}`),
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
      <h2 className="tiada-cetak mt-8 text-base font-bold text-navy-800">
        Semak dan betulkan
      </h2>
      <p className="tiada-cetak mt-1 text-sm leading-relaxed text-slate-500">
        Nama di puncak carta mengikut <b>Barisan Pentadbir</b>, bukan buku —
        jadi ia kekal terkini apabila Guru Besar atau Penolong Kanan bertukar.
        Nama lain datang dari Buku Pengurusan dan boleh dibetulkan di sini.
      </p>

      <div className="tiada-cetak mt-3 flex items-center gap-3 rounded-xl border border-garis bg-white p-3">
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

      <div id="carta-cetak" data-cetak-kertas="portrait" className="mt-4">
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
          sahBuang={sahBuang}
          setSahBuang={setSahBuang}
        />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- cabang */

function Cabang({
  nod, aras, tutup, togol, sunting, setSunting, simpan, buang, sahBuang, setSahBuang,
}: {
  nod: NodCarta;
  aras: number;
  tutup: Set<string>;
  togol: (id: string) => void;
  sunting: string | null;
  setSunting: (id: string | null) => void;
  simpan: (n: NodCarta, sel: string[]) => Promise<void>;
  buang: (n: NodCarta) => Promise<void>;
  sahBuang: string | null;
  setSahBuang: (id: string | null) => void;
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
              aras === 0 ? "text-white/70" : "text-slate-500"
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
              <span className="text-[10px] italic text-slate-500">rujukan kumpulan</span>
            )}
            {unit && adaAnak && <span className="text-[11px] text-slate-500">{nod.anak.length}</span>}

            {nod.ejaanBuku && (
              <span className="text-[10px] italic text-slate-500" title="Ejaan dalam Buku Pengurusan berbeza; dipadankan kepada senarai nama guru">
                buku: {nod.ejaanBuku}
              </span>
            )}

            {nod.barisId && (
              <span className="tiada-cetak ml-auto flex items-center gap-1">
                {sahBuang === nod.id ? (
                  <>
                    <span className="text-[11px] text-[#8f2b2b]">Buang {nod.label}?</span>
                    <button
                      type="button"
                      onClick={() => void buang(nod)}
                      className="rounded bg-[#8f2b2b] px-2 py-0.5 text-[11px] font-bold text-white"
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => setSahBuang(null)}
                      className="px-1 text-[11px] text-slate-500 underline"
                    >
                      Batal
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSunting(nod.id)}
                      className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-navy-50 hover:text-navy-700"
                    >
                      Sunting
                    </button>
                    <button
                      type="button"
                      onClick={() => setSahBuang(nod.id)}
                      className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-[#fdf1f1] hover:text-[#8f2b2b]"
                    >
                      Buang
                    </button>
                  </>
                )}
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
              sahBuang={sahBuang}
              setSahBuang={setSahBuang}
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
  simpan: (n: NodCarta, sel: string[]) => Promise<void>;
}) {
  const [sel, setSel] = useState(nod.selAsal ?? []);
  const [sibuk, setSibuk] = useState(false);

  return (
    <span className="flex w-full flex-wrap items-center gap-2">
      {sel.map((nilai, i) => (
        <label key={i} className="text-xs">Lajur {i + 1}
          <input value={nilai} onChange={(e) => setSel((lama) => lama.map((v, j) => j === i ? e.target.value : v))}
            disabled={sibuk} className="block rounded border border-garis px-2 py-1" />
        </label>
      ))}
      <button
        type="button"
        disabled={sibuk}
        onClick={async () => {
          setSibuk(true);
          try {
            await simpan(nod, sel);
          } finally {
            setSibuk(false);
          }
        }}
        className="rounded bg-navy-700 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {sibuk ? "…" : "Simpan"}
      </button>
      <button type="button" onClick={batal} className="text-xs text-slate-500 underline">
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
