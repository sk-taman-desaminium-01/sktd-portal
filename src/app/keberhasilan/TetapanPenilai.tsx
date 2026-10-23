"use client";

import { useMemo, useState } from "react";
import PilihCari, { type PilihanCari } from "@/components/PilihCari";
import { tetapPenilai, tetapPpAkp, type DataHalaman, type CalonPP, type OrangPeranan } from "@/lib/keberhasilan";
import { BTN_UTAMA, Chip, INPUT, KAD } from "./alat";

type Pilihan = { pp1: string; pp2: string };
type Keadaan = { jenis: "simpan" | "ok" | "gagal"; mesej?: string };
type Kumpulan = "semua" | "guru" | "pentadbir" | "admin" | "kerani";
const BATCH = 40;
const LABEL_KUMPULAN: Record<Kumpulan, string> = { semua: "Semua", guru: "Guru", pentadbir: "Pentadbir", admin: "Admin", kerani: "Kerani & AKP" };

/** Peranan DB → kumpulan paparan. */
function kumpulanDari(p: string): Exclude<Kumpulan, "semua"> {
  return p === "pentadbir" ? "pentadbir" : p === "admin" || p === "admin_mutlak" ? "admin" : p === "kerani" || p === "kakitangan" ? "kerani" : "guru";
}
const labelPeranan = (p: string) => (p === "admin_mutlak" ? "Admin Mutlak" : p === "admin" ? "Admin" : p === "kakitangan" ? "AKP" : p === "kerani" ? "Kerani" : p === "pentadbir" ? "Pentadbir" : "Guru");
const sepadan = (nama: string, cari: string) => {
  const k = cari.toLowerCase().split(/\s+/).filter(Boolean);
  const n = nama.toLowerCase();
  return k.every((x) => n.includes(x));
};

/** Admin mutlak menetapkan PP1 dan PP2 bagi setiap PYD. */
export default function TetapanPenilai({ guru, calon, penilai, selepasSimpan }: {
  guru: OrangPeranan[]; calon: CalonPP | null; penilai: DataHalaman["penilai"]; selepasSimpan: () => void;
}) {
  const awal = useMemo(() => {
    const m: Record<string, Pilihan> = {};
    for (const r of penilai) m[r.pyd_id] = { pp1: r.pp1?.id ?? "", pp2: r.pp2?.id ?? "" };
    return m;
  }, [penilai]);
  const [asal, setAsal] = useState<Record<string, Pilihan>>(awal);
  const [nilai, setNilai] = useState<Record<string, Pilihan>>(awal);
  const [keadaan, setKeadaan] = useState<Record<string, Keadaan>>({});
  const [cari, setCari] = useState("");
  const [kump, setKump] = useState<Kumpulan>("semua");
  const [had, setHad] = useState(BATCH);

  // PP daripada kalangan kerani/AKP (togol optimistik, balik semula bila gagal).
  const [aktif, setAktif] = useState<Set<string>>(() => new Set(calon?.ppAkp.map((o) => o.id) ?? []));
  const [ralatPp, setRalatPp] = useState<string | null>(null);
  const [cariAkp, setCariAkp] = useState("");

  const nama = useMemo(() => new Map([...guru.map((g) => [g.id, g.nama] as const), ...(calon?.pentadbir ?? []).map((g) => [g.id, g.nama] as const), ...(calon?.akp ?? []).map((g) => [g.id, g.nama] as const)]), [guru, calon]);
  const pilihanPent = useMemo<PilihanCari[]>(() => (calon?.pentadbir ?? []).map((o) => ({ nilai: o.id, label: o.nama })), [calon]);
  const pilihanAkp = useMemo<PilihanCari[]>(
    () => (calon?.akp ?? []).filter((o) => aktif.has(o.id)).map((o) => ({ nilai: o.id, label: o.nama })),
    [calon, aktif],
  );

  const ditapis = guru.filter((g) => (kump === "semua" || kumpulanDari(g.peranan) === kump) && sepadan(g.nama, cari));
  const lihat = ditapis.slice(0, had);
  const baca = (id: string) => nilai[id] ?? { pp1: "", pp2: "" };
  const bacaAsal = (id: string) => asal[id] ?? { pp1: "", pp2: "" };

  /** Senarai calon bagi satu PYD; pilihan sedia ada dikekalkan supaya kelihatan walaupun di luar kolam. */
  function pilihanBagi(g: OrangPeranan, sedia: string, buang: string): PilihanCari[] {
    const rakanAkp = kumpulanDari(g.peranan) === "kerani";
    const asas = rakanAkp ? [...pilihanPent, ...pilihanAkp] : pilihanPent;
    const senarai = asas.filter((o) => o.nilai !== g.id && o.nilai !== buang);
    if (sedia && !senarai.some((o) => o.nilai === sedia)) senarai.push({ nilai: sedia, label: nama.get(sedia) ?? "?" });
    return [{ nilai: "", label: "(Belum ditetapkan)" }, ...senarai];
  }

  async function simpan(id: string) {
    const n = baca(id);
    setKeadaan((k) => ({ ...k, [id]: { jenis: "simpan" } }));
    try {
      const r = await tetapPenilai({ pydId: id, pp1Id: n.pp1 || null, pp2Id: n.pp2 || null });
      if (r.ok) {
        setAsal((a) => ({ ...a, [id]: n }));
        setKeadaan((k) => ({ ...k, [id]: { jenis: "ok" } }));
        selepasSimpan();
      } else setKeadaan((k) => ({ ...k, [id]: { jenis: "gagal", mesej: r.mesej } }));
    } catch (e) {
      setKeadaan((k) => ({ ...k, [id]: { jenis: "gagal", mesej: e instanceof Error ? e.message : "Sambungan terputus." } }));
    }
  }

  async function togol(id: string, hidup: boolean) {
    setRalatPp(null);
    setAktif((s) => { const b = new Set(s); if (hidup) b.add(id); else b.delete(id); return b; });
    const pulih = () => setAktif((s) => { const b = new Set(s); if (hidup) b.delete(id); else b.add(id); return b; });
    try {
      const r = await tetapPpAkp({ guruId: id, aktif: hidup });
      if (r.ok) selepasSimpan();
      else { pulih(); setRalatPp(r.mesej); }
    } catch (e) {
      pulih();
      setRalatPp(e instanceof Error ? e.message : "Sambungan terputus.");
    }
  }

  const akp = calon?.akp ?? [];
  const akpLihat = akp.filter((o) => sepadan(o.nama, cariAkp));
  const belumSedia = !!calon?.ppAkpBelumSedia;

  return (
    <div className="mt-5 grid min-w-0 gap-4">
      <section>
        <h2 className="text-xl font-bold text-navy-800">Tetapan penilai</h2>
        <p className="mt-1 max-w-prose text-sm text-slate-600">Tetapkan PP1 (mengesahkan) dan PP2 (memperakui) bagi setiap PYD. PP1 mesti ditetapkan sebelum PYD boleh menghantar borang.</p>
      </section>

      <section className={`${KAD} grid gap-3 p-4`}>
        <div>
          <h3 className="text-base font-bold text-navy-800">PP daripada kalangan Kerani &amp; AKP</h3>
          <p className="mt-0.5 max-w-prose text-sm text-slate-600">Dilantik untuk menilai rakan Kerani/AKP. Pentadbir dan Admin Mutlak sudah menjadi PP secara automatik.</p>
        </div>
        {belumSedia && <p className="rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">Admin perlu jalankan SQL 20261023_keberhasilan_pp_akp.sql</p>}
        {!!calon?.mutlakTiadaRekod && <p className="text-sm text-slate-500">{calon.mutlakTiadaRekod} akaun Admin Mutlak belum mempunyai rekod dan akan muncul selepas log masuk seterusnya.</p>}
        {akp.length > 8 && <input value={cariAkp} onChange={(e) => setCariAkp(e.target.value)} placeholder="Cari nama Kerani/AKP…" aria-label="Cari Kerani atau AKP" className={`${INPUT} max-w-sm`} />}
        {akp.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada akaun Kerani/AKP dalam Senarai Akses.</p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {akpLihat.map((o) => (
              <li key={o.id}>
                <label className={`flex min-h-10 items-center gap-2.5 rounded-lg border border-garis px-3 py-1.5 text-sm ${belumSedia ? "opacity-60" : "cursor-pointer hover:border-navy-700"}`}>
                  <input type="checkbox" disabled={belumSedia} checked={aktif.has(o.id)} onChange={(e) => void togol(o.id, e.target.checked)} className="size-4 shrink-0 accent-[#1b4a80]" />
                  <span className="min-w-0 break-words">{o.nama}</span>
                </label>
              </li>
            ))}
            {!akpLihat.length && <li className="text-sm text-slate-500">Tiada yang sepadan.</li>}
          </ul>
        )}
        {ralatPp && <p role="alert" className="text-sm font-medium text-red-700">{ralatPp}</p>}
      </section>

      <section className="flex flex-wrap items-center gap-2" role="group" aria-label="Tapis kumpulan PYD">
        {(Object.keys(LABEL_KUMPULAN) as Kumpulan[]).map((k) => (
          <button key={k} type="button" aria-pressed={kump === k} onClick={() => { setKump(k); setHad(BATCH); }}
            className={`rounded-full border px-3 py-1.5 text-[13.5px] font-semibold ${kump === k ? "border-navy-900 bg-navy-900 text-white" : "border-garis bg-white text-navy-800 hover:border-navy-700"}`}>
            {LABEL_KUMPULAN[k]}
          </button>
        ))}
        <input value={cari} onChange={(e) => { setCari(e.target.value); setHad(BATCH); }} placeholder="Cari nama…" aria-label="Cari nama guru" className={`${INPUT} min-h-9 max-w-64 py-1.5`} />
      </section>

      <section className={KAD}>
        {lihat.map((g) => {
          const n = baca(g.id), a = bacaAsal(g.id), k = keadaan[g.id];
          const ubah = n.pp1 !== a.pp1 || n.pp2 !== a.pp2;
          return (
            <div key={g.id} className="grid gap-2.5 border-b border-garis p-3 last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <div className="min-w-0 self-center">
                <b className="block break-words text-[15px]">{g.nama}</b>
                <span className="mt-0.5 flex flex-wrap gap-1"><Chip>{labelPeranan(g.peranan)}</Chip>{!a.pp1 && <Chip v="warn">PP1 belum ditetapkan</Chip>}</span>
              </div>
              <PilihCari id={`pp1-${g.id}`} label="PP1" pilihan={pilihanBagi(g, n.pp1, "")} nilai={n.pp1} tukar={(v) => setNilai((s) => ({ ...s, [g.id]: { ...baca(g.id), pp1: v } }))} />
              <PilihCari id={`pp2-${g.id}`} label="PP2" pilihan={pilihanBagi(g, n.pp2, n.pp1)} nilai={n.pp2} tukar={(v) => setNilai((s) => ({ ...s, [g.id]: { ...baca(g.id), pp2: v } }))} />
              <div className="grid gap-1">
                <button type="button" disabled={!ubah || k?.jenis === "simpan"} onClick={() => void simpan(g.id)} className={BTN_UTAMA}>{k?.jenis === "simpan" ? "Menyimpan…" : "Simpan"}</button>
                {k?.jenis === "ok" && !ubah && <small className="text-emerald-700">Disimpan</small>}
                {k?.jenis === "gagal" && <small role="alert" className="max-w-56 text-red-700">{k.mesej}</small>}
              </div>
            </div>
          );
        })}
        {!lihat.length && <p className="p-4 text-center text-sm text-slate-500">Tiada yang sepadan.</p>}
      </section>
      {ditapis.length > had && (
        <button type="button" onClick={() => setHad((h) => h + BATCH)} className="justify-self-start rounded-lg border border-garis bg-white px-3 py-2 text-sm font-semibold text-navy-800 hover:border-navy-700">
          Papar lagi ({ditapis.length - had})
        </button>
      )}
    </div>
  );
}
