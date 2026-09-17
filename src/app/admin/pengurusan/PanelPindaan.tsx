"use client";

import { useEffect, useState } from "react";
import {
  senaraiPindaanTindakan, tambahPindaanTindakan, togolPindaanTindakan,
  padamPindaanTindakan, kenakanPindaanEdisi,
} from "@/lib/tindakan-pengurusan";
import type { Pindaan, JenisPindaan } from "@/lib/pindaan";

/**
 * PEMBETULAN KEKAL — apa yang buku salah, setiap tahun.
 *
 * Buku Pengurusan dicetak sekali setahun dan sentiasa sedikit ketinggalan
 * berbanding sekolah sebenar. Edisi 2026 menyenaraikan Guru Besar yang
 * bersara pada 7 Januari sebagai pengerusi setiap unit, kerana pada hari ia
 * dicetak itu memang benar.
 *
 * Skrin ini menyimpan pembetulan itu SEKALI. Ia dikenakan pada edisi yang
 * sedang tersimpan bila ditekan, dan automatik pada setiap edisi yang dimuat
 * naik selepas ini.
 */

const JENIS: { kod: JenisPindaan; nama: string; huraian: string }[] = [
  {
    kod: "ganti_nama",
    nama: "Tukar orang",
    huraian: "Seseorang digantikan orang lain — pertukaran, kenaikan pangkat, persaraan.",
  },
  {
    kod: "buang_nama",
    nama: "Sudah tiada",
    huraian: "Orang ini tiada lagi di sekolah. Baris yang menamakannya digugurkan.",
  },
  {
    kod: "ganti_teks",
    nama: "Betulkan teks",
    huraian: "Jawatan atau tajuk yang tersalah eja dalam cetakan.",
  },
];

export default function PanelPindaan({ dokumenId }: { dokumenId: string | null }) {
  const [senarai, setSenarai] = useState<Pindaan[] | null>(null);
  const [jenis, setJenis] = useState<JenisPindaan>("ganti_nama");
  const [dari, setDari] = useState("");
  const [kepada, setKepada] = useState("");
  const [sebab, setSebab] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [buka, setBuka] = useState(false);

  useEffect(() => {
    if (!buka || senarai) return;
    void senaraiPindaanTindakan().then((r) => setSenarai(r.pindaan ?? []));
  }, [buka, senarai]);

  async function tambah() {
    setSibuk(true);
    setNota(null);
    try {
      const r = await tambahPindaanTindakan({ jenis, dari, kepada, sebab });
      setNota(r.mesej);
      if (!r.ok) return;
      setDari(""); setKepada(""); setSebab("");
      setSenarai((await senaraiPindaanTindakan()).pindaan ?? []);
    } finally {
      setSibuk(false);
    }
  }

  async function togol(p: Pindaan) {
    setSenarai((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, aktif: !x.aktif } : x)));
    await togolPindaanTindakan(p.id, !p.aktif);
  }

  async function padam(id: string) {
    setSenarai((l) => (l ?? []).filter((x) => x.id !== id));
    await padamPindaanTindakan(id);
  }

  async function kenakan() {
    if (!dokumenId) return;
    setSibuk(true);
    setNota(null);
    try {
      setNota((await kenakanPindaanEdisi(dokumenId)).mesej);
    } finally {
      setSibuk(false);
    }
  }

  const aktif = (senarai ?? []).filter((p) => p.aktif).length;

  return (
    <section className="mt-6 rounded-2xl border border-garis bg-white p-4 sm:p-5">
      <button
        onClick={() => setBuka((b) => !b)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold text-navy-800">Pembetulan kekal</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
            Apa yang buku salah setiap tahun — Guru Besar yang sudah bersara, jawatan
            yang tersalah eja. Dibetulkan sekali, dikenakan pada setiap edisi selepas ini.
          </span>
        </span>
        <span className="shrink-0 text-xs text-slate-400">
          {senarai ? `${aktif} aktif` : ""} {buka ? "▴" : "▾"}
        </span>
      </button>

      {buka && (
        <div className="mt-4 border-t border-garis pt-4">
          {nota && (
            <p className="mb-3 rounded-lg border border-[#c6e2d1] bg-[#eef8f2] p-2.5 text-xs text-[#167a4b]">
              {nota}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="block text-xs font-semibold text-slate-500">Jenis</span>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as JenisPindaan)}
                className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm"
              >
                {JENIS.map((j) => <option key={j.kod} value={j.kod}>{j.nama}</option>)}
              </select>
              <span className="mt-1 block text-[11px] text-slate-400">
                {JENIS.find((j) => j.kod === jenis)?.huraian}
              </span>
            </label>

            <label>
              <span className="block text-xs font-semibold text-slate-500">
                Teks dalam buku
              </span>
              <input
                value={dari}
                onChange={(e) => setDari(e.target.value)}
                placeholder="SHABARIAH BINTI ISMAIL"
                className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm"
              />
            </label>

            <label>
              <span className="block text-xs font-semibold text-slate-500">
                Ditukar kepada
              </span>
              <input
                value={kepada}
                onChange={(e) => setKepada(e.target.value)}
                disabled={jenis === "buang_nama"}
                placeholder={jenis === "buang_nama" ? "— baris digugurkan —" : "Nama Guru Besar baharu"}
                className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm disabled:bg-navy-50/50 disabled:text-slate-400"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="block text-xs font-semibold text-slate-500">Sebab (untuk rekod)</span>
              <input
                value={sebab}
                onChange={(e) => setSebab(e.target.value)}
                placeholder="Bersara 7 Januari 2026"
                className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm"
              />
            </label>
          </div>

          {/* Amaran ini bukan hiasan. Padanan di sini ialah seluruh sel, dan
              sebabnya konkrit: Bilik i-Shabariah kekal bernama begitu selepas
              pemiliknya bersara. Padanan subrentetan akan menamakannya semula
              dan tiada siapa perasan sehingga papan tanda dicetak. */}
          <p className="mt-2 rounded-lg bg-navy-50/60 p-2.5 text-[11px] leading-relaxed text-slate-500">
            Padanan ialah <b>seluruh sel</b>, bukan sebahagian perkataan. Nama khas
            seperti <i>Bilik i-Shabariah</i> tidak akan tersentuh walaupun ia
            mengandungi nama yang sama.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void tambah()}
              disabled={sibuk}
              className="rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {sibuk ? "…" : "Simpan pembetulan"}
            </button>
            {dokumenId && (
              <button
                onClick={() => void kenakan()}
                disabled={sibuk || aktif === 0}
                className="rounded-lg border border-garis px-4 py-2 text-xs font-semibold text-navy-700 hover:border-navy-700 disabled:opacity-40"
              >
                Kenakan pada edisi tersimpan sekarang
              </button>
            )}
          </div>

          {senarai && senarai.length > 0 && (
            <ul className="mt-4 divide-y divide-garis border-t border-garis">
              {senarai.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5 text-xs">
                  <span className="min-w-0 flex-1">
                    <span className={p.aktif ? "text-navy-800" : "text-slate-400 line-through"}>
                      <b>{p.dari}</b>
                      {p.jenis === "buang_nama" ? " → digugurkan" : ` → ${p.kepada}`}
                    </span>
                    {p.sebab && <span className="mt-0.5 block text-slate-400">{p.sebab}</span>}
                  </span>
                  <button onClick={() => void togol(p)} className="text-slate-500 underline">
                    {p.aktif ? "Matikan" : "Hidupkan"}
                  </button>
                  <button onClick={() => void padam(p.id)} className="text-[#8f2b2b] underline">
                    Padam
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
