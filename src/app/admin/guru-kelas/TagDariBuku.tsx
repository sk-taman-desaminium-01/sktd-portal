"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tagGuruKelas, type CalonTag, type HasilTag } from "@/lib/tag-guru-kelas";

/**
 * Tag guru kelas terus daripada Buku Pengurusan.
 *
 * LARIAN KERING DAHULU, SENTIASA. Pentadbir melihat senarai penuh — apa yang
 * akan ditag, apa yang dilangkau, dan sebabnya — sebelum satu baris pun
 * ditulis. Peraturan keras #5: tiada import tanpa larian kering.
 *
 * Guru sedang log masuk sekarang, jadi butang ini TIDAK PERNAH menimpa
 * tugasan sedia ada. Kelas yang sudah ada guru kelas dipaparkan sebagai
 * "sudah ada" dan dibiarkan.
 */

const LABEL: Record<CalonTag["keputusan"], { teks: string; warna: string }> = {
  "boleh": { teks: "Akan ditag", warna: "bg-[#e5f4ec] text-[#14603c]" },
  "sudah-ada": { teks: "Sudah ada — tidak disentuh", warna: "bg-slate-100 text-slate-600" },
  "tiada-padanan": { teks: "Nama tiada dalam senarai akses", warna: "bg-[#fdf3dc] text-[#9a6b06]" },
  "kabur": { teks: "Lebih sekali padanan — dilangkau", warna: "bg-[#fbeaea] text-[#8f2424]" },
  "kelas-tak-dikenali": { teks: "Kelas tidak dikenali", warna: "bg-[#fbeaea] text-[#8f2424]" },
};

export default function TagDariBuku() {
  const router = useRouter();
  const [calon, setCalon] = useState<CalonTag[] | null>(null);
  const [diagnostik, setDiagnostik] = useState<HasilTag["diagnostik"]>(undefined);
  const [mesej, setMesej] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function jalan(tulis: boolean) {
    setSibuk(true);
    setMesej(null);
    try {
      const r = await tagGuruKelas(tulis);
      setCalon(r.calon);
      setDiagnostik(r.diagnostik);
      setMesej({ ok: r.ok, teks: r.mesej });
      if (r.ditulis) router.refresh();
    } catch (e) {
      setMesej({ ok: false, teks: e instanceof Error ? e.message : "Gagal membaca Buku Pengurusan." });
    } finally {
      setSibuk(false);
    }
  }

  const bolehTag = calon?.filter((c) => c.keputusan === "boleh").length ?? 0;

  return (
    <section className="mt-8 rounded-xl border-2 border-navy-100 bg-white p-4">
      <h2 className="text-base font-bold text-navy-800">Tag dari Buku Pengurusan</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Padan nama guru kelas dalam buku dengan senarai akses portal.{" "}
        <b>Kelas yang sudah ada guru kelas tidak disentuh.</b>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button" onClick={() => void jalan(false)} disabled={sibuk}
          className="min-h-11 touch-manipulation rounded-lg border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 disabled:opacity-50"
        >
          Semak dahulu
        </button>
        {bolehTag > 0 && (
          <button
            type="button" onClick={() => void jalan(true)} disabled={sibuk}
            className="min-h-11 touch-manipulation rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Tag {bolehTag} kelas
          </button>
        )}
      </div>

      {mesej && (
        <p className={`mt-3 text-sm leading-relaxed ${mesej.ok ? "text-[#14603c]" : "text-[#8f2424]"}`}>
          {mesej.teks}
        </p>
      )}

      {/* TIADA PADANAN? TUNJUKKAN BENTUK SEBENAR BUKU.
          "0 kelas boleh ditag" tidak memberitahu apa-apa: adakah seksyen
          kosong, lajur berbeza, atau nama ditulis lain? Contoh baris di sini
          menjawabnya tanpa sesiapa perlu meneka. */}
      {diagnostik && (
        <div className="mt-3 rounded-lg border border-[#e9d9ae] bg-[#fdf9f0] p-3 text-xs leading-relaxed text-[#7a5a12]">
          <p><b>Seksyen:</b> {diagnostik.tajuk || "(tiada tajuk)"} · <b>{diagnostik.bilBaris}</b> baris</p>
          {diagnostik.lajur.length > 0 && <p className="mt-1"><b>Lajur:</b> {diagnostik.lajur.join(" | ")}</p>}
          {diagnostik.contoh.length > 0 && (
            <>
              <p className="mt-2"><b>Contoh baris yang tidak dikenali:</b></p>
              <ul className="mt-1 space-y-0.5 font-mono text-[11px]">
                {diagnostik.contoh.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {calon && calon.length > 0 && (
        <ul className="mt-3 max-h-80 divide-y divide-garis overflow-auto rounded-lg border border-garis">
          {calon.map((c) => (
            <li key={c.kelas} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0">
                <b className="text-navy-800">{c.kelas}</b>{" "}
                <span className="text-slate-600">{c.namaPortal ?? c.namaBuku}</span>
                {c.calon && c.calon.length > 0 && (
                  <span className="block text-xs text-slate-500">{c.calon.join(" · ")}</span>
                )}
              </span>
              <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${LABEL[c.keputusan].warna}`}>
                {LABEL[c.keputusan].teks}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
