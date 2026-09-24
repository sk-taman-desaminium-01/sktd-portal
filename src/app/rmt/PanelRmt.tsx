"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hadirRmtTarikh, hadirRmtBulan, naikRosterRmt, buangRosterRmt, simpanHadirRmt, type MuridRmt } from "@/lib/rmt";
import CetakLaporan from "@/components/CetakLaporan";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import PilihCari from "@/components/PilihCari";

export default function PanelRmt({
  tahunSesi, kelas, bolehRoster, senarai, rosterUrus, tarikhAwal, hadirAwal,
}: {
  tahunSesi: number;
  kelas: string[];
  bolehRoster: boolean;
  senarai: MuridRmt[];
  rosterUrus: MuridRmt[];
  tarikhAwal: string;
  hadirAwal: Record<string, boolean>;
}) {
  return (
    <div className="mt-6 space-y-10">
      <PanelKehadiran tahunSesi={tahunSesi} roster={senarai} tarikhAwal={tarikhAwal} hadirAwal={hadirAwal} />
      {bolehRoster && (
        <PanelRoster tahunSesi={tahunSesi} kelas={kelas} roster={rosterUrus} />
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
  const [bulanan, setBulanan] = useState<{ tarikh: string[]; hadir: Record<string, string[]> } | null>(null);

  /**
   * REKOD KEHADIRAN BULANAN — dokumen yang diserahkan.
   *
   * RMT ialah program bertuntutan; laporannya bulanan, bukan harian. Data
   * ini sudah wujud sejak guru menanda setiap hari — yang tiada sebelum ini
   * hanyalah cara mengeluarkannya.
   */
  async function cetakBulanan() {
    setSibuk(true);
    try {
      const bulan = tarikh.slice(0, 7);
      const r = await hadirRmtBulan(tahunSesi, bulan);
      if (r.belumSedia) {
        setNota({ ok: false, teks: "Jadual kehadiran RMT belum dipasang." });
        return;
      }
      setBulanan({ tarikh: r.tarikh, hadir: r.hadir });
      setTimeout(() => mulaCetak("rmt-cetak", "Rekod Kehadiran RMT"), 0);
    } catch {
      setNota({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally { setSibuk(false); }
  }

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
          className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-1.5 text-sm sm:w-auto" />
      </div>
      <p className="mt-1 text-xs text-slate-500">Sesiapa guru boleh isi — tanda murid yang HADIR sahaja.</p>
      <button
        type="button" onClick={() => void cetakBulanan()} disabled={sibuk}
        className="mt-3 min-h-11 touch-manipulation rounded-lg border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800 disabled:opacity-50"
      >
        Cetak rekod bulan ini
      </button>

      <div className="mt-4 space-y-3">
        {kumpulan.map(([label, murid], indeks) => (
          <details key={label} open={indeks === 0} className="group rounded-xl border border-garis bg-slate-50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-navy-800">
              <span>{label}</span>
              <span className="flex items-center gap-2 text-xs font-normal text-slate-500">
                {murid.filter((m) => hadir[m.id]).length}/{murid.length} hadir
                <span aria-hidden="true" className="transition group-open:rotate-180">⌄</span>
              </span>
            </summary>
            <ul className="grid gap-1.5 border-t border-garis bg-white p-4 sm:grid-cols-2">
              {murid.map((m) => (
                <li key={m.id}>
                  <label className="flex min-w-0 items-start gap-2 text-sm">
                    <input type="checkbox" disabled={sibuk} checked={hadir[m.id] ?? false}
                      onChange={(e) => setHadir((h) => ({ ...h, [m.id]: e.target.checked }))} className="mt-0.5 shrink-0" />
                    <span className="min-w-0"><span className="block break-words">{m.nama}</span>{m.no_kp && <span className="block text-[11px] text-slate-500">{m.no_kp}</span>}</span>
                  </label>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      {nota && <p className={`mt-3 text-sm ${nota.ok ? "text-[#167a4b]" : "text-red-600"}`}>{nota.teks}</p>}
      <button type="button" disabled={sibuk} onClick={simpan}
        className="mt-4 min-h-11 touch-manipulation rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Simpan Kehadiran
      </button>

      {bulanan && (
        <CetakLaporan
          id="rmt-cetak"
          kertas="landscape"
          tajuk="Rekod Kehadiran Rancangan Makanan Tambahan (RMT)"
          subtajuk={new Intl.DateTimeFormat("ms-MY", { month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" })
            .format(new Date(`${tarikh.slice(0, 7)}-01T00:00:00Z`))}
          maklumat={[
            { label: "Sesi", nilai: String(tahunSesi) },
            { label: "Bilangan murid", nilai: String(roster.length) },
            { label: "Hari direkod", nilai: String(bulanan.tarikh.length) },
          ]}
          lajur={[
            { tajuk: "Nama Murid" },
            { tajuk: "Kelas", lebar: "22mm", tengah: true },
            ...bulanan.tarikh.map((t) => ({ tajuk: t.slice(8), lebar: "6mm", tengah: true })),
            { tajuk: "Jumlah", lebar: "16mm", tengah: true },
          ]}
          baris={roster.map((m) => {
            const hari = bulanan.hadir[m.id] ?? [];
            return [
              m.nama,
              `${m.tahun} ${m.kelas}`.trim(),
              ...bulanan.tarikh.map((t) => (hari.includes(t) ? "/" : "")),
              hari.length,
            ];
          })}
          nota="Tanda / bermakna murid HADIR pada hari tersebut. Hari yang tiada rekod (cuti, hujung minggu) tidak dipaparkan."
          tandatangan={[
            { label: "Disediakan oleh", jawatan: "Guru RMT" },
            { label: "Disahkan oleh", jawatan: "Guru Besar" },
          ]}
        />
      )}
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

  const kumpulan = useMemo(() => {
    const peta = new Map<string, MuridRmt[]>();
    for (const m of roster) {
      const label = `${m.tahun ? m.tahun : "PPKI"} ${m.kelas}`.trim();
      peta.set(label, [...(peta.get(label) ?? []), m]);
    }
    return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0], "ms"));
  }, [roster]);

  async function naik(simpan = false) {
    try {
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
    } catch {
      setNota({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  async function buang(id: string) {
    try {
      const murid = roster.find((m) => m.id === id);
      if (!murid || !window.confirm(`Buang ${murid.nama} daripada senarai RMT?`)) return;
      setSibuk(true); setNota(null);
      const r = await buangRosterRmt(id);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) router.refresh();
      setSibuk(false);
    } catch {
      setNota({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section className="border-t border-garis pt-8">
      <h2 className="text-lg font-bold text-navy-800">Muat Naik Senarai Murid RMT</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Tampal senarai (nama + No. KP, apa cara pun) satu kelas pada satu masa — sistem akan bacanya sendiri.
      </p>
      <div className="mt-4 flex min-w-0 flex-wrap gap-3">
        <div className="w-full min-w-0 sm:w-64"><PilihCari id="rmt-kelas" label="Kelas" sembunyiLabel disabled={sibuk} nilai={kelasPilih} tukar={(v) => { setKelasPilih(v); setSemakan(null); }} placeholder="Taip kelas, cth: 4 bes" pilihan={kelas.map((k) => ({ nilai: k, label: k }))} /></div>
      </div>
      <textarea value={teks} disabled={sibuk} onChange={(e) => { setTeks(e.target.value); setSemakan(null); }} rows={6}
        placeholder={"Ahmad Bin Ali 060101101234\nNur Aisyah Binti Omar, 070202-10-5678"}
        className="mt-3 block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 font-mono text-xs" />
      {nota && <p className={`mt-2 text-sm ${nota.ok ? "text-[#167a4b]" : "text-red-600"}`}>{nota.teks}</p>}
      <button type="button" disabled={sibuk || !teks.trim()} onClick={() => void naik(false)}
        className="mt-3 min-h-11 touch-manipulation rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Semak Senarai RMT
      </button>

      {semakan && <div className="mt-4">
        <ol className="max-h-64 overflow-auto text-sm">{semakan.map((m, i) => <li key={i}>{i + 1}. {m.nama} · {m.no_kp}</li>)}</ol>
        <button type="button" disabled={sibuk} onClick={() => void naik(true)} className="mt-3 min-h-11 touch-manipulation rounded bg-navy-800 px-4 py-2 text-white">Sahkan dan simpan</button>
      </div>}
      <div className="mt-6 space-y-3">
        {kumpulan.map(([label, murid]) => (
          <details key={label} className="group rounded-xl border border-garis bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-navy-800">
              <span>{label}</span>
              <span className="flex items-center gap-2 text-xs font-normal text-slate-500">{murid.length} murid <span aria-hidden="true" className="transition group-open:rotate-180">⌄</span></span>
            </summary>
            <ul className="divide-y divide-garis border-t border-garis">
              {murid.map((m) => (
                <li key={m.id} className="flex min-w-0 items-start justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0"><span className="block break-words">{m.nama}</span><span className="block text-xs text-slate-500">No. KP: {m.no_kp ?? "—"}</span></span>
                  <button type="button" disabled={sibuk} onClick={() => void buang(m.id)} className="min-h-11 shrink-0 touch-manipulation px-1 text-xs font-semibold text-red-600 underline disabled:opacity-50">Buang</button>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
