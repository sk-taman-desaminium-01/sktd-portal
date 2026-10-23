"use client";

import { useMemo, useState } from "react";
import PilihCari, { type PilihanCari } from "@/components/PilihCari";
import { tetapPenilai, type BarisPantau, type Orang } from "@/lib/keberhasilan";
import { BTN_UTAMA, Chip, INPUT, KAD } from "./alat";

type Pilihan = { pp1: string; pp2: string };
type Keadaan = { jenis: "simpan" | "ok" | "gagal"; mesej?: string };
const BATCH = 40;

/** Pemerhati (pentadbir/admin) menetapkan PP1 dan PP2 bagi setiap PYD. */
export default function TetapanPenilai({ guru, pantau, selepasSimpan }: {
  guru: Orang[]; pantau: BarisPantau[]; selepasSimpan: () => void;
}) {
  const awal = useMemo(() => {
    const m: Record<string, Pilihan> = {};
    for (const r of pantau) m[r.pyd.id] = { pp1: r.pp1?.id ?? "", pp2: r.pp2?.id ?? "" };
    return m;
  }, [pantau]);
  const [asal, setAsal] = useState<Record<string, Pilihan>>(awal);
  const [nilai, setNilai] = useState<Record<string, Pilihan>>(awal);
  const [keadaan, setKeadaan] = useState<Record<string, Keadaan>>({});
  const [cari, setCari] = useState("");
  const [had, setHad] = useState(BATCH);

  const pilihan: PilihanCari[] = useMemo(
    () => [{ nilai: "", label: "(Belum ditetapkan)" }, ...guru.map((g) => ({ nilai: g.id, label: g.nama }))],
    [guru],
  );
  const kata = cari.toLowerCase().split(/\s+/).filter(Boolean);
  const ditapis = guru.filter((g) => kata.every((k) => g.nama.toLowerCase().includes(k)));
  const lihat = ditapis.slice(0, had);
  const baca = (id: string) => nilai[id] ?? { pp1: "", pp2: "" };
  const bacaAsal = (id: string) => asal[id] ?? { pp1: "", pp2: "" };

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

  return (
    <div className="mt-5 grid min-w-0 gap-4">
      <section>
        <h2 className="text-xl font-bold text-navy-800">Tetapan penilai</h2>
        <p className="mt-1 max-w-prose text-sm text-slate-600">Tetapkan PP1 (mengesahkan) dan PP2 (memperakui) bagi setiap PYD. PP1 mesti ditetapkan sebelum PYD boleh menghantar borang.</p>
      </section>
      <input value={cari} onChange={(e) => { setCari(e.target.value); setHad(BATCH); }} placeholder="Cari nama guru…" aria-label="Cari nama guru" className={`${INPUT} max-w-sm`} />
      <section className={KAD}>
        {lihat.map((g) => {
          const n = baca(g.id), a = bacaAsal(g.id), k = keadaan[g.id];
          const ubah = n.pp1 !== a.pp1 || n.pp2 !== a.pp2;
          return (
            <div key={g.id} className="grid gap-3 border-b border-garis p-3.5 last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <div className="min-w-0 self-center"><b className="block break-words text-[15px]">{g.nama}</b>
                {!a.pp1 && <Chip v="warn">PP1 belum ditetapkan</Chip>}</div>
              <PilihCari id={`pp1-${g.id}`} label="PP1" pilihan={pilihan.filter((o) => o.nilai !== g.id)} nilai={n.pp1} tukar={(v) => setNilai((s) => ({ ...s, [g.id]: { ...baca(g.id), pp1: v } }))} />
              <PilihCari id={`pp2-${g.id}`} label="PP2" pilihan={pilihan.filter((o) => o.nilai !== g.id && (o.nilai === "" || o.nilai !== n.pp1))} nilai={n.pp2} tukar={(v) => setNilai((s) => ({ ...s, [g.id]: { ...baca(g.id), pp2: v } }))} />
              <div className="grid gap-1">
                <button type="button" disabled={!ubah || k?.jenis === "simpan"} onClick={() => void simpan(g.id)} className={BTN_UTAMA}>{k?.jenis === "simpan" ? "Menyimpan…" : "Simpan"}</button>
                {k?.jenis === "ok" && !ubah && <small className="text-emerald-700">Disimpan</small>}
                {k?.jenis === "gagal" && <small role="alert" className="max-w-56 text-red-700">{k.mesej}</small>}
              </div>
            </div>
          );
        })}
        {!lihat.length && <p className="p-4 text-center text-sm text-slate-500">Tiada guru yang sepadan.</p>}
      </section>
      {ditapis.length > had && (
        <button type="button" onClick={() => setHad((h) => h + BATCH)} className="justify-self-start rounded-lg border border-garis bg-white px-3 py-2 text-sm font-semibold text-navy-800 hover:border-navy-700">
          Papar lagi ({ditapis.length - had})
        </button>
      )}
    </div>
  );
}
