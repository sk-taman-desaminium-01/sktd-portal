"use client";

import { useState } from "react";
import { LABEL_KEADAAN, PERINGKAT, tarikhTutup, type KeadaanPeringkat } from "@/data/keberhasilan";
import type { BarisPantau, DataHalaman } from "@/lib/keberhasilan";
import { BTN, BTN_UTAMA, Chip, INPUT, KAD, WARNA_JEJAK, tarikh } from "./alat";

/** Peringkat yang menunggu TINDAKAN SAYA pada baris ini. */
export const perluTindakan = (r: BarisPantau) =>
  r.peranan === "PP1" ? r.r.tunggu1.length > 0 : r.peranan === "PP2" ? r.r.tunggu2.length > 0 : false;

/** Keadaan peringkat i, diterbitkan daripada ringkasan (tiada borang penuh di sini). */
function keadaanI(r: BarisPantau, i: number): KeadaanPeringkat {
  if (i < r.r.cur) return r.r.tunggu2.includes(i) ? "sah1" : "sah2";
  if (i === r.r.cur && r.r.st !== "selesai") return r.r.st;
  return "kunci";
}

type Tapis = "semua" | "tindakan" | "lewat" | "selesai";
const LABEL_TAPIS: Record<Tapis, string> = { semua: "Semua", tindakan: "Perlu tindakan anda", lewat: "Lewat", selesai: "Selesai" };

export default function PapanPantau({ data, buka, membuka }: {
  data: DataHalaman; buka: (r: BarisPantau) => void; membuka: string | null;
}) {
  const [tapis, setTapis] = useState<Tapis>("semua");
  const [cari, setCari] = useState("");
  const baris = data.pantau;
  const perlu = baris.filter(perluTindakan);
  const lewat = baris.filter((r) => r.r.lewat);
  const skor = baris.map((r) => r.r.k1.skor).filter((x): x is number => !!x);
  const purata = skor.length ? skor.reduce((a, c) => a + c, 0) / skor.length : null;
  const akhirSah = baris.filter((r) => r.r.cur === 4).length;
  const akhirHantar = baris.filter((r) => r.r.tunggu1.includes(3)).length;
  const kumpulan: Record<Tapis, BarisPantau[]> = { semua: baris, tindakan: perlu, lewat, selesai: baris.filter((r) => r.r.cur === 4) };
  const kata = cari.toLowerCase().split(/\s+/).filter(Boolean);
  const senarai = kumpulan[tapis].filter((r) => kata.every((k) => r.pyd.nama.toLowerCase().includes(k)));

  return (
    <div className="mt-5 grid min-w-0 gap-4">
      <section>
        <h2 className="text-xl font-bold text-navy-800">Pantau PYD · {data.tahun}</h2>
        <small className="text-slate-500">{baris.length} orang PYD di bawah penilaian anda</small>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={`rounded-xl border p-3.5 ${perlu.length ? "border-emas bg-[#fdf9f0]" : "border-garis bg-white"}`}>
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Perlu tindakan anda</span>
          <span className={`block font-mono text-4xl font-extrabold leading-tight ${perlu.length ? "text-emas-gelap" : "text-navy-800"}`}>{perlu.length}</span>
          <span className="text-[13px] text-slate-500">Peringkat menunggu pengesahan atau perakuan anda</span>
        </div>
        <div className={`${KAD} p-3.5`}>
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Lewat tarikh tutup</span>
          <span className={`block font-mono text-4xl font-extrabold leading-tight ${lewat.length ? "text-red-700" : "text-navy-800"}`}>{lewat.length}</span>
          <span className="text-[13px] text-slate-500">PYD belum menghantar peringkat semasa</span>
        </div>
        <div className={`${KAD} p-3.5`}>
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Purata skor P1</span>
          <span className="block font-mono text-4xl font-extrabold leading-tight text-navy-800">{purata !== null ? purata.toFixed(1) : "–"}</span>
          <span className="text-[13px] text-slate-500">Daripada {skor.length} PYD yang dinilai</span>
        </div>
        <div className={`${KAD} p-3.5`}>
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Penilaian akhir</span>
          <span className="block font-mono text-4xl font-extrabold leading-tight text-navy-800">{akhirSah}<span className="text-xl text-slate-500">/{baris.length}</span></span>
          <span className="text-[13px] text-slate-500">Disahkan · {akhirHantar} menunggu PP1 · tutup {tarikh(tarikhTutup(data.tahun, 3))}</span>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2" role="group" aria-label="Tapis PYD">
        {(Object.keys(kumpulan) as Tapis[]).map((k) => (
          <button key={k} type="button" aria-pressed={tapis === k} onClick={() => setTapis(k)}
            className={`rounded-full border px-3 py-1.5 text-[13.5px] font-semibold ${tapis === k ? "border-navy-900 bg-navy-900 text-white" : "border-garis bg-white text-navy-800 hover:border-navy-700"}`}>
            {LABEL_TAPIS[k]} <span className="font-mono">{kumpulan[k].length}</span>
          </button>
        ))}
        {baris.length > 8 && (
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama PYD…" aria-label="Cari nama PYD" className={`${INPUT} min-h-9 max-w-64 py-1.5`} />
        )}
      </section>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500" aria-hidden="true">
        {([["sah2", "Diperakui PP2"], ["sah1", "Disahkan PP1"], ["dihantar", "Dihantar"], ["dipulang", "Dipulangkan"], ["draf", "Draf"]] as const).map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><i className={`inline-block h-2 w-4 rounded-sm ${WARNA_JEJAK[k]}`} />{l}</span>
        ))}
      </div>

      <section className={`${KAD}`}>
        {senarai.length ? senarai.map((r) => {
          const bendera: React.ReactNode[] = [];
          if (perluTindakan(r)) bendera.push(<Chip key="t" bungkus v="emas">{r.peranan === "PP1" ? `Sahkan ${PERINGKAT[r.r.tunggu1[0]].t}` : `Perakui ${r.r.tunggu2.map((i) => PERINGKAT[i].t).join(", ")}`}</Chip>);
          if (r.r.lewat && r.r.cur < 4) bendera.push(<Chip key="l" bungkus v="bad">Lewat: {PERINGKAT[r.r.cur].t}</Chip>);
          if (r.r.st === "dipulang") bendera.push(<Chip key="p" bungkus v="bad">Dipulangkan</Chip>);
          if (r.balasPyd) bendera.push(<Chip key="b" bungkus v="info">{r.balasPyd} balasan PYD</Chip>);
          if (r.peranan === "PP1" && r.r.tunggu2.length && !r.r.tunggu1.length) bendera.push(<Chip key="w" bungkus>Tunggu PP2</Chip>);
          if (!bendera.length) bendera.push(<Chip key="o" bungkus v="ok">Mengikut jadual</Chip>);
          const mendesak = perluTindakan(r);
          return (
            <div key={r.borang_id} className="grid gap-x-4 gap-y-2.5 border-b border-garis p-3.5 last:border-b-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_130px_minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <b className="block break-words text-[15px]">{r.pyd.nama}</b>
                <small className="text-slate-500">{r.r.bilSasaran} sasaran · {r.bilBukti} bukti{r.peranan === "PEMERHATI" ? (r.pp1 ? ` · PP1 ${r.pp1.nama}` : " · PP1 belum ditetapkan") : ""}</small>
              </div>
              <div className="min-w-0">
                <div className="grid grid-cols-4 gap-[3px]">
                  {[0, 1, 2, 3].map((i) => <i key={i} title={`${PERINGKAT[i].t}: ${LABEL_KEADAAN[keadaanI(r, i)]}`} className={`h-[9px] rounded-sm ${WARNA_JEJAK[keadaanI(r, i)]}`} />)}
                </div>
                <div className="mt-1.5 text-[12.5px] text-slate-500">{r.r.cur < 4 ? `${PERINGKAT[r.r.cur].t} · ${LABEL_KEADAAN[keadaanI(r, r.r.cur)]}` : "Lengkap"}</div>
              </div>
              <div className="text-[13px] text-slate-500">P1 <b className="font-mono text-base text-slate-800">{r.r.k1.skor ?? "–"}</b> · Akhir <b className="font-mono text-base text-slate-800">{r.r.k2.skor ?? "–"}</b></div>
              <div className="flex flex-wrap gap-1.5">{bendera}</div>
              <div>
                <button type="button" disabled={membuka === r.borang_id} onClick={() => buka(r)} className={mendesak ? BTN_UTAMA : BTN}>
                  {membuka === r.borang_id ? "Membuka…" : mendesak ? "Semak sekarang" : r.peranan === "PEMERHATI" ? "Lihat borang" : "Buka borang"}
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="grid justify-items-center gap-1 px-4 py-6 text-center text-slate-500"><b>Tiada PYD dalam tapisan ini</b><span>Pilih “Semua” untuk melihat senarai penuh.</span></div>
        )}
      </section>
    </div>
  );
}
