"use client";

import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import {
  hantarDisiplin, tandaLaporanLembaga, type BarisDisiplin,
} from "@/lib/disiplin";
import { SEKOLAH } from "@/data/sekolah";

const HARI_INI = new Date().toISOString().slice(0, 10);

export default function PanelDisiplin({
  tahunSesi, kelas, cadangan, boleh, senarai, berulang,
}: {
  tahunSesi: number;
  kelas: string[];
  cadangan: { nama: string; kelas: string }[];
  boleh: boolean;
  senarai: BarisDisiplin[];
  berulang: string[];
}) {
  return (
    <div className="mt-6 space-y-10">
      <BorangRekod tahunSesi={tahunSesi} kelas={kelas} cadangan={cadangan} />
      {boleh && <SenaraiPenuh senarai={senarai} berulang={berulang} />}
    </div>
  );
}

function BorangRekod({ tahunSesi, kelas, cadangan }: {
  tahunSesi: number; kelas: string[]; cadangan: { nama: string; kelas: string }[];
}) {
  const [tarikh, setTarikh] = useState(HARI_INI);
  const [muridNama, setMuridNama] = useState("");
  const [muridKelas, setMuridKelas] = useState("");
  const [kesalahan, setKesalahan] = useState("");
  const [tindakan, setTindakan] = useState("");
  const [saksi, setSaksi] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);

  async function hantar() {
    setSibuk(true);
    setNota(null);
    const r = await hantarDisiplin({
      tahun_sesi: tahunSesi, tarikh, murid_nama: muridNama, kelas: muridKelas,
      kesalahan, tindakan, saksi,
    });
    setNota({ ok: r.ok, teks: r.mesej });
    if (r.ok) {
      setMuridNama(""); setKesalahan(""); setTindakan(""); setSaksi("");
    }
    setSibuk(false);
  }

  return (
    <section className="rounded-xl border border-garis bg-white p-5">
      <h2 className="text-lg font-bold text-navy-800">Rekod Salah Laku</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Medan label="Tarikh">
          <input type="date" value={tarikh} onChange={(e) => setTarikh(e.target.value)}
            className="w-full rounded-lg border border-garis px-3 py-2 text-sm" />
        </Medan>
        <Medan label="Kelas">
          <select value={muridKelas} onChange={(e) => setMuridKelas(e.target.value)}
            className="w-full rounded-lg border border-garis px-3 py-2 text-sm">
            <option value="">Pilih kelas…</option>
            {kelas.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Medan>
        <Medan label="Nama Murid">
          <input list="cadangan-murid-disiplin" value={muridNama} onChange={(e) => setMuridNama(e.target.value)}
            placeholder="Taip nama — cadangan akan keluar" className="w-full rounded-lg border border-garis px-3 py-2 text-sm" />
          <datalist id="cadangan-murid-disiplin">
            {cadangan.map((m) => <option key={`${m.nama}-${m.kelas}`} value={m.nama} label={m.kelas} />)}
          </datalist>
        </Medan>
        <Medan label="Saksi (jika ada)">
          <input value={saksi} onChange={(e) => setSaksi(e.target.value)}
            className="w-full rounded-lg border border-garis px-3 py-2 text-sm" />
        </Medan>
      </div>
      <div className="mt-4">
        <Medan label="Butiran Salah Laku">
          <textarea value={kesalahan} onChange={(e) => setKesalahan(e.target.value)} rows={3}
            className="w-full rounded-lg border border-garis px-3 py-2 text-sm" />
        </Medan>
      </div>
      <div className="mt-4">
        <Medan label="Tindakan Diambil">
          <textarea value={tindakan} onChange={(e) => setTindakan(e.target.value)} rows={2}
            className="w-full rounded-lg border border-garis px-3 py-2 text-sm" />
        </Medan>
      </div>
      {nota && (
        <p className={`mt-3 text-sm ${nota.ok ? "text-[#167a4b]" : "text-red-600"}`}>{nota.teks}</p>
      )}
      <button type="button" disabled={sibuk} onClick={hantar}
        className="mt-4 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Simpan Rekod
      </button>
    </section>
  );
}

function SenaraiPenuh({ senarai, berulang }: { senarai: BarisDisiplin[]; berulang: string[] }) {
  const [data, setData] = useState(senarai);
  const [rujukan, setRujukan] = useState<Record<string, string>>({});
  const [cetak, setCetak] = useState(false);

  function cetakLaporan() {
    // Pastikan laporan sudah dirender dan kekalkan gerak isyarat klik untuk
    // Safari/telefon membuka dialog cetak atau Simpan sebagai PDF.
    flushSync(() => setCetak(true));
    mulaCetak("disiplin-cetak", "Laporan Lembaga Disiplin");
  }

  const untukLembaga = useMemo(() => data.filter((d) => d.laporan_lembaga), [data]);

  async function tanda(id: string, nilai: boolean) {
    const r = await tandaLaporanLembaga(id, nilai, rujukan[id]);
    if (r.ok) setData((d) => d.map((b) => (b.id === id ? { ...b, laporan_lembaga: nilai, rujukan_kami: rujukan[id]?.trim() || b.rujukan_kami } : b)));
  }

  return (
    <section className="border-t border-garis pt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-navy-800">Senarai Rekod ({data.length})</h2>
        {untukLembaga.length > 0 && (
          <button type="button" onClick={cetakLaporan}
            className="text-xs font-semibold text-navy-700 underline">
            Cetak Laporan Lembaga ({untukLembaga.length})
          </button>
        )}
      </div>

      {berulang.length > 0 && (
        <p className="mt-2 rounded-lg bg-[#fdecec] px-3 py-2 text-xs text-[#9a2e2e]">
          Kes berulang tahun ini: {berulang.join(", ")}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {data.map((b) => (
          <li key={b.id} className="rounded-xl border border-garis bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-navy-800">{b.murid_nama} · {b.kelas}</p>
              <span className="text-xs text-slate-500">{new Date(b.tarikh).toLocaleDateString("ms-MY")}</span>
            </div>
            <p className="mt-1.5 text-slate-600">{b.kesalahan}</p>
            {b.tindakan && <p className="mt-1 text-xs text-slate-500">Tindakan: {b.tindakan}</p>}
            {b.saksi && <p className="text-xs text-slate-500">Saksi: {b.saksi}</p>}
            <p className="mt-1 text-xs text-slate-400">Direkod oleh {b.guru_nama}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-garis pt-2">
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={b.laporan_lembaga} onChange={(e) => tanda(b.id, e.target.checked)} />
                Laporan Lembaga Disiplin
              </label>
              <input
                placeholder="No. rujukan kami (jika perlu)" defaultValue={b.rujukan_kami ?? ""}
                onChange={(e) => setRujukan((r) => ({ ...r, [b.id]: e.target.value }))}
                onBlur={() => b.laporan_lembaga && tanda(b.id, true)}
                className="flex-1 rounded-lg border border-garis px-2 py-1 text-xs"
              />
            </div>
          </li>
        ))}
      </ul>

      {cetak && <CetakLembaga senarai={untukLembaga} />}
    </section>
  );
}

function CetakLembaga({ senarai }: { senarai: BarisDisiplin[] }) {
  return (
    <div id="disiplin-cetak" className="hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #disiplin-cetak, #disiplin-cetak * { visibility: visible; }
          #disiplin-cetak { position: absolute; inset: 0; width: 100%; }
          @page { size: A4 portrait; margin: 18mm; }
        }
      `}</style>
      <header className="border-b-2 border-black pb-2 text-center text-[11pt]">
        <h1 className="font-bold uppercase">{SEKOLAH.namaPenuh}</h1>
        <p>{SEKOLAH.hubungi.alamat.split("\n").join(", ")}</p>
      </header>
      <p className="mt-4 text-center text-[12pt] font-bold uppercase">
        Laporan Lembaga Disiplin — Borang A/2
      </p>
      <table className="mt-4 w-full border-collapse text-[9pt]">
        <thead>
          <tr className="border-b border-black">
            <th className="border border-black px-2 py-1 text-left">Tarikh</th>
            <th className="border border-black px-2 py-1 text-left">Nama Murid</th>
            <th className="border border-black px-2 py-1 text-left">Kelas</th>
            <th className="border border-black px-2 py-1 text-left">Salah Laku</th>
            <th className="border border-black px-2 py-1 text-left">Tindakan</th>
            <th className="border border-black px-2 py-1 text-left">Rujukan Kami</th>
          </tr>
        </thead>
        <tbody>
          {senarai.map((b) => (
            <tr key={b.id}>
              <td className="border border-black px-2 py-1">{new Date(b.tarikh).toLocaleDateString("ms-MY")}</td>
              <td className="border border-black px-2 py-1">{b.murid_nama}</td>
              <td className="border border-black px-2 py-1">{b.kelas}</td>
              <td className="border border-black px-2 py-1">{b.kesalahan}</td>
              <td className="border border-black px-2 py-1">{b.tindakan}</td>
              <td className="border border-black px-2 py-1">{b.rujukan_kami ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-10 text-[10pt]">Disediakan oleh Guru Disiplin / Pentadbir Sekolah.</p>
    </div>
  );
}

function Medan({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="mb-1 block font-semibold text-navy-800">{label}</span>
      {children}
    </label>
  );
}
