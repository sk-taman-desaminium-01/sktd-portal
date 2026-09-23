"use client";

import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import {
  hantarDisiplin, padamDisiplin, suntingDisiplin, tandaLaporanLembaga,
  type BarisDisiplin,
} from "@/lib/disiplin";
import { SEKOLAH } from "@/data/sekolah";
import PilihCari from "@/components/PilihCari";
import { hariIniMY } from "@/data/tarikh-my";


export default function PanelDisiplin({
  tahunSesi, kelas, cadangan, boleh, urusSemua, senarai, berulang,
}: {
  tahunSesi: number;
  kelas: string[];
  cadangan: { nama: string; kelas: string }[];
  boleh: boolean;
  urusSemua: boolean;
  senarai: BarisDisiplin[];
  berulang: string[];
}) {
  return (
    <div className="mt-6 space-y-10">
      <BorangRekod tahunSesi={tahunSesi} kelas={kelas} cadangan={cadangan} />
      {boleh && <SenaraiPenuh key={senarai.map((b) => `${b.id}:${b.tarikh}:${b.kesalahan}`).join("|")} senarai={senarai} berulang={berulang} urusSemua={urusSemua} />}
    </div>
  );
}

function BorangRekod({ tahunSesi, kelas, cadangan }: {
  tahunSesi: number; kelas: string[]; cadangan: { nama: string; kelas: string }[];
}) {
  const router = useRouter();
  const [tarikh, setTarikh] = useState(hariIniMY);
  const [muridNama, setMuridNama] = useState("");
  const [muridKelas, setMuridKelas] = useState("");
  const [manual, setManual] = useState(false);
  const [kesalahan, setKesalahan] = useState("");
  const [tindakan, setTindakan] = useState("");
  const [saksi, setSaksi] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);

  async function hantar() {
    try {
      setSibuk(true);
      setNota(null);
      const r = await hantarDisiplin({
        tahun_sesi: tahunSesi, tarikh, murid_nama: muridNama, kelas: muridKelas,
        kesalahan, tindakan, saksi,
      });
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setMuridNama(""); setKesalahan(""); setTindakan(""); setSaksi("");
        router.refresh();
      }
      setSibuk(false);
    } catch {
      setNota({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section className="rounded-xl border border-garis bg-white p-5">
      <h2 className="text-lg font-bold text-navy-800">Rekod Salah Laku</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Medan label="Tarikh">
          <input type="date" value={tarikh} onChange={(e) => setTarikh(e.target.value)}
            className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
        </Medan>
        <Medan label="Kelas">
          <PilihCari id="disiplin-kelas" label="Kelas" sembunyiLabel nilai={muridKelas} tukar={(v) => { setMuridKelas(v); setManual(false); }} placeholder="Taip kelas, cth: 4 bes" pilihan={kelas.map((k) => ({ nilai: k, label: k }))} />
        </Medan>
        <Medan label="Nama Murid">
          {/* <datalist> tidak berfungsi dengan baik pada iPhone; pemilih boleh
              cari digunakan, ditapis mengikut kelas yang dipilih. */}
          {manual ? (
            <>
              <input value={muridNama} onChange={(e) => setMuridNama(e.target.value)} autoFocus
                placeholder="Taip nama penuh murid" className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
              <button type="button" onClick={() => setManual(false)} className="mt-1 text-xs text-navy-700 underline">← Pilih daripada senarai</button>
            </>
          ) : (
            <>
              <PilihCari id="disiplin-murid" label="Nama murid" sembunyiLabel placeholder="Taip nama murid…"
                nilai={muridNama ? `${muridNama}|${muridKelas}` : ""}
                tukar={(v) => { const [n, k] = v.split("|"); setMuridNama(n ?? ""); if (k) setMuridKelas(k); }}
                pilihan={cadangan.filter((m) => !muridKelas || m.kelas === muridKelas)
                  .map((m) => ({ nilai: `${m.nama}|${m.kelas}`, label: m.nama, nota: m.kelas }))} />
              <button type="button" onClick={() => setManual(true)} className="mt-1 text-xs text-slate-500 underline">Nama tiada dalam senarai? Taip sendiri</button>
            </>
          )}
        </Medan>
        <Medan label="Saksi (jika ada)">
          <input value={saksi} onChange={(e) => setSaksi(e.target.value)}
            className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
        </Medan>
      </div>
      <div className="mt-4">
        <Medan label="Butiran Salah Laku">
          <textarea value={kesalahan} onChange={(e) => setKesalahan(e.target.value)} rows={3}
            className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
        </Medan>
      </div>
      <div className="mt-4">
        <Medan label="Tindakan Diambil">
          <textarea value={tindakan} onChange={(e) => setTindakan(e.target.value)} rows={2}
            className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
        </Medan>
      </div>
      {nota && (
        <p className={`mt-3 text-sm ${nota.ok ? "text-[#167a4b]" : "text-red-600"}`}>{nota.teks}</p>
      )}
      <button type="button" disabled={sibuk} onClick={hantar}
        className="mt-4 min-h-11 touch-manipulation rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Simpan Rekod
      </button>
    </section>
  );
}

function SenaraiPenuh({ senarai, berulang, urusSemua }: { senarai: BarisDisiplin[]; berulang: string[]; urusSemua: boolean }) {
  const [data, setData] = useState(senarai);
  const [rujukan, setRujukan] = useState<Record<string, string>>({});
  const [cetak, setCetak] = useState(false);
  const [sunting, setSunting] = useState<string | null>(null);
  const [draf, setDraf] = useState<Pick<BarisDisiplin, "tarikh" | "murid_nama" | "kelas" | "kesalahan" | "tindakan" | "saksi"> | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);

  function cetakLaporan() {
    // Pastikan laporan sudah dirender dan kekalkan gerak isyarat klik untuk
    // Safari/telefon membuka dialog cetak atau Simpan sebagai PDF.
    flushSync(() => setCetak(true));
    mulaCetak("disiplin-cetak", "Laporan Lembaga Disiplin");
  }

  const untukLembaga = useMemo(() => urusSemua ? data.filter((d) => d.laporan_lembaga) : [], [data, urusSemua]);

  async function tanda(id: string, nilai: boolean) {
    try {
      const r = await tandaLaporanLembaga(id, nilai, rujukan[id]);
      if (r.ok) setData((d) => d.map((b) => (b.id === id ? { ...b, laporan_lembaga: nilai, rujukan_kami: rujukan[id]?.trim() || b.rujukan_kami } : b)));
      else setNota({ ok: false, teks: r.mesej });
    } catch {
      setNota({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    }
  }

  function mulaSunting(b: BarisDisiplin) {
    setSunting(b.id);
    setDraf({ tarikh: b.tarikh, murid_nama: b.murid_nama, kelas: b.kelas, kesalahan: b.kesalahan, tindakan: b.tindakan, saksi: b.saksi });
    setNota(null);
  }

  async function simpanSunting(b: BarisDisiplin) {
    if (!draf) return;
    try {
      setSibuk(b.id); setNota(null);
      const r = await suntingDisiplin(b.id, { tahun_sesi: b.tahun_sesi, ...draf, saksi: draf.saksi ?? undefined });
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setData((lama) => lama.map((x) => x.id === b.id ? { ...x, ...draf } : x));
        setSunting(null); setDraf(null);
      }
      setSibuk(null);
    } catch {
      setNota({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(null);
    }
  }

  async function padam(b: BarisDisiplin) {
    if (!window.confirm(`Padam rekod disiplin ${b.murid_nama}?`)) return;
    try {
      setSibuk(b.id); setNota(null);
      const r = await padamDisiplin(b.id);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) setData((lama) => lama.filter((x) => x.id !== b.id));
      setSibuk(null);
    } catch {
      setNota({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(null);
    }
  }

  return (
    <section className="border-t border-garis pt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-navy-800">{urusSemua ? "Semua Rekod" : "Rekod Saya"} ({data.length})</h2>
        {untukLembaga.length > 0 && (
          <button type="button" onClick={cetakLaporan}
            className="min-h-11 touch-manipulation px-1 text-xs font-semibold text-navy-700 underline">
            Cetak Laporan Lembaga ({untukLembaga.length})
          </button>
        )}
      </div>

      {berulang.length > 0 && (
        <p className="mt-2 rounded-lg bg-[#fdecec] px-3 py-2 text-xs text-[#9a2e2e]">
          Kes berulang tahun ini: {berulang.join(", ")}
        </p>
      )}

      {nota && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${nota.ok ? "bg-[#eef8f2] text-[#167a4b]" : "bg-[#fdecec] text-red-700"}`}>{nota.teks}</p>}

      {data.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
          Belum ada rekod disiplin atau sahsiah untuk sesi ini. Rekod yang anda hantar akan
          muncul di sini.
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
            <p className="mt-1 text-xs text-slate-500">Direkod oleh {b.guru_nama}</p>

            {sunting === b.id && draf && (
              <div className="mt-3 grid min-w-0 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                <input aria-label="Tarikh" type="date" value={draf.tarikh} onChange={(e) => setDraf({ ...draf, tarikh: e.target.value })}
                  className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
                <input aria-label="Kelas" value={draf.kelas} onChange={(e) => setDraf({ ...draf, kelas: e.target.value })}
                  className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
                <input aria-label="Nama murid" value={draf.murid_nama} onChange={(e) => setDraf({ ...draf, murid_nama: e.target.value })}
                  className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm sm:col-span-2" />
                <textarea aria-label="Butiran salah laku" value={draf.kesalahan} onChange={(e) => setDraf({ ...draf, kesalahan: e.target.value })} rows={2}
                  className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm sm:col-span-2" />
                <textarea aria-label="Tindakan" value={draf.tindakan} onChange={(e) => setDraf({ ...draf, tindakan: e.target.value })} rows={2}
                  className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
                <input aria-label="Saksi" value={draf.saksi ?? ""} onChange={(e) => setDraf({ ...draf, saksi: e.target.value })}
                  className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button type="button" disabled={sibuk === b.id} onClick={() => void simpanSunting(b)} className="min-h-11 touch-manipulation rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Simpan perubahan</button>
                  <button type="button" onClick={() => { setSunting(null); setDraf(null); }} className="min-h-11 touch-manipulation rounded-lg border border-garis px-3 py-2 text-xs font-semibold text-navy-700">Batal</button>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-garis pt-2">
              {urusSemua && <>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={b.laporan_lembaga} onChange={(e) => tanda(b.id, e.target.checked)} />
                Laporan Lembaga Disiplin
              </label>
              <input
                placeholder="No. rujukan kami (jika perlu)" defaultValue={b.rujukan_kami ?? ""}
                onChange={(e) => setRujukan((r) => ({ ...r, [b.id]: e.target.value }))}
                onBlur={() => b.laporan_lembaga && tanda(b.id, true)}
                className="min-w-0 flex-1 rounded-lg border border-garis px-2 py-1 text-xs"
              />
              </>}
              <span className="ml-auto flex gap-2">
                <button type="button" disabled={sibuk === b.id} onClick={() => mulaSunting(b)} className="min-h-11 touch-manipulation px-1 text-xs font-semibold text-navy-700 underline disabled:opacity-50">Sunting</button>
                <button type="button" disabled={sibuk === b.id} onClick={() => void padam(b)} className="min-h-11 touch-manipulation px-1 text-xs font-semibold text-red-600 underline disabled:opacity-50">Padam</button>
              </span>
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
    <div id="disiplin-cetak" data-cetak-kertas="portrait" className="hidden print:block">
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
