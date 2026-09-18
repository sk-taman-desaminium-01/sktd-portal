"use client";

import { useMemo, useState } from "react";
import { ikutBulan, type AcaraTakwim } from "@/lib/takwim";

/**
 * Carian TARIKH untuk takwim (permintaan N) — bukan carian huruf, kerana
 * orang mencari takwim dengan bertanya "apa jadi pada tarikh ini", bukan
 * dengan mengingati perkataan dalam nama program.
 */
export default function PanelTakwim({
  acara, dokTahun,
}: {
  acara: AcaraTakwim[];
  dokTahun: number | null;
}) {
  const [carian, setCarian] = useState("");

  // Tarikh hari ini di Malaysia, bukan di pelayan.
  //
  // Pelayan Vercel berjalan pada UTC. Pada pukul 8 pagi waktu Malaysia, UTC
  // masih semalam — jadi acara hari ini akan diwarnakan "selesai" pada waktu
  // ia sebenarnya sedang berlangsung. Ini bukan andaian: ia sebabnya setiap
  // perbandingan tarikh dalam sistem ini menggunakan zon waktu yang jelas.
  const hariIni = useMemo(() => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()), []);

  const selesai = acara.filter((a) => a.tarikh && a.tarikh < hariIni).length;

  const dipapar = carian ? acara.filter((a) => a.tarikh === carian) : acara;
  const bulan = ikutBulan(dipapar);

  return (
    <>
      <p className="mt-1 text-sm text-slate-500">
        {acara.length.toLocaleString("ms-MY")} program
        {dokTahun ? ` · Buku Pengurusan edisi ${dokTahun}` : ""}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Cari tarikh</span>
          <input
            type="date"
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
            className="rounded-lg border border-garis px-3 py-1.5 text-sm"
          />
        </label>
        {carian && (
          <button
            type="button"
            onClick={() => setCarian("")}
            className="text-xs text-slate-500 underline hover:text-navy-700"
          >
            Padam carian
          </button>
        )}
      </div>

      {/* Warna hijau bermakna SELESAI, dan maksudnya dinyatakan sekali
          di sini. Warna tanpa penjelasan ialah teka-teki: pengguna
          melihat baris hijau dan tertanya sama ada ia amaran. */}
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm bg-[#cfe9db]" />
          Tarikh telah berlalu — {selesai.toLocaleString("ms-MY")} selesai
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm bg-[#f6e2a8]" />
          Hari ini
        </span>
      </p>

      {carian && dipapar.length === 0 && (
        <p className="mt-6 rounded-xl border border-garis bg-white p-5 text-sm text-slate-500">
          Tiada program pada tarikh ini.
        </p>
      )}

      {bulan.map((b) => (
        <section key={b.bulan} className="mt-7">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-emas">
            {b.bulan}
          </h2>

          <div className="mt-2 overflow-x-auto rounded-xl border border-garis bg-white">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-navy-50">
                <tr>
                  <th className="w-24 p-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Minggu</th>
                  <th className="w-24 p-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Tarikh</th>
                  <th className="w-20 p-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Hari</th>
                  <th className="p-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Program</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garis">
                {b.acara.map((a, i) => {
                  const lalu = !!a.tarikh && a.tarikh < hariIni;
                  const kini = a.tarikh === hariIni;
                  return (
                  <tr
                    key={`${a.tarikh}-${a.program}-${i}`}
                    className={`align-top ${
                      kini ? "bg-[#fdf6e3]" : lalu ? "bg-[#f2faf5]" : ""
                    }`}
                  >
                    <td className="p-2 text-xs text-slate-500">{a.minggu}</td>
                    <td className={`p-2 whitespace-nowrap font-mono text-xs ${lalu ? "text-[#167a4b]" : "text-navy-800"}`}>
                      {a.tarikh ? tarikhPendek(a.tarikh) : a.tarikhTeks}
                    </td>
                    <td className="p-2 text-xs text-slate-600">{a.hari}</td>
                    <td className="p-2">
                      <span className={`block ${lalu ? "text-[#2f7d57]" : "text-navy-800"}`}>
                        {lalu && <span aria-hidden="true" className="mr-1">✓</span>}
                        {a.program}
                      </span>
                      {a.unit && (
                        <span className="mt-0.5 block text-[11px] text-slate-400">{a.unit}</span>
                      )}
                      {kini && (
                        <span className="mt-0.5 block text-[11px] font-semibold text-[#7a5a12]">
                          Hari ini
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}

/** "2025-01-09" → "9 Jan". Tahun ditunjukkan pada tajuk bulan. */
function tarikhPendek(iso: string): string {
  const B = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];
  return `${Number(iso.slice(8, 10))} ${B[Number(iso.slice(5, 7)) - 1]}`;
}
