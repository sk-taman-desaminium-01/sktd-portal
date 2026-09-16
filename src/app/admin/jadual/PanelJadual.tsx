"use client";

import { useMemo, useState } from "react";
import { simpanJadual } from "@/lib/jadual";
import { PANITIA } from "@/data/panitia";
import {
  HARI, NAMA_HARI, NAMA_SESI, SESI, jamPapar,
  type Hari, type Jadual, type Sesi, type Waktu,
} from "@/data/jadual-jenis";

/**
 * Penyunting jadual waktu.
 *
 * SATU KELAS PADA SATU MASA, dengan sengaja. Grid 19 kelas × 5 hari × 11
 * waktu ialah lebih 1,000 sel — mustahil disunting pada telefon, dan mudah
 * tersalah taip pada baris yang salah. Pentadbir juga menyusun jadual satu
 * kelas pada satu masa, jadi skrin mengikut cara kerja itu.
 */

/** Pilihan subjek: 13 panitia, ditambah aktiviti bukan PdP. */
const PILIHAN: { kod: string; nama: string }[] = [
  ...PANITIA.map((p) => ({ kod: p.kod, nama: p.nama })),
  { kod: "PERHIMPUNAN", nama: "Perhimpunan" },
  { kod: "PSS", nama: "Pusat Sumber" },
  { kod: "KOKO", nama: "Kokurikulum" },
  { kod: "PAK21", nama: "Aktiviti PAK21" },
];

const NAMA_SUBJEK = new Map(PILIHAN.map((p) => [p.kod, p.nama]));

export default function PanelJadual({
  awal, kelas,
}: { awal: Jadual; kelas: string[] }) {
  const [jadual, setJadual] = useState<Jadual>(awal);
  const [pilih, setPilih] = useState<string>(kelas[0]);
  const [hasil, setHasil] = useState<{ ok: boolean; mesej: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [bukaWaktu, setBukaWaktu] = useState(false);

  const kelasIni = jadual.kelas[pilih];
  const sesi: Sesi = kelasIni?.sesi ?? "pagi";
  const waktu = jadual.waktu[sesi];

  const terisi = useMemo(() => {
    const h = kelasIni?.hari ?? {};
    return Object.values(h).reduce((n, w) => n + Object.keys(w ?? {}).length, 0);
  }, [kelasIni]);

  function ubahSlot(hari: Hari, waktuId: string, subjek: string) {
    setJadual((j) => {
      const k = j.kelas[pilih] ?? { sesi: "pagi" as Sesi, hari: {} };
      const hariIni = { ...(k.hari[hari] ?? {}) };
      // Memilih "—" MEMBUANG slot, bukan menyimpan subjek kosong. Slot kosong
      // dan slot bernilai "" kelihatan sama di skrin tetapi berbeza dalam
      // data, dan perbezaan itu akan muncul sebagai sel hantu di laman awam.
      if (!subjek) delete hariIni[waktuId];
      else hariIni[waktuId] = { ...(hariIni[waktuId] ?? {}), subjek };
      return { ...j, kelas: { ...j.kelas, [pilih]: { ...k, hari: { ...k.hari, [hari]: hariIni } } } };
    });
  }

  function ubahSesi(baharu: Sesi) {
    setJadual((j) => {
      const k = j.kelas[pilih] ?? { sesi: baharu, hari: {} };
      // Waktu sesi pagi dan petang mempunyai id yang berbeza, jadi slok
      // sedia ada tidak lagi sepadan. Dikosongkan supaya tiada slot yatim
      // yang tidak boleh dilihat mahupun dibuang.
      return { ...j, kelas: { ...j.kelas, [pilih]: { sesi: baharu, hari: {} } } };
    });
  }

  function ubahWaktu(s: Sesi, i: number, medan: keyof Waktu, nilai: string | boolean) {
    setJadual((j) => {
      const senarai = j.waktu[s].map((w, n) => (n === i ? { ...w, [medan]: nilai } : w));
      return { ...j, waktu: { ...j.waktu, [s]: senarai } };
    });
  }

  async function simpan() {
    setSibuk(true);
    try {
      setHasil(await simpanJadual(jadual));
    } catch (e) {
      setHasil({ ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <>
      {/* ---------- Pilih kelas ---------- */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-garis bg-white p-4">
        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Kelas
          <select
            value={pilih}
            onChange={(e) => setPilih(e.target.value)}
            className="mt-1 block w-44 rounded-lg border border-garis px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"
          >
            {kelas.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>

        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Sesi
          <select
            value={sesi}
            onChange={(e) => ubahSesi(e.target.value as Sesi)}
            className="mt-1 block w-40 rounded-lg border border-garis px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"
          >
            {SESI.map((s) => (
              <option key={s} value={s}>{NAMA_SESI[s]}</option>
            ))}
          </select>
        </label>

        <span className="ml-auto text-sm text-slate-500">{terisi} waktu diisi</span>
      </div>

      {/* ---------- Grid hari × waktu ---------- */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-garis bg-white">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy-50">
              <th className="w-28 border-b border-garis p-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Waktu
              </th>
              {HARI.map((h) => (
                <th key={h} className="border-b border-l border-garis p-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {NAMA_HARI[h]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waktu.map((w) => (
              <tr key={w.id} className={w.rehat ? "bg-slate-50" : undefined}>
                <th className="border-b border-garis p-2 text-left align-top font-mono text-[11px] font-normal text-slate-500">
                  {jamPapar(w.mula)}
                  <span className="block text-slate-400">{jamPapar(w.tamat)}</span>
                </th>
                {HARI.map((h) => (
                  <td key={h} className="border-b border-l border-garis p-1.5 align-top">
                    {w.rehat ? (
                      <span className="block px-1 py-2 text-xs text-slate-400">
                        {w.label ?? "Rehat"}
                      </span>
                    ) : (
                      <select
                        value={kelasIni?.hari?.[h]?.[w.id]?.subjek ?? ""}
                        onChange={(e) => ubahSlot(h, w.id, e.target.value)}
                        className="w-full rounded border border-garis px-1.5 py-1.5 text-xs"
                      >
                        <option value="">—</option>
                        {PILIHAN.map((p) => (
                          <option key={p.kod} value={p.kod}>{p.nama}</option>
                        ))}
                      </select>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Waktu sesi ---------- */}
      <section className="mt-5 rounded-xl border border-garis bg-white">
        <button
          type="button"
          onClick={() => setBukaWaktu((b) => !b)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span>
            <span className="block text-base font-bold text-navy-800">Waktu sesi</span>
            <span className="mt-0.5 block text-sm text-slate-600">
              Menukar waktu di sini mengubah paparan SEMUA kelas dalam sesi itu.
            </span>
          </span>
          <span aria-hidden="true" className="text-slate-400">{bukaWaktu ? "▾" : "▸"}</span>
        </button>

        {bukaWaktu && (
          <div className="border-t border-garis p-4">
            {SESI.map((s) => (
              <div key={s} className="mt-4 first:mt-0">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {NAMA_SESI[s]}
                </h3>
                <ul className="mt-2 space-y-2">
                  {jadual.waktu[s].map((w, i) => (
                    <li key={w.id} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time" value={w.mula}
                        onChange={(e) => ubahWaktu(s, i, "mula", e.target.value)}
                        className="rounded-lg border border-garis px-2 py-1.5 text-sm"
                      />
                      <span className="text-slate-400">–</span>
                      <input
                        type="time" value={w.tamat}
                        onChange={(e) => ubahWaktu(s, i, "tamat", e.target.value)}
                        className="rounded-lg border border-garis px-2 py-1.5 text-sm"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input
                          type="checkbox" checked={Boolean(w.rehat)}
                          onChange={(e) => ubahWaktu(s, i, "rehat", e.target.checked)}
                        />
                        Bukan waktu PdP
                      </label>
                      {w.rehat && (
                        <input
                          type="text" value={w.label ?? ""} placeholder="Rehat"
                          onChange={(e) => ubahWaktu(s, i, "label", e.target.value)}
                          className="w-32 rounded-lg border border-garis px-2 py-1.5 text-sm"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {hasil && (
        <p
          role="status"
          className={`mt-5 rounded-xl p-4 text-sm leading-relaxed ${
            hasil.ok ? "bg-[#e5f4ec] text-[#14603c]" : "bg-[#fbeaea] text-[#8f2424]"
          }`}
        >
          {hasil.mesej}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button" onClick={simpan} disabled={sibuk}
          className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
        >
          {sibuk ? "Menyimpan…" : "Simpan jadual"}
        </button>
        <span className="text-xs leading-relaxed text-slate-500">
          Menyimpan menyimpan SEMUA kelas sekaligus dan mencetuskan binaan
          semula laman ibu bapa.
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Subjek dipapar penuh kepada ibu bapa: {NAMA_SUBJEK.get("BM")} dan
        seterusnya — bukan kod.
      </p>
    </>
  );
}
