"use client";

import { useState } from "react";
import MuatTurun, { barisCsv, turunkanTeks } from "@/components/MuatTurun";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import { simpanUlasanMurid, type BarisSlip } from "@/lib/tindakan-pbd";
import { namaSubjek } from "@/data/subjek";
import { TAHAP } from "@/data/tahap";

/**
 * Slip PBD — apa yang guru kelas semak, dan apa yang ibu bapa terima.
 *
 * DUA PAPARAN DARI SATU DATA:
 *   · skrin — jadual padat untuk guru kelas menyemak seluruh kelas sekaligus
 *   · cetak — SATU SLIP SATU HALAMAN, kerana setiap slip pergi kepada
 *             keluarga yang berbeza dan tidak boleh berkongsi kertas
 *
 * Yang kedua itu sebabnya `@media print` di bawah wujud dan kenapa setiap
 * slip mempunyai `break-after: page`. Tanpanya guru kelas memotong 40 slip
 * dengan gunting.
 *
 * LAJUR HANYA UNTUK SUBJEK YANG ADA NILAI. Memapar 13 lajur kosong pada
 * slip Tahun 1 memberi ibu bapa gambaran anak mereka gagal 13 subjek.
 */

export default function PanelSlip({
  tahun, kelas, tahunSesi, namaSekolah, baris, subjekAda, subjekUasa, uasaAktif,
}: {
  tahun: number;
  kelas: string;
  tahunSesi: number;
  namaSekolah: string;
  baris: BarisSlip[];
  subjekAda: string[];
  subjekUasa: string[];
  uasaAktif: boolean;
}) {
  const [data, setData] = useState(baris);
  const [sunting, setSunting] = useState<string | null>(null);
  const [mesej, setMesej] = useState<{ ok: boolean; teks: string } | null>(null);

  const label = `${tahun} ${kelas}`;
  const subjek = subjekAda.slice().sort();
  const uasa = subjekUasa.slice().sort();

  async function simpanUlasan(id: string, teks: string) {
    const hasil = await simpanUlasanMurid(tahun, kelas, id, teks);
    setMesej({ ok: hasil.ok, teks: hasil.mesej });
    if (hasil.ok) {
      setData((lama) => lama.map((b) => (b.pendaftaran_id === id ? { ...b, ulasan: teks } : b)));
      setSunting(null);
    }
  }

  const turun = [
    {
      label: "PDF Slip PBD",
      nota: "TP dan sumatif, tanpa UASA.",
      jalan: () => mulaCetak("slip-pbd-cetak", `Slip PBD ${label}`),
    },
    {
      label: "CSV PBD",
      nota: "TP dan sumatif seluruh kelas.",
      jalan: () => {
        const kepala = ["Nama", ...subjek.flatMap((s) => [`${s} TP`, `${s} Sumatif`]), "Ulasan"];
        const isi = data.map((b) =>
          barisCsv([
            b.nama,
            ...subjek.flatMap((s) => [b.nilai[s]?.tp ?? "", b.nilai[s]?.sumatif ?? ""]),
            b.ulasan,
          ]),
        );
        turunkanTeks(
          `slip-pbd-${label.replace(/\s+/g, "-").toLowerCase()}-${tahunSesi}.csv`,
          "﻿" + [barisCsv(kepala), ...isi].join("\r\n"),
        );
      },
    },
    ...(uasaAktif && tahun === 6 && uasa.length > 0 ? [
      {
        label: "PDF Slip UASA",
        nota: "Slip berasingan: TP dan UASA sahaja.",
        jalan: () => mulaCetak("slip-uasa-cetak", `Slip UASA ${label}`),
      },
      {
        label: "CSV UASA",
        nota: "TP dan gred UASA A–C seluruh kelas.",
        jalan: () => {
          const kepala = ["Nama", ...uasa.flatMap((s) => [`${s} TP`, `${s} UASA`])];
          const isi = data.map((b) => barisCsv([
            b.nama,
            ...uasa.flatMap((s) => [b.nilai[s]?.tp ?? "", b.nilai[s]?.uasa ?? ""]),
          ]));
          turunkanTeks(
            `slip-uasa-${label.replace(/\s+/g, "-").toLowerCase()}-${tahunSesi}.csv`,
            "﻿" + [barisCsv(kepala), ...isi].join("\r\n"),
          );
        },
      },
    ] : []),
  ];

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #slip-pbd-cetak, #slip-pbd-cetak *, #slip-uasa-cetak, #slip-uasa-cetak * { visibility: visible; }
          #slip-pbd-cetak, #slip-uasa-cetak { position: absolute; inset: 0; width: 100%; }
          .tiada-cetak { display: none !important; }
          .satu-slip { break-after: page; page-break-after: always; }
          .satu-slip:last-child { break-after: auto; page-break-after: auto; }
          @page { size: A4 portrait; margin: 14mm; }
        }
      `}</style>

      <div className="tiada-cetak mt-6 flex items-center gap-3 rounded-xl border border-garis bg-white p-3">
        <p className="min-w-0 flex-1 text-sm text-slate-600">
          {data.length} murid · {subjek.length} subjek berisi
        </p>
        <MuatTurun pilihan={turun} tajuk="Muat turun slip" />
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

      {subjek.length === 0 && (
        <p className="tiada-cetak mt-4 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
          Belum ada guru subjek yang mengisi TP untuk kelas ini, jadi slip
          masih kosong. Slip boleh dicetak sebaik sahaja ada nilai.
        </p>
      )}
      {uasaAktif && tahun === 6 && uasa.length === 0 && (
        <p className="tiada-cetak mt-3 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm text-[#7a5a12]">
          UASA Tahun 6 sedang dibuka, tetapi belum ada gred UASA. Slip UASA akan muncul selepas gred A, B atau C disimpan.
        </p>
      )}

      {/* ---------- Skrin: jadual padat untuk semakan ---------- */}
      <div className="tiada-cetak mt-5 overflow-x-auto rounded-xl border border-garis bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-navy-50">
            <tr>
              <th className="p-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Nama</th>
              {subjek.map((s) => (
                <th key={s} className="p-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {s}
                </th>
              ))}
              <th className="p-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Ulasan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-garis">
            {data.map((b) => (
              <tr key={b.pendaftaran_id}>
                <td className="p-2 font-medium text-navy-800">{b.nama}</td>
                {subjek.map((s) => (
                  <td key={s} className="p-2 text-center">
                    <span className="font-semibold text-navy-800">TP {b.nilai[s]?.tp ?? "—"}</span>
                    {b.nilai[s]?.sumatif && (
                      <span className="ml-1 text-xs text-slate-500">· Sumatif {b.nilai[s]?.sumatif}</span>
                    )}
                  </td>
                ))}
                <td className="p-2">
                  {sunting === b.pendaftaran_id ? (
                    <BorangUlasan
                      awal={b.ulasan}
                      batal={() => setSunting(null)}
                      simpan={(t) => simpanUlasan(b.pendaftaran_id, t)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSunting(b.pendaftaran_id)}
                      className="text-left text-xs text-slate-500 underline-offset-2 hover:text-navy-700 hover:underline"
                    >
                      {b.ulasan || "Tulis ulasan…"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Cetak: satu slip satu halaman ---------- */}
      <div id="slip-pbd-cetak" data-cetak-kertas="portrait" className="hidden print:block">
        {data.map((b) => (
          <section key={b.pendaftaran_id} className="satu-slip">
            <header className="border-b-2 border-black pb-2 text-center">
              <h1 className="text-sm font-bold uppercase">{namaSekolah}</h1>
              <p className="mt-0.5 text-xs">
                Laporan Pentaksiran Bilik Darjah (PBD) · Sesi {tahunSesi}
              </p>
            </header>

            <div className="mt-3 text-xs">
              <p><b>Nama:</b> {b.nama}</p>
              <p className="mt-0.5"><b>Kelas:</b> {label}</p>
            </div>

            <table className="mt-3 w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-left">Mata Pelajaran</th>
                  <th className="w-16 border border-black p-1 text-center">TP</th>
                  <th className="w-16 border border-black p-1 text-center">Sumatif</th>
                </tr>
              </thead>
              <tbody>
                {subjek.map((s) => (
                  <tr key={s}>
                    <td className="border border-black p-1">{namaSubjek(s)}</td>
                    <td className="border border-black p-1 text-center font-bold">
                      {b.nilai[s]?.tp ?? "—"}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {b.nilai[s]?.sumatif ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 text-xs">
              <p className="font-bold">Ulasan Guru Kelas</p>
              <p className="mt-1 min-h-[3rem] border border-black p-2 leading-relaxed">
                {b.ulasan || " "}
              </p>
            </div>

            {/* Tafsiran TP dicetak pada SETIAP slip, bukan sekali di hujung.
                Setiap slip pergi kepada keluarga berbeza; helaian tafsiran
                yang berasingan hanya sampai kepada seorang ibu bapa. */}
            <div className="mt-3 text-[9px] leading-snug">
              <p className="font-bold">Tafsiran Tahap Penguasaan</p>
              <ul className="mt-0.5">
                {TAHAP.map((t) => (
                  <li key={t.tp}>
                    <b>TP{t.tp}</b> {t.tajuk} — {t.huraian}
                  </li>
                ))}
              </ul>
            </div>

          </section>
        ))}
      </div>

      {uasaAktif && tahun === 6 && uasa.length > 0 && (
        <div id="slip-uasa-cetak" data-cetak-kertas="portrait" className="hidden print:block">
          {data.map((b) => (
            <section key={b.pendaftaran_id} className="satu-slip">
              <header className="border-b-2 border-black pb-2 text-center">
                <h1 className="text-sm font-bold uppercase">{namaSekolah}</h1>
                <p className="mt-0.5 text-xs">Slip UASA Tahun 6 · Sesi {tahunSesi}</p>
              </header>
              <div className="mt-3 text-xs">
                <p><b>Nama:</b> {b.nama}</p>
                <p className="mt-0.5"><b>Kelas:</b> {label}</p>
              </div>
              <table className="mt-3 w-full border-collapse text-xs">
                <thead><tr>
                  <th className="border border-black p-1 text-left">Mata Pelajaran</th>
                  <th className="w-20 border border-black p-1 text-center">TP</th>
                  <th className="w-24 border border-black p-1 text-center">UASA</th>
                </tr></thead>
                <tbody>
                  {uasa.map((s) => (
                    <tr key={s}>
                      <td className="border border-black p-1">{namaSubjek(s)}</td>
                      <td className="border border-black p-1 text-center font-bold">{b.nilai[s]?.tp ?? "—"}</td>
                      <td className="border border-black p-1 text-center font-bold">{b.nilai[s]?.uasa ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function BorangUlasan({
  awal, batal, simpan,
}: {
  awal: string;
  batal: () => void;
  simpan: (teks: string) => Promise<void>;
}) {
  const [teks, setTeks] = useState(awal);
  const [sibuk, setSibuk] = useState(false);

  return (
    <span className="flex flex-wrap items-start gap-1.5">
      <textarea
        value={teks}
        onChange={(e) => setTeks(e.target.value.slice(0, 600))}
        rows={2}
        aria-label="Ulasan guru kelas"
        className="min-w-0 flex-1 rounded border border-garis px-2 py-1 text-xs"
      />
      <button
        type="button"
        disabled={sibuk}
        onClick={async () => { setSibuk(true); try { await simpan(teks); } finally { setSibuk(false); } }}
        className="rounded bg-navy-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {sibuk ? "…" : "Simpan"}
      </button>
      <button type="button" onClick={batal} className="text-xs text-slate-400 underline">
        Batal
      </button>
    </span>
  );
}
