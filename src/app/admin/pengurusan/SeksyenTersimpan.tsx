"use client";

import { useState } from "react";
import { tukarSeksyenTindakan, padamDokumenTindakan } from "@/lib/tindakan-pengurusan";
import { JENIS_SEKSYEN, type KodSeksyen } from "@/data/seksyen-pengurusan";

export interface BarisSeksyen {
  id: string;
  kod: KodSeksyen;
  tajuk: string;
  muka: string | null;
  keyakinan: number | null;
  paparan: "awam" | "dalaman";
  status: "draf" | "disahkan";
  amaran: string | null;
  bilBaris: number;
}

/**
 * Seksyen yang SUDAH disimpan — sahkan, tukar jenis, padam edisi.
 *
 * "Draf" dan "disahkan" bukan hiasan. Hanya seksyen DISAHKAN yang disuapkan
 * ke bahagian lain sistem (guru kelas, panitia, takwim). Seksyen draf duduk
 * dalam pangkalan data tanpa memberi kesan kepada sesiapa, jadi memuat naik
 * buku yang salah tidak pernah merosakkan apa-apa sehingga seseorang membaca
 * dan menekan Sahkan.
 *
 * Setiap baris ada keadaan SIBUKNYA SENDIRI. Satu keadaan sibuk yang dikongsi
 * pernah membekukan seluruh senarai apabila satu tindakan gagal — pepijat itu
 * berlaku dalam skrin Akses dan tidak akan diulang di sini.
 */
export default function SeksyenTersimpan({
  dokumenId, seksyen, namaFail,
}: {
  dokumenId: string;
  seksyen: BarisSeksyen[];
  namaFail: string;
}) {
  const [baris, setBaris] = useState(seksyen);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [ralat, setRalat] = useState<string | null>(null);
  const [dipadam, setDipadam] = useState(false);
  const [sahPadam, setSahPadam] = useState(false);

  async function ubah(id: string, tukar: Parameters<typeof tukarSeksyenTindakan>[1]) {
    setSibuk(id);
    setRalat(null);
    try {
      const hasil = await tukarSeksyenTindakan(id, tukar);
      if (!hasil.ok) { setRalat(hasil.mesej); return; }
      setBaris((lama) => lama.map((b) => (b.id === id ? { ...b, ...tukar } : b)));
    } catch (e) {
      setRalat(e instanceof Error ? e.message : String(e));
    } finally {
      setSibuk(null);
    }
  }

  async function padam() {
    setSibuk(dokumenId);
    try {
      const hasil = await padamDokumenTindakan(dokumenId);
      if (hasil.ok) setDipadam(true);
      else setRalat(hasil.mesej);
    } finally {
      setSibuk(null);
    }
  }

  if (dipadam) return null;

  const disahkan = baris.filter((b) => b.status === "disahkan").length;

  return (
    <div>
      {ralat && (
        <p className="mb-3 rounded-lg border border-[#e9c4c4] bg-[#fdf1f1] p-3 text-xs text-[#8f2b2b]">
          {ralat}
        </p>
      )}

      <ul className="divide-y divide-garis">
        {baris.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-navy-800">{b.tajuk}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {NAMA[b.kod] ?? b.kod} · m.{b.muka ?? "?"} · {b.bilBaris.toLocaleString("ms-MY")} baris
                {b.paparan === "awam" && " · dipapar awam"}
              </span>
              {b.amaran && <span className="mt-1 block text-xs text-[#8f2b2b]">⚠ {b.amaran}</span>}
            </span>

            <select
              value={b.kod} disabled={sibuk === b.id}
              onChange={(e) => void ubah(b.id, { kod: e.target.value as KodSeksyen })}
              className="rounded-lg border border-garis px-2 py-1.5 text-xs"
              aria-label={`Jenis untuk ${b.tajuk}`}
            >
              {JENIS_SEKSYEN.map((j) => <option key={j.kod} value={j.kod}>{j.nama}</option>)}
              <option value="lain">Lain-lain</option>
            </select>

            <button
              onClick={() => void ubah(b.id, { status: b.status === "disahkan" ? "draf" : "disahkan" })}
              disabled={sibuk === b.id}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                b.status === "disahkan"
                  ? "bg-[#e5f4ec] text-[#167a4b]"
                  : "border border-navy-700 text-navy-700"
              }`}
            >
              {sibuk === b.id ? "…" : b.status === "disahkan" ? "✓ Disahkan" : "Sahkan"}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-garis pt-3">
        <p className="text-xs text-slate-500">
          {disahkan} daripada {baris.length} seksyen disahkan. Hanya seksyen
          yang <b>disahkan</b> disuapkan ke bahagian lain portal.
        </p>
        {sahPadam ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-[#8f2b2b]">Padam {namaFail} dan semua barisnya?</span>
            <button
              onClick={() => void padam()} disabled={sibuk === dokumenId}
              className="rounded-lg bg-[#8f2b2b] px-3 py-1.5 font-bold text-white disabled:opacity-50"
            >
              Ya, padam
            </button>
            <button onClick={() => setSahPadam(false)} className="text-slate-500 underline">Batal</button>
          </span>
        ) : (
          <button onClick={() => setSahPadam(true)} className="text-xs text-slate-400 underline hover:text-[#8f2b2b]">
            Padam edisi ini
          </button>
        )}
      </div>
    </div>
  );
}

const NAMA: Record<string, string> = Object.fromEntries(
  JENIS_SEKSYEN.map((j) => [j.kod, j.nama]),
);
