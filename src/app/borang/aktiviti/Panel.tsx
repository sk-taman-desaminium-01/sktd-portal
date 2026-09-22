"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ciptaAktiviti, tambahPesertaAktiviti, pesertaAktiviti, jawapanAktiviti, tutupAktiviti,
  suntingAktiviti, padamAktiviti, padamJawapanAktiviti, cariMuridAktiviti, tambahPesertaPilih,
  buangPesertaAktiviti,
} from "@/lib/borang-aktiviti";
import type { AktivitiBorang, JawapanAktiviti } from "@/data/borang-aktiviti";
import CetakAkuan from "@/components/CetakAkuan";

type Peserta = { murid_id: string; nama: string; no_kp: string; kelas: string };

const MEDAN: [keyof AktivitiBorang, string, string][] = [
  ["nama", "Nama program", "text"], ["tarikh", "Tarikh program", "date"], ["masa", "Masa (cth: 7.30 PAGI HINGGA 5.00 PETANG)", "text"],
  ["tempat", "Tempat", "text"], ["anjuran", "Anjuran", "text"], ["tutup", "Tarikh tutup jawapan", "date"],
];

const kelasInput = "mt-1 block w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm";

export default function Panel({ senarai, skop }: { senarai: AktivitiBorang[]; skop: string[] }) {
  const [semua, setSemua] = useState(senarai);
  const [pilih, setPilih] = useState<AktivitiBorang | null>(null);
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [jawapan, setJawapan] = useState<JawapanAktiviti[]>([]);
  const [teks, setTeks] = useState("");
  const [semak, setSemak] = useState<Peserta[] | null>(null);
  const [nota, setNota] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [cetak, setCetak] = useState<JawapanAktiviti | null>(null);

  async function laksana(kerja: () => Promise<void>, gagal: string) {
    setSibuk(true);
    setNota("");
    try { await kerja(); } catch (e) { setNota(e instanceof Error ? e.message : gagal); } finally { setSibuk(false); }
  }

  const nilai = (fd: FormData, k: string) => String(fd.get(k) ?? "");

  const cipta = (fd: FormData) => laksana(async () => {
    const r = await ciptaAktiviti({
      nama: nilai(fd, "nama"), tarikh: nilai(fd, "tarikh"), masa: nilai(fd, "masa"), tempat: nilai(fd, "tempat"),
      anjuran: nilai(fd, "anjuran"), tutup: nilai(fd, "tutup"), skop: nilai(fd, "skop"),
    });
    setNota(r.mesej);
    if (r.rekod) { setSemua((s) => [r.rekod!, ...s]); await buka(r.rekod); }
  }, "Gagal mencipta aktiviti.");

  async function muatSemula(a: AktivitiBorang) {
    const [p, j] = await Promise.all([pesertaAktiviti(a.id), jawapanAktiviti(a.id)]);
    setPeserta(p);
    setJawapan(j);
  }

  const buka = (a: AktivitiBorang) => laksana(async () => {
    setCetak(null); setSemak(null); setTeks("");
    await muatSemula(a);
    setPilih(a);
  }, "Gagal membaca aktiviti.");

  const importPeserta = (simpan: boolean) => laksana(async () => {
    if (!pilih) return;
    const r = await tambahPesertaAktiviti(pilih.id, teks, simpan);
    setNota(r.mesej);
    if (r.ok && r.peserta) {
      if (simpan) { setPeserta(await pesertaAktiviti(pilih.id)); setSemak(null); setTeks(""); } else setSemak(r.peserta);
    }
  }, "Gagal import.");

  const tutup = () => laksana(async () => {
    if (!pilih) return;
    await tutupAktiviti(pilih.id);
    setSemua((s) => s.map((a) => (a.id === pilih.id ? { ...a, aktif: false } : a)));
    setPilih({ ...pilih, aktif: false });
    setNota("Borang ditutup. Rekod dan cetakan kekal.");
  }, "Gagal menutup borang.");

  const sunting = (fd: FormData) => laksana(async () => {
    if (!pilih) return;
    const r = await suntingAktiviti(pilih.id, {
      nama: nilai(fd, "nama"), tarikh: nilai(fd, "tarikh"), masa: nilai(fd, "masa"),
      tempat: nilai(fd, "tempat"), anjuran: nilai(fd, "anjuran"), tutup: nilai(fd, "tutup"),
    });
    setNota(r.mesej);
    if (r.ok && r.rekod) { setPilih(r.rekod); setSemua((s) => s.map((a) => (a.id === r.rekod!.id ? r.rekod! : a))); }
  }, "Gagal menyunting aktiviti.");

  const padam = () => {
    if (!pilih || !window.confirm(`Padam ${pilih.nama} bersama peserta dan jawapannya?`)) return;
    void laksana(async () => {
      await padamAktiviti(pilih.id);
      setSemua((s) => s.filter((a) => a.id !== pilih.id));
      setPilih(null);
      setNota("Aktiviti dipadam.");
    }, "Gagal memadam aktiviti.");
  };

  const padamJawapan = (j: JawapanAktiviti) => {
    if (!pilih || !window.confirm(`Padam jawapan ${j.data.muridNama}?`)) return;
    void laksana(async () => {
      await padamJawapanAktiviti(pilih.id, j.id);
      setJawapan((s) => s.filter((x) => x.id !== j.id));
      setCetak(null);
      setNota("Jawapan dipadam.");
    }, "Gagal memadam jawapan.");
  };

  const buangPeserta = (p: Peserta) => {
    if (!pilih || !window.confirm(`Buang ${p.nama} daripada senarai peserta?`)) return;
    void laksana(async () => {
      const r = await buangPesertaAktiviti(pilih.id, p.murid_id);
      setNota(r.mesej);
      if (r.ok) setPeserta((s) => s.filter((x) => x.murid_id !== p.murid_id));
    }, "Gagal membuang peserta.");
  };

  const sudahHantar = new Set(jawapan.map((j) => j.data.muridKp));

  return (
    <div className="mt-5 space-y-5">
      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-bold text-navy-800">+ Cipta aktiviti baharu</summary>
        <form action={cipta} className="mt-4 grid gap-3 sm:grid-cols-2">
          <fieldset disabled={sibuk} className="contents">
            {MEDAN.map(([k, l, t]) => (
              <label key={k} className="min-w-0 text-sm font-semibold text-navy-800">{l}
                <input required type={t} name={k} maxLength={500} className={kelasInput} />
              </label>
            ))}
            <label className="min-w-0 text-sm font-semibold text-navy-800">Pasukan / skop
              <select name="skop" className={kelasInput}>{skop.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <button disabled={sibuk} className="min-h-11 self-end rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Cipta aktiviti</button>
          </fieldset>
        </form>
      </details>

      {nota && <p role="status" className="rounded-xl border border-navy-700/20 bg-navy-50 p-3 text-sm text-navy-800">{nota}</p>}

      <ul className="space-y-2">
        {semua.map((a) => (
          <li key={a.id}>
            <button disabled={sibuk} onClick={() => void buka(a)}
              className={`w-full rounded-xl border bg-white p-4 text-left transition hover:border-navy-700 ${pilih?.id === a.id ? "border-navy-700 ring-1 ring-navy-700" : "border-slate-200"}`}>
              <b className="text-navy-800">{a.nama}</b>
              <span className="mt-0.5 block text-sm text-slate-500">{a.tarikh} · {a.skop} · {a.aktif ? "Dibuka" : "Ditutup"}</span>
            </button>
          </li>
        ))}
        {semua.length === 0 && <li className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Belum ada aktiviti. Cipta yang pertama di atas.</li>}
      </ul>

      {pilih && (
        <section className="min-w-0 space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div>
            <h2 className="text-xl font-bold text-navy-800">{pilih.nama}</h2>
            <p className="mt-1 text-sm text-slate-500">{peserta.length} peserta dipilih · {jawapan.length} akuan diterima</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href={`/kebenaran/${pilih.id}`} target="_blank" className="font-semibold text-navy-700 underline">Pautan untuk ibu bapa ↗</Link>
            {pilih.aktif && <button disabled={sibuk} onClick={() => void tutup()} className="underline">Tutup penerimaan borang</button>}
            <button disabled={sibuk} onClick={padam} className="text-[#8f2424] underline">Padam aktiviti</button>
          </div>

          <details>
            <summary className="cursor-pointer text-sm font-semibold text-navy-800">Sunting butiran aktiviti</summary>
            <form onSubmit={(e) => { e.preventDefault(); void sunting(new FormData(e.currentTarget)); }} className="mt-3 grid gap-3 sm:grid-cols-2">
              {MEDAN.map(([k, l, t]) => (
                <label key={k} className="min-w-0 text-xs font-semibold text-slate-600">{l}
                  <input required name={k} type={t} defaultValue={String(pilih[k] ?? "")} className={kelasInput} />
                </label>
              ))}
              <button disabled={sibuk} className="min-h-11 self-end rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white">Simpan pindaan</button>
            </form>
          </details>

          {/* ---------------- pilih peserta ---------------- */}
          <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
            <h3 className="font-bold text-navy-800">Pilih peserta</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Taip nama atau kelas murid, kemudian tekan nama untuk menambah. No. MyKid diisi
              automatik daripada daftar ePBD. Hanya murid dalam senarai ini boleh diisi borangnya oleh ibu bapa.
            </p>
            <CariMurid aktivitiId={pilih.id} sudah={new Set(peserta.map((p) => p.murid_id))} sibuk={sibuk}
              tambah={(ids) => laksana(async () => {
                const r = await tambahPesertaPilih(pilih.id, ids);
                setNota(r.mesej);
                if (r.ok) setPeserta(await pesertaAktiviti(pilih.id));
              }, "Gagal menambah peserta.")} />

            <ol className="mt-3 max-h-80 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-100">
              {peserta.map((p, i) => (
                <li key={p.murid_id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="w-6 shrink-0 text-right text-xs text-slate-400">{i + 1}.</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-navy-800">{p.nama}</span>
                    <span className="block text-xs text-slate-500">{p.kelas} · {p.no_kp}</span>
                  </span>
                  {sudahHantar.has(p.no_kp)
                    ? <span className="shrink-0 rounded-full bg-[#eef8f2] px-2 py-0.5 text-[11px] font-semibold text-[#167a4b]">Diterima</span>
                    : <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">Menunggu</span>}
                  <button disabled={sibuk} onClick={() => buangPeserta(p)} aria-label={`Buang ${p.nama}`} className="shrink-0 px-1 text-slate-300 hover:text-[#8f2424]">✕</button>
                </li>
              ))}
              {peserta.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">Belum ada peserta.</li>}
            </ol>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-600">Atau tampal senarai (nama + No. KP) secara pukal</summary>
              <textarea disabled={sibuk} value={teks} onChange={(e) => { setTeks(e.target.value); setSemak(null); }} rows={5}
                className="mt-2 w-full min-w-0 rounded-lg border border-slate-300 p-2 text-sm" aria-label="Senarai peserta" />
              <button disabled={sibuk || !teks.trim()} onClick={() => void importPeserta(false)} className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">Semak senarai</button>
              {semak && (
                <div className="mt-3">
                  <ol className="max-h-60 overflow-auto text-sm">{semak.map((p) => <li key={p.murid_id}>{p.nama} · {p.kelas} · {p.no_kp}</li>)}</ol>
                  <button disabled={sibuk} onClick={() => void importPeserta(true)} className="mt-3 rounded-lg bg-navy-800 px-3 py-2 text-sm text-white">Sahkan peserta</button>
                </div>
              )}
            </details>
          </div>

          {/* ---------------- jawapan ---------------- */}
          <div>
            <h3 className="font-bold text-navy-800">Akuan diterima dan cetakan</h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {jawapan.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="min-w-0 text-sm">
                    <b className="text-navy-800">{j.data.muridNama}</b> · {j.data.kelas}
                    <small className={`block ${j.data.bersetuju ? "text-[#167a4b]" : "text-[#8f2424]"}`}>{j.data.bersetuju ? "Membenarkan" : "Tidak membenarkan"}</small>
                  </span>
                  <span className="flex gap-3">
                    <button onClick={() => setCetak(j)} className="text-sm font-semibold text-navy-700 underline">Buka cetakan</button>
                    <button disabled={sibuk} onClick={() => padamJawapan(j)} className="text-sm text-[#8f2424] underline">Padam</button>
                  </span>
                </li>
              ))}
              {jawapan.length === 0 && <li className="py-3 text-sm text-slate-500">Belum ada akuan diterima.</li>}
            </ul>
          </div>
          {cetak && <CetakAkuan aktiviti={pilih} data={cetak.data} tarikh={cetak.dicipta} />}
        </section>
      )}
    </div>
  );
}

/** Carian murid di pelayan dengan tunda 250 ms; pilih berbilang, tambah sekali gus. */
function CariMurid({ aktivitiId, sudah, sibuk, tambah }: {
  aktivitiId: string; sudah: Set<string>; sibuk: boolean; tambah: (ids: string[]) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [hasil, setHasil] = useState<Peserta[]>([]);
  const [dipilih, setDipilih] = useState<Map<string, Peserta>>(new Map());
  const [mencari, setMencari] = useState(false);
  const [ralat, setRalat] = useState("");
  const giliran = useRef(0);

  useEffect(() => {
    const t = q.trim();
    const no = ++giliran.current;
    if (t.length < 2) return;
    const tunda = setTimeout(() => {
      setMencari(true);
      void cariMuridAktiviti(aktivitiId, t).then((r) => {
        if (no !== giliran.current) return;
        setHasil(r.murid);
        setRalat(r.ok ? "" : r.mesej);
      }).finally(() => { if (no === giliran.current) setMencari(false); });
    }, 250);
    return () => clearTimeout(tunda);
  }, [q, aktivitiId]);

  function togol(p: Peserta) {
    setDipilih((m) => {
      const b = new Map(m);
      if (b.has(p.murid_id)) b.delete(p.murid_id); else b.set(p.murid_id, p);
      return b;
    });
  }

  const papar = q.trim().length >= 2 ? hasil : [];

  return (
    <div className="mt-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama murid, kelas atau No. MyKid…"
        aria-label="Cari murid" autoComplete="off" className="block w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
      {ralat && <p className="mt-2 text-xs text-[#8f2424]">{ralat}</p>}
      {q.trim().length >= 2 && (
        <ul className="mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {mencari && papar.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Mencari…</li>}
          {!mencari && papar.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Tiada murid sepadan.</li>}
          {papar.map((p) => {
            const ada = sudah.has(p.murid_id);
            const ya = dipilih.has(p.murid_id);
            return (
              <li key={p.murid_id}>
                <button type="button" disabled={ada} onClick={() => togol(p)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${ada ? "cursor-default opacity-50" : ya ? "bg-navy-50" : "hover:bg-slate-50"}`}>
                  <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-[11px] ${ya || ada ? "border-navy-700 bg-navy-700 text-white" : "border-slate-300"}`}>{ya || ada ? "✓" : ""}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-navy-800">{p.nama}</span>
                    <span className="block text-xs text-slate-500">{p.kelas} · {p.no_kp || "tiada No. MyKid"}{ada ? " · sudah dalam senarai" : ""}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {dipilih.size > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {[...dipilih.values()].map((p) => (
            <span key={p.murid_id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-navy-50 px-2.5 py-1 text-xs text-navy-800">
              <span className="truncate">{p.nama}</span>
              <button type="button" onClick={() => togol(p)} aria-label={`Batal pilih ${p.nama}`} className="text-slate-400">✕</button>
            </span>
          ))}
          <button type="button" disabled={sibuk}
            onClick={() => void tambah([...dipilih.keys()]).then(() => { setDipilih(new Map()); setQ(""); setHasil([]); })}
            className="min-h-10 rounded-lg bg-navy-800 px-4 text-sm font-semibold text-white disabled:opacity-50">
            Tambah {dipilih.size} peserta
          </button>
        </div>
      )}
    </div>
  );
}
