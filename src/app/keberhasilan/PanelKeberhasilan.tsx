"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PilihCari from "@/components/PilihCari";
import CetakKeberhasilan from "@/components/CetakKeberhasilan";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import { keadaan, peringkatSemasa, type Borang } from "@/data/keberhasilan";
import { bukaBorang, type BarisPantau, type BorangPenuh, type DataHalaman, type PerananLihat } from "@/lib/keberhasilan";
import { useSuntingan } from "./suntingan";
import BorangEkb from "./BorangEkb";
import PapanPantau, { perluTindakan } from "./PapanPantau";
import TetapanPenilai from "./TetapanPenilai";
import Panduan from "./Panduan";
import { BTN_UTAMA, KAD, inisial, namaPendek, tarikh } from "./alat";

type Tab = "saya" | "pantau" | "semak" | "pratonton" | "aktiviti" | "panduan" | "tetapan";

/** Sasaran yang menunggu balasan PYD + peringkat yang dipulangkan kepadanya. */
function bilPerluBalas(p: BorangPenuh): number {
  const akhir = new Map<string, string>();
  for (const u of p.ulasan) akhir.set(u.sasaran_id, u.oleh_peranan);
  let n = [...akhir.values()].filter((x) => x !== "PYD").length;
  const c = peringkatSemasa(p.borang);
  if (c < 4 && keadaan(p.borang, c) === "dipulang") n++;
  return n;
}

export default function PanelKeberhasilan({ data }: { data: DataHalaman }) {
  const router = useRouter();
  const saya = useSuntingan(data.borangSaya);
  const semak = useSuntingan(null);
  const [tabPilih, setTabPilih] = useState<Tab | null>(null);
  const [membuka, setMembuka] = useState<string | null>(null);
  const [ralat, setRalat] = useState<string | null>(null);
  const [pv, setPv] = useState<string | null>(null);
  const [pvMuat, setPvMuat] = useState<BorangPenuh | null>(null);
  const [pvRalat, setPvRalat] = useState<{ id: string; mesej: string } | null>(null);
  const [cetakRalat, setCetakRalat] = useState(false);

  const tabs: { k: Tab; t: string; n?: number }[] = [];
  if (data.borangSaya) tabs.push({ k: "saya", t: "Borang saya", n: saya.penuh ? bilPerluBalas(saya.penuh) : 0 });
  if (data.pantau.length) tabs.push({ k: "pantau", t: "Pantau PYD", n: data.pantau.filter(perluTindakan).length });
  if (semak.penuh) tabs.push({ k: "semak", t: `Semak: ${namaPendek(semak.penuh.borang.pyd.nama)}` });
  tabs.push({ k: "pratonton", t: "Pratonton borang" }, { k: "aktiviti", t: "Aktiviti" }, { k: "panduan", t: "Panduan" });
  if (data.pemerhati) tabs.push({ k: "tetapan", t: "Tetapan penilai" });
  const tab: Tab = tabs.some((x) => x.k === tabPilih) ? (tabPilih as Tab) : tabs[0].k;

  function pergi(k: Tab) { setTabPilih(k); setRalat(null); window.scrollTo({ top: 0 }); }

  async function bukaRow(r: BarisPantau) {
    if (semak.penuh?.borang.id === r.borang_id && !semak.bersih()) { pergi("semak"); return; }
    if (semak.penuh?.borang.id === r.borang_id) {
      // Draf bersih: muat semula supaya PYD/PP lain yang berubah sejak dibuka kelihatan.
      setMembuka(r.borang_id);
      await semak.muatSemula();
      setMembuka(null); pergi("semak");
      return;
    }
    setMembuka(r.borang_id); setRalat(null);
    try {
      // Draf borang yang sedang dibuka mesti selamat sebelum diganti.
      if (!(await semak.simpan())) { setRalat("Perubahan pada borang yang sedang dibuka belum berjaya disimpan. Selesaikan dahulu sebelum membuka borang lain."); return; }
      const x = await bukaBorang(r.borang_id);
      if (x.ok) { semak.muat(x.data); pergi("semak"); setPv(r.borang_id); }
      else setRalat(x.mesej);
    } catch (e) {
      setRalat(e instanceof Error ? e.message : "Sambungan terputus.");
    } finally {
      setMembuka(null);
    }
  }

  /* ---- pratonton: borang yang dipilih (draf ditindih bila sedang disunting) ---- */
  const pvId = pv ?? saya.penuh?.borang.id ?? semak.penuh?.borang.id ?? data.pantau[0]?.borang_id ?? null;
  let pvBorang: Borang | null = null;
  let pvPeranan: PerananLihat = "PYD";
  if (pvId && pvId === saya.penuh?.borang.id) { pvBorang = saya.borangLihat; pvPeranan = "PYD"; }
  else if (pvId && pvId === semak.penuh?.borang.id) { pvBorang = semak.borangLihat; pvPeranan = semak.penuh?.peranan ?? "PEMERHATI"; }
  else if (pvId && pvMuat?.borang.id === pvId) { pvBorang = pvMuat.borang; pvPeranan = pvMuat.peranan; }
  const perluMuat = tab === "pratonton" && !!pvId && !pvBorang && pvRalat?.id !== pvId;

  useEffect(() => {
    if (!perluMuat || !pvId) return;
    let batal = false;
    bukaBorang(pvId).then(
      (r) => { if (batal) return; if (r.ok) setPvMuat(r.data); else setPvRalat({ id: pvId, mesej: r.mesej }); },
      (e) => { if (!batal) setPvRalat({ id: pvId, mesej: e instanceof Error ? e.message : "Sambungan terputus." }); },
    );
    return () => { batal = true; };
  }, [perluMuat, pvId]);

  const pilihanPv = [
    ...(data.borangSaya ? [{ nilai: data.borangSaya.borang.id, label: "Borang saya" }] : []),
    ...data.pantau.map((r) => ({ nilai: r.borang_id, label: r.pyd.nama })),
  ];

  /* ---- aktiviti ---- */
  const sumber = [saya.penuh, semak.penuh].filter((x): x is BorangPenuh => !!x);
  const peristiwa = sumber
    .flatMap((p) => p.log.map((l) => ({ ...l, borang: p.peranan === "PYD" ? "Borang saya" : p.borang.pyd.nama })))
    .sort((a, c) => c.dicipta.localeCompare(a.dicipta))
    .slice(0, 100);

  return (
    <div className="mt-5 min-w-0">
      <nav role="tablist" aria-label="Menu e-Keberhasilan" className="-mx-4 flex gap-0.5 overflow-x-auto border-b border-garis px-4 sm:mx-0 sm:px-0">
        {tabs.map((x) => (
          <button
            key={x.k}
            type="button"
            role="tab"
            aria-selected={tab === x.k}
            onClick={() => pergi(x.k)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-3.5 py-2.5 text-sm font-semibold ${tab === x.k ? "border-emas text-navy-800" : "border-transparent text-slate-500 hover:text-navy-800"}`}
          >
            {x.t}
            {!!x.n && <span className="grid h-[19px] min-w-[19px] place-items-center rounded-full bg-emas px-1.5 text-[11px] font-bold text-[#1c1400]">{x.n}</span>}
          </button>
        ))}
      </nav>

      {ralat && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{ralat}</p>}

      <div role="tabpanel">
        {tab === "saya" && data.borangSaya && (
          <BorangEkb s={saya} data={data} onRefresh={() => router.refresh()} />
        )}
        {tab === "pantau" && <PapanPantau data={data} buka={(r) => void bukaRow(r)} membuka={membuka} />}
        {tab === "semak" && semak.penuh && (
          <BorangEkb key={semak.penuh.borang.id} s={semak} data={data} onKembali={() => pergi("pantau")} onRefresh={() => router.refresh()} />
        )}

        {tab === "pratonton" && (
          <div className="mt-5 grid min-w-0 gap-4">
            <section className="flex flex-wrap items-end gap-3">
              {pilihanPv.length > 1 && (
                <div className="w-full max-w-sm">
                  <PilihCari id="pv-borang" label="Borang PYD" pilihan={pilihanPv} nilai={pvId ?? ""} tukar={(v) => { setPv(v); setCetakRalat(false); }} />
                </div>
              )}
              <p className="min-w-0 max-w-prose flex-1 text-sm text-slate-600">
                Pratonton mengikut templat rasmi. Ruang tandatangan diisi automatik dengan tarikh hantar (PYD), sah (PP1) dan perakuan (PP2).
              </p>
              <button
                type="button"
                disabled={!pvBorang}
                onClick={() => setCetakRalat(!mulaCetak("keberhasilan-cetak", `Borang Keberhasilan ${pvBorang?.tahun ?? data.tahun}`))}
                className={BTN_UTAMA}
              >Cetak / Simpan PDF</button>
            </section>
            {cetakRalat && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">Pratonton cetak tidak dapat dibuka. Semak ruang simpanan pelayar anda dan cuba lagi.</p>}
            {pvBorang ? (
              <div className="overflow-x-auto rounded-xl border border-garis bg-slate-50 p-3 sm:p-4">
                <CetakKeberhasilan borang={pvBorang} sembunyiKp={pvPeranan !== "PYD"} />
              </div>
            ) : pvRalat?.id === pvId ? (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{pvRalat?.mesej}</p>
            ) : pvId ? (
              <p className="p-6 text-center text-sm text-slate-500">Memuatkan borang…</p>
            ) : (
              <p className="p-6 text-center text-sm text-slate-500">Tiada borang untuk dipratonton.</p>
            )}
          </div>
        )}

        {tab === "aktiviti" && (
          <div className="mt-5 grid gap-4">
            <section>
              <h2 className="text-xl font-bold text-navy-800">Aktiviti</h2>
              <small className="text-slate-500">Jejak audit borang yang telah anda buka dalam sesi ini (100 terkini bagi setiap borang).</small>
            </section>
            <section className={KAD}>
              {peristiwa.length ? peristiwa.map((e, i) => (
                <div key={`${e.dicipta}-${i}`} className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-start gap-2.5 border-b border-garis px-4 py-3 text-sm last:border-b-0">
                  <span className="grid size-[30px] place-items-center rounded-full bg-navy-100 text-[11px] font-bold text-navy-700">{inisial(e.oleh_nama)}</span>
                  <div className="min-w-0">
                    <b>{namaPendek(e.oleh_nama)}</b> <span className="text-xs text-slate-500">{e.oleh_peranan}</span>
                    <div className="break-words">{e.teks}{sumber.length > 1 && <span className="text-xs text-slate-500"> · {e.borang}</span>}</div>
                  </div>
                  <time className="whitespace-nowrap text-xs text-slate-500" dateTime={e.dicipta}>{tarikh(e.dicipta, true)}</time>
                </div>
              )) : <div className="px-4 py-6 text-center text-slate-500"><b>Belum ada aktiviti</b></div>}
            </section>
          </div>
        )}

        {tab === "panduan" && <Panduan tahun={data.tahun} />}
        {tab === "tetapan" && data.pemerhati && <TetapanPenilai guru={data.guru} calon={data.calon} penilai={data.penilai} selepasSimpan={() => router.refresh()} />}
      </div>
    </div>
  );
}
