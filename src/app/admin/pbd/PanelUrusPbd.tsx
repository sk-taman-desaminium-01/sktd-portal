"use client";

import { useState } from "react";
import { importMurid, type HasilImport } from "@/lib/import-murid";
import { tugaskanGuruSubjek, buangTugasanGuruSubjek } from "@/lib/tindakan-pbd";
import { SUBJEK, namaSubjek } from "@/data/subjek";

/**
 * Urus ePBD — import murid, dan tetapkan siapa mengajar apa.
 *
 * DUA LANGKAH IMPORT, dan langkah pertama tidak menulis apa-apa.
 * Peraturan keras #5: import mesti larian kering dahulu. Import yang terus
 * menulis pernah menghasilkan 978 gred salah dalam projek lain kerana tiada
 * sesiapa melihat taburannya sebelum ia masuk. Butang "Simpan" hanya muncul
 * SELEPAS pentadbir melihat ringkasan.
 */

export interface Tugasan {
  id: string;
  emel: string;
  subjek: string;
  tahun: number;
  kelas: string;
}

export default function PanelUrusPbd({
  tugasanAwal, senaraiGuru, senaraiKelas,
}: {
  tugasanAwal: Tugasan[];
  senaraiGuru: { emel: string; nama: string }[];
  senaraiKelas: { tahun: number; kelas: string }[];
}) {
  /* ------------------------------------------------------------ import */
  const [teks, setTeks] = useState("");
  const [hasil, setHasil] = useState<HasilImport | null>(null);
  const [sibukImport, setSibukImport] = useState(false);

  async function jalanImport(simpan: boolean) {
    if (teks.trim() === "") {
      setHasil({ ok: false, kering: true, mesej: "Tampal isi CSV dahulu." });
      return;
    }
    setSibukImport(true);
    try {
      setHasil(await importMurid(teks, simpan));
      if (simpan) setTeks("");
    } finally {
      setSibukImport(false);
    }
  }

  /* ---------------------------------------------------------- tugasan */
  const [tugasan, setTugasan] = useState(tugasanAwal);
  const [emel, setEmel] = useState(senaraiGuru[0]?.emel ?? "");
  const [subjek, setSubjek] = useState(SUBJEK[0]?.kod ?? "");
  const [kelasPilih, setKelasPilih] = useState(
    senaraiKelas[0] ? `${senaraiKelas[0].tahun}|${senaraiKelas[0].kelas}` : "",
  );
  const [mesejTugas, setMesejTugas] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibukTugas, setSibukTugas] = useState<string | null>(null);
  const [cari, setCari] = useState("");

  async function tambah() {
    const [tahun, kelas] = kelasPilih.split("|");
    setSibukTugas("tambah");
    try {
      const r = await tugaskanGuruSubjek(emel, subjek, Number(tahun), kelas);
      setMesejTugas({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setTugasan((s) => [
          ...s.filter((t) => !(t.emel === emel && t.subjek === subjek && t.tahun === Number(tahun) && t.kelas === kelas)),
          { id: `sementara-${Date.now()}`, emel, subjek, tahun: Number(tahun), kelas },
        ]);
      }
    } finally {
      setSibukTugas(null);
    }
  }

  async function buang(t: Tugasan) {
    setSibukTugas(t.id);
    try {
      const r = await buangTugasanGuruSubjek(t.id);
      setMesejTugas({ ok: r.ok, teks: r.mesej });
      if (r.ok) setTugasan((s) => s.filter((x) => x.id !== t.id));
    } finally {
      setSibukTugas(null);
    }
  }

  const carian = cari.trim().toLowerCase();
  const ditapis = carian
    ? tugasan.filter(
        (t) =>
          t.emel.toLowerCase().includes(carian) ||
          t.subjek.toLowerCase().includes(carian) ||
          `${t.tahun} ${t.kelas}`.toLowerCase().includes(carian),
      )
    : tugasan;

  return (
    <>
      {/* ---------------- Import murid ---------------- */}
      <section className="mt-8">
        <h2 className="text-base font-bold text-navy-800">Import senarai murid</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Tampal CSV dengan lajur <b>Nama</b>, <b>No. KP</b>, <b>Tahun</b>,{" "}
          <b>Kelas</b> (dan <b>Jantina</b> jika ada). Nombor tahun dalam nama
          kelas dibuang automatik — “3 AMANAH” disimpan sebagai tahun 3, kelas
          AMANAH.
        </p>

        <textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          rows={6}
          placeholder={"Nama,No KP,Tahun,Kelas\nAHMAD BIN ALI,180101011234,3,AMANAH"}
          className="mt-3 w-full rounded-xl border border-garis p-3 font-mono text-xs"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => void jalanImport(false)}
            disabled={sibukImport}
            className="rounded-lg border border-navy-700 px-4 py-2 text-sm font-semibold text-navy-700 disabled:opacity-50"
          >
            {sibukImport ? "Menyemak…" : "Semak dahulu (tiada apa ditulis)"}
          </button>
          {hasil?.ok && hasil.kering && (
            <button
              onClick={() => void jalanImport(true)}
              disabled={sibukImport}
              className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Simpan {hasil.jumlah} murid
            </button>
          )}
        </div>

        {hasil && (
          <div
            className={`mt-3 rounded-xl border p-4 text-sm leading-relaxed ${
              hasil.ok
                ? "border-[#bfe3ce] bg-[#eef8f2] text-[#15693f]"
                : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
            }`}
          >
            <p>{hasil.mesej}</p>

            {hasil.tanpaKp !== undefined && hasil.tanpaKp > 0 && (
              <p className="mt-2 text-[#8f2b2b]">
                ⚠ {hasil.tanpaKp} murid tiada No. KP. Mereka tetap diimport,
                tetapi tidak boleh dipadankan semula dengan pasti bila naik
                tahun — dua murid senama dalam kelas sama tidak dapat
                dibezakan.
              </p>
            )}

            {hasil.ralat && hasil.ralat.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs">
                {hasil.ralat.slice(0, 10).map((r) => <li key={r}>· {r}</li>)}
                {hasil.ralat.length > 10 && <li>· … {hasil.ralat.length - 10} lagi</li>}
              </ul>
            )}

            {hasil.contoh && hasil.contoh.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-garis bg-white">
                <table className="w-full text-xs text-slate-700">
                  <thead className="bg-navy-50 text-left">
                    <tr>
                      <th className="px-2 py-1">Nama</th>
                      <th className="px-2 py-1">No. KP</th>
                      <th className="px-2 py-1">Tahun</th>
                      <th className="px-2 py-1">Kelas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-garis">
                    {hasil.contoh.map((b, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1">{b.nama}</td>
                        <td className="px-2 py-1">{b.no_kp ? "✓" : "—"}</td>
                        <td className="px-2 py-1">{b.tahun}</td>
                        <td className="px-2 py-1">{b.kelas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------------- Guru subjek ---------------- */}
      <section className="mt-10">
        <h2 className="text-base font-bold text-navy-800">Guru subjek</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Menentukan siapa boleh mengisi TP bagi subjek dan kelas mana. Guru
          yang tidak ditugaskan tidak boleh menulis apa-apa — semakan itu di
          pelayan, bukan sekadar menyembunyikan butang.
        </p>

        {senaraiKelas.length === 0 ? (
          <p className="mt-3 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm text-[#7a5a12]">
            Belum ada murid diimport, jadi belum ada kelas untuk ditugaskan.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-garis bg-white p-4">
            <label className="min-w-0 flex-1 text-xs text-slate-500">
              Guru
              <select
                value={emel} onChange={(e) => setEmel(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-garis px-2 py-2 text-sm"
              >
                {senaraiGuru.map((g) => (
                  <option key={g.emel} value={g.emel}>{g.nama || g.emel}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Subjek
              <select
                value={subjek} onChange={(e) => setSubjek(e.target.value)}
                className="mt-1 block rounded-lg border border-garis px-2 py-2 text-sm"
              >
                {SUBJEK.map((s) => (
                  <option key={s.kod} value={s.kod}>{s.nama}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Kelas
              <select
                value={kelasPilih} onChange={(e) => setKelasPilih(e.target.value)}
                className="mt-1 block rounded-lg border border-garis px-2 py-2 text-sm"
              >
                {senaraiKelas.map((k) => (
                  <option key={`${k.tahun}|${k.kelas}`} value={`${k.tahun}|${k.kelas}`}>
                    {k.tahun} {k.kelas}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => void tambah()}
              disabled={sibukTugas !== null || !emel}
              className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Tugaskan
            </button>
          </div>
        )}

        {mesejTugas && (
          <p
            className={`mt-3 rounded-lg border p-3 text-sm ${
              mesejTugas.ok
                ? "border-[#bfe3ce] bg-[#eef8f2] text-[#15693f]"
                : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
            }`}
          >
            {mesejTugas.teks}
          </p>
        )}

        {tugasan.length > 8 && (
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari guru, subjek atau kelas…"
            aria-label="Cari tugasan"
            className="mt-4 w-full rounded-lg border border-garis px-3 py-2 text-sm"
          />
        )}

        {tugasan.length > 0 && (
          <ul className="mt-3 divide-y divide-garis overflow-hidden rounded-xl border border-garis bg-white">
            {ditapis.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-navy-800">{t.emel}</span>
                  <span className="text-xs text-slate-500">
                    {namaSubjek(t.subjek)} · {t.tahun} {t.kelas}
                  </span>
                </span>
                <button
                  onClick={() => void buang(t)}
                  disabled={sibukTugas === t.id}
                  className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-[#fdf1f1] hover:text-[#8f2b2b] disabled:opacity-50"
                >
                  {sibukTugas === t.id ? "…" : "Buang"}
                </button>
              </li>
            ))}
            {ditapis.length === 0 && (
              <li className="p-4 text-sm text-slate-500">Tiada tugasan sepadan.</li>
            )}
          </ul>
        )}
      </section>
    </>
  );
}
