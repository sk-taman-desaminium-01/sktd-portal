"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hadirRmtTarikh, naikRosterRmt, buangRosterRmt, simpanHadirRmt, type MuridRmt } from "@/lib/rmt";

export default function PanelRmt({
  tahunSesi, kelas, bolehRoster, senarai, tarikhAwal, hadirAwal,
}: {
  tahunSesi: number;
  kelas: string[];
  bolehRoster: boolean;
  senarai: MuridRmt[];
  tarikhAwal: string;
  hadirAwal: Record<string, boolean>;
}) {
  return (
    <div className="mt-6 space-y-10">
      <PanelKehadiran tahunSesi={tahunSesi} roster={senarai} tarikhAwal={tarikhAwal} hadirAwal={hadirAwal} />
      {bolehRoster && (
        <PanelRoster tahunSesi={tahunSesi} kelas={kelas} roster={senarai} />
      )}
    </div>
  );
}

function PanelKehadiran({ tahunSesi, roster, tarikhAwal, hadirAwal }: {
  tahunSesi: number; roster: MuridRmt[]; tarikhAwal: string; hadirAwal: Record<string, boolean>;
}) {
  const [tarikh, setTarikh] = useState(tarikhAwal);
  const [hadir, setHadir] = useState<Record<string, boolean>>(
    () => Object.fromEntries(roster.map((m) => [m.id, hadirAwal[m.id] ?? false])),
  );
  const [sibuk, setSibuk] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);

  const kumpulan = useMemo(() => {
    const peta = new Map<string, MuridRmt[]>();
    for (const m of roster) {
      const kunci = `${m.tahun} ${m.kelas}`.trim();
      peta.set(kunci, [...(peta.get(kunci) ?? []), m]);
    }
    return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0], "ms"));
  }, [roster]);

  async function tukarTarikh(t: string) {
    setSibuk(true); setNota(null);
    try {
      const r = await hadirRmtTarikh(tahunSesi, t);
      if (r.belumSedia) throw new Error("Modul kehadiran belum tersedia.");
      setHadir(Object.fromEntries(roster.map((m) => [m.id, r.hadir[m.id] ?? false])));
      setTarikh(t);
    } catch (e) { setNota({ ok: false, teks: e instanceof Error ? e.message : "Gagal membaca tarikh." }); }
    finally { setSibuk(false); }
  }
  async function simpan() {
    setSibuk(true); setNota(null);
    try {
      const r = await simpanHadirRmt(tahunSesi, tarikh, hadir);
      setNota({ ok: r.ok, teks: r.mesej });
    } catch { setNota({ ok: false, teks: "Gagal menyimpan. Muat semula untuk semak sebelum mencuba lagi." }); }
    finally { setSibuk(false); }
  }

  if (roster.length === 0) {
    return (
      <section className="rounded-xl border border-garis bg-white p-5 text-sm text-slate-500">
        Senarai murid RMT belum diisi lagi.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-garis bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-navy-800">Kehadiran Hari Ini</h2>
        <input type="date" value={tarikh} disabled={sibuk} onChange={(e) => void tukarTarikh(e.target.value)}
          className="rounded-lg border border-garis px-3 py-1.5 text-sm" />
      </div>
      <p className="mt-1 text-xs text-slate-500">Sesiapa guru boleh isi — tanda murid yang HADIR sahaja.</p>

      <div className="mt-4 space-y-5">
        {kumpulan.map(([label, murid]) => (
          <div key={label}>
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              {murid.map((m) => (
                <li key={m.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" disabled={sibuk} checked={hadir[m.id] ?? false}
                      onChange={(e) => setHadir((h) => ({ ...h, [m.id]: e.target.checked }))} />
                    {m.nama}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {nota && <p className={`mt-3 text-sm ${nota.ok ? "text-[#167a4b]" : "text-red-600"}`}>{nota.teks}</p>}
      <button type="button" disabled={sibuk} onClick={simpan}
        className="mt-4 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Simpan Kehadiran
      </button>
    </section>
  );
}

function PanelRoster({ tahunSesi, kelas, roster }: {
  tahunSesi: number; kelas: string[]; roster: MuridRmt[];
}) {
  const [kelasPilih, setKelasPilih] = useState(kelas[0] ?? "");
  const [teks, setTeks] = useState("");
  const [semakan, setSemakan] = useState<{ nama: string; no_kp: string | null }[] | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);
  const router = useRouter();

  async function naik(simpan = false) {
    const m = /^(\d+|PPKI)\s+(.+)$/.exec(kelasPilih);
    const tahun = m && m[1] !== "PPKI" ? Number(m[1]) : 0;
    const namaKelas = m ? (m[1] === "PPKI" ? `PPKI ${m[2]}` : m[2]) : kelasPilih;

    setSibuk(true);
    setNota(null);
    const r = await naikRosterRmt(tahunSesi, tahun, namaKelas, teks, simpan);
    if (!simpan) setSemakan(r.ok ? r.semakan ?? null : null);
    setNota({ ok: r.ok, teks: r.mesej });
    if (r.ok && simpan) { setTeks(""); setSemakan(null); router.refresh(); }
    setSibuk(false);
  }

  async function buang(id: string) {
    const r = await buangRosterRmt(id);
    if (r.ok) router.refresh();
  }

  return (
    <section className="border-t border-garis pt-8">
      <h2 className="text-lg font-bold text-navy-800">Muat Naik Senarai Murid RMT</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Tampal senarai (nama + No. KP, apa cara pun) satu kelas pada satu masa — sistem akan bacanya sendiri.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <select value={kelasPilih} disabled={sibuk} onChange={(e) => { setKelasPilih(e.target.value); setSemakan(null); }}
          className="rounded-lg border border-garis px-3 py-2 text-sm">
          {kelas.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <textarea value={teks} disabled={sibuk} onChange={(e) => { setTeks(e.target.value); setSemakan(null); }} rows={6}
        placeholder={"Ahmad Bin Ali 060101101234\nNur Aisyah Binti Omar, 070202-10-5678"}
        className="mt-3 w-full rounded-lg border border-garis px-3 py-2 font-mono text-xs" />
      {nota && <p className={`mt-2 text-sm ${nota.ok ? "text-[#167a4b]" : "text-red-600"}`}>{nota.teks}</p>}
      <button type="button" disabled={sibuk || !teks.trim()} onClick={() => void naik(false)}
        className="mt-3 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Semak Senarai RMT
      </button>

      {semakan && <div className="mt-4">
        <ol className="max-h-64 overflow-auto text-sm">{semakan.map((m, i) => <li key={i}>{i + 1}. {m.nama} · {m.no_kp}</li>)}</ol>
        <button type="button" disabled={sibuk} onClick={() => void naik(true)} className="mt-3 rounded bg-navy-800 px-4 py-2 text-white">Sahkan dan simpan</button>
      </div>}
      <ul className="mt-6 divide-y divide-garis">
        {roster.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2 text-sm">
            <span>{m.nama} — {m.tahun ? m.tahun : "PPKI"} {m.kelas}</span>
            <button type="button" onClick={() => buang(m.id)} className="text-xs text-red-600 underline">Buang</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
