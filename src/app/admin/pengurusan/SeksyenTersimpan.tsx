"use client";

import { useState } from "react";
import { tukarSeksyenTindakan, padamDokumenTindakan, lihatBaris } from "@/lib/tindakan-pengurusan";
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

  /**
   * Baris yang sedang disemak, dan seksyen mana yang PERNAH dibuka.
   *
   * Yang kedua penting: butang "Sahkan" pada seksyen yang belum pernah
   * dilihat dipaparkan sebagai cadangan lembut, bukan tindakan utama.
   * Pengguna melaporkan mereka menekan Sahkan pada data yang mereka tidak
   * pernah lihat — kerana tiada apa pun untuk dilihat. Sekarang ada, dan
   * skrin menggalakkan membacanya dahulu tanpa menghalang sesiapa.
   */
  const [buka, setBuka] = useState<string | null>(null);
  const [isi, setIsi] = useState<Record<string, { baris: string[][]; mesej: string }>>({});
  const [memuat, setMemuat] = useState<string | null>(null);
  const [dilihat, setDilihat] = useState<Set<string>>(new Set());
  const [cari, setCari] = useState("");

  async function togol(id: string) {
    if (buka === id) { setBuka(null); return; }
    setBuka(id);
    setCari("");
    setDilihat((s) => new Set(s).add(id));
    if (isi[id]) return;
    setMemuat(id);
    try {
      const r = await lihatBaris(id);
      if (r.ok && r.baris) {
        setIsi((lama) => ({ ...lama, [id]: { baris: r.baris!, mesej: r.mesej } }));
      } else {
        setRalat(r.mesej);
      }
    } finally {
      setMemuat(null);
    }
  }

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
          <li key={b.id} className="py-3">
            {/* Susunan MENURUN pada telefon, melintang pada skrin lebar.
                Susunan melintang sahaja memicit tajuk seksyen menjadi lajur
                selebar satu perkataan pada telefon — setiap tajuk menjadi
                enam baris teks bertindan dengan dropdown di sebelahnya. */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-navy-800">{b.tajuk}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {NAMA[b.kod] ?? b.kod} · m.{b.muka ?? "?"} · {b.bilBaris.toLocaleString("ms-MY")} baris
                  {b.paparan === "awam" && " · dipapar awam"}
                </span>
                {b.amaran && <span className="mt-1 block text-xs text-[#8f2b2b]">⚠ {b.amaran}</span>}
              </span>

              <span className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void togol(b.id)}
                  disabled={memuat === b.id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    buka === b.id
                      ? "bg-navy-700 text-white"
                      : "border border-garis text-navy-700 hover:border-navy-700"
                  }`}
                >
                  {memuat === b.id ? "Memuat…" : buka === b.id ? "Tutup" : "Semak isi"}
                </button>

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
                  title={
                    b.status !== "disahkan" && !dilihat.has(b.id)
                      ? "Semak isinya dahulu — tekan “Semak isi”."
                      : undefined
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                    b.status === "disahkan"
                      ? "bg-[#e5f4ec] text-[#167a4b]"
                      : dilihat.has(b.id)
                        ? "bg-navy-700 text-white"
                        : "border border-garis text-slate-400"
                  }`}
                >
                  {sibuk === b.id ? "…" : b.status === "disahkan" ? "✓ Disahkan" : "Sahkan"}
                </button>
              </span>
            </div>

            {buka === b.id && isi[b.id] && (
              <div className="mt-3 rounded-xl border border-garis bg-navy-50/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={cari}
                    onChange={(e) => setCari(e.target.value)}
                    placeholder="Cari dalam seksyen ini…"
                    aria-label={`Cari dalam ${b.tajuk}`}
                    className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-1.5 text-xs"
                  />
                  <span className="text-xs text-slate-500">{isi[b.id].mesej}</span>
                </div>

                <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-garis bg-white">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-garis">
                      {tapisBaris(isi[b.id].baris, cari).map((r, i) => (
                        <tr key={i}>
                          {r.map((c, n) => (
                            <td key={n} className="px-2 py-1.5 align-top text-slate-700">
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {tapisBaris(isi[b.id].baris, cari).length === 0 && (
                        <tr>
                          <td className="px-3 py-4 text-center text-slate-500">
                            Tiada baris sepadan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-garis pt-3">
        <p className="text-xs leading-relaxed text-slate-500">
          {disahkan} daripada {baris.length} seksyen disahkan. Hanya seksyen
          yang <b>disahkan</b> disuapkan ke bahagian lain portal — carta
          organisasi, takwim, guru kelas.
          <br />
          Tekan <b>Semak isi</b> untuk melihat baris sebenar sebelum mengesahkan.
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

/** Tapis baris mengikut carian — semua lajur, huruf besar diabaikan. */
function tapisBaris(baris: string[][], cari: string): string[][] {
  const t = cari.trim().toLowerCase();
  if (!t) return baris;
  return baris.filter((r) => r.some((c) => (c ?? "").toLowerCase().includes(t)));
}

const NAMA: Record<string, string> = Object.fromEntries(
  JENIS_SEKSYEN.map((j) => [j.kod, j.nama]),
);
