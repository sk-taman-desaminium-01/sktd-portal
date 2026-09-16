"use client";

import { useState } from "react";
import { simpanIsi, type BarisIsi } from "@/lib/tindakan-pbd";

/**
 * Skrin guru subjek: satu kelas, satu subjek, TP dan gred untuk setiap murid.
 *
 * SATU SIMPAN untuk seluruh kelas, bukan satu simpan setiap murid. 40 murid
 * bermakna 40 perjalanan rangkaian, dan guru yang menaip pantas akan
 * mendahului tulisan yang belum selesai.
 *
 * MEDAN KOSONG BUKAN PADAM. Corak "kosong = padam" pernah memusnahkan TP
 * yang guru sudah masukkan dalam projek lain. Di sini, medan yang tidak
 * disentuh tidak dihantar langsung; hanya medan yang guru ubah dihantar,
 * dan medan yang guru KOSONGKAN sendiri dihantar sebagai null.
 */

const GRED = ["", "A", "B", "C", "D", "E"];

export default function PanelIsi({
  tahun, kelas, subjek, awal, bolehTulis, sesiTutup,
}: {
  tahun: number;
  kelas: string;
  subjek: string;
  awal: BarisIsi[];
  bolehTulis: boolean;
  sesiTutup: boolean;
}) {
  const [baris, setBaris] = useState(awal);
  const [diubah, setDiubah] = useState<Set<string>>(new Set());
  const [sibuk, setSibuk] = useState(false);
  const [mesej, setMesej] = useState<{ ok: boolean; teks: string } | null>(null);

  function ubah(id: string, medan: "tp" | "sumatif", nilai: string) {
    setBaris((lama) =>
      lama.map((b) => {
        if (b.pendaftaran_id !== id) return b;
        if (medan === "tp") {
          const n = nilai === "" ? null : Number(nilai);
          return { ...b, tp: n };
        }
        return { ...b, sumatif: nilai === "" ? null : nilai };
      }),
    );
    setDiubah((s) => new Set(s).add(id));
    setMesej(null);
  }

  async function simpan() {
    if (diubah.size === 0) {
      setMesej({ ok: false, teks: "Tiada perubahan untuk disimpan." });
      return;
    }
    setSibuk(true);
    try {
      const hantar = baris
        .filter((b) => diubah.has(b.pendaftaran_id))
        .map((b) => ({ pendaftaran_id: b.pendaftaran_id, tp: b.tp, sumatif: b.sumatif }));
      const hasil = await simpanIsi(tahun, kelas, subjek, hantar);
      setMesej({ ok: hasil.ok, teks: hasil.mesej });
      if (hasil.ok) setDiubah(new Set());
    } catch (e) {
      setMesej({ ok: false, teks: e instanceof Error ? e.message : String(e) });
    } finally {
      setSibuk(false);
    }
  }

  const berisi = baris.filter((b) => b.tp !== null).length;

  return (
    <>
      {sesiTutup && (
        <p className="mt-4 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
          Sesi ini sudah <b>ditutup</b>. Keputusannya boleh dilihat tetapi tidak
          boleh diubah lagi.
        </p>
      )}
      {!bolehTulis && !sesiTutup && (
        <p className="mt-4 rounded-xl border border-garis bg-navy-50 p-4 text-sm leading-relaxed text-navy-800">
          Anda melihat kelas ini sebagai <b>guru kelas</b>. Hanya guru subjek
          yang ditugaskan boleh mengisi TP di sini.
        </p>
      )}

      {mesej && (
        <p
          className={`mt-4 rounded-xl border p-4 text-sm ${
            mesej.ok
              ? "border-[#bfe3ce] bg-[#eef8f2] text-[#15693f]"
              : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
          }`}
        >
          {mesej.teks}
        </p>
      )}

      <div className="mt-5 overflow-x-auto rounded-xl border border-garis bg-white">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-navy-50">
            <tr>
              <th className="w-10 p-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">#</th>
              <th className="p-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Nama</th>
              <th className="w-24 p-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">TP</th>
              <th className="w-24 p-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">UASA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-garis">
            {baris.map((b, i) => (
              <tr key={b.pendaftaran_id} className={diubah.has(b.pendaftaran_id) ? "bg-[#fffdf5]" : undefined}>
                <td className="p-2 text-xs text-slate-400">{i + 1}</td>
                <td className="p-2 font-medium text-navy-800">{b.nama}</td>
                <td className="p-2">
                  <select
                    value={b.tp ?? ""}
                    disabled={!bolehTulis}
                    onChange={(e) => ubah(b.pendaftaran_id, "tp", e.target.value)}
                    aria-label={`TP untuk ${b.nama}`}
                    className="w-16 rounded border border-garis px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    value={b.sumatif ?? ""}
                    disabled={!bolehTulis}
                    onChange={(e) => ubah(b.pendaftaran_id, "sumatif", e.target.value)}
                    aria-label={`Gred UASA untuk ${b.nama}`}
                    className="w-16 rounded border border-garis px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {GRED.map((g) => (
                      <option key={g || "kosong"} value={g}>{g || "—"}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {baris.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-slate-500">
                  Tiada murid dalam kelas ini untuk sesi semasa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {berisi} daripada {baris.length} murid sudah ada TP
          {diubah.size > 0 && ` · ${diubah.size} belum disimpan`}
        </p>
        {bolehTulis && (
          <button
            onClick={() => void simpan()}
            disabled={sibuk || diubah.size === 0}
            className="rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sibuk ? "Menyimpan…" : "Simpan"}
          </button>
        )}
      </div>
    </>
  );
}
