"use client";

import { useState } from "react";
import {
  bolehTeks, keadaan, markahSasaran, normalAngkaUkuran, pencapaianSasaran, petunjuk, segmenTebal, STATUS_SASARAN,
  type Borang, type Kuasa, type Sasaran, type StatusSasaran,
} from "@/data/keberhasilan";
import { HAD_BAIT, semakSaiz } from "@/data/had-fail";
import { normalkanFail } from "@/data/muatan-pelayar";
import {
  daftarBukti, buangBukti, mintaSlotBukti, pautanBukti, tambahUlasan,
  type PerananLihat,
} from "@/lib/keberhasilan";
import type { Suntingan } from "./suntingan";
import { BTN_BAHAYA, BTN_BAHAYA_PEKAT, BTN_SENYAP, BTN_UTAMA, Chip, INPUT, inisial, namaPendek, saizFail, tarikh, type Varian } from "./alat";

function InputUkuran({ id, label, nilai, tukar, simpan }: {
  id: string; label: string; nilai: string; tukar: (v: string) => void; simpan: () => void;
}) {
  return <div className="grid gap-1">
    <label htmlFor={id} className="text-sm font-semibold text-slate-600">{label}</label>
    <input id={id} type="text" inputMode="decimal" value={nilai} maxLength={40}
      onChange={(e) => tukar(e.target.value)} onBlur={simpan} className={`${INPUT} font-mono`} />
  </div>;
}

function SenaraiBukti({ s, borangId, sasaranId, pk, boleh, sudahDisimpan }: {
  s: Suntingan; borangId: string; sasaranId: string; pk: "p1" | "akhir"; boleh: boolean; sudahDisimpan: boolean;
}) {
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [ralat, setRalat] = useState<string | null>(null);
  const senarai = (s.penuh?.bukti ?? []).filter((b) => b.sasaran_id === sasaranId && b.peringkat === pk);
  if (!senarai.length && !boleh) return null;

  async function muatNaik(fail: File[]) {
    setRalat(null);
    for (let n = 0; n < fail.length; n++) {
      try {
        const salah = semakSaiz(fail[n]);
        if (salah) { setRalat(salah); continue; }
        setSibuk(`Memuat naik ${n + 1}/${fail.length}: ${fail[n].name}…`);
        const f = await normalkanFail(fail[n]);
        const slot = await mintaSlotBukti({ borangId, sasaranId, peringkat: pk, nama: f.name, saiz: f.size });
        if (!slot.ok) { setRalat(slot.mesej); continue; }
        // Pengepala sama seperti `sediaMuatan` (muatan-pelayar.ts).
        const res = await fetch(slot.urlMuatNaik, {
          method: "PUT",
          headers: {
            "Content-Type": f.type || "application/octet-stream",
            "x-upsert": "false",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          },
          body: f,
        });
        if (!res.ok) { setRalat(`Muat naik ke storan gagal (${res.status}). Semak sambungan internet dan cuba lagi.`); continue; }
        const d = await s.serentak(() => daftarBukti({ borangId, sasaranId, peringkat: pk, laluan: slot.laluan, nama: f.name }));
        if (d.ok) s.tambahBuktiLokal(d.bukti, d.versi); else setRalat(d.mesej);
      } catch (e) {
        setRalat(e instanceof Error ? e.message : "Muat naik gagal.");
      }
    }
    setSibuk(null);
  }

  async function buka(id: string) {
    setRalat(null);
    const w = window.open("", "_blank");
    try {
      const r = await pautanBukti(id);
      if (r.ok) { if (w) w.location.href = r.url; else window.open(r.url, "_blank"); }
      else { w?.close(); setRalat(r.mesej); }
    } catch (e) {
      w?.close();
      setRalat(e instanceof Error ? e.message : "Fail tidak dapat dibuka.");
    }
  }

  async function buang(id: string) {
    setRalat(null);
    try {
      const r = await s.serentak(() => buangBukti(id));
      if (r.ok) s.buangBuktiLokal(id, r.versi); else setRalat(r.mesej);
    } catch (e) {
      setRalat(e instanceof Error ? e.message : "Gagal membuang bukti.");
    }
  }

  return (
    <div className="grid gap-1.5">
      {senarai.map((b) => (
        <div key={b.id} className="flex min-w-0 items-center gap-2 text-sm">
          <span aria-hidden="true" className="shrink-0 text-slate-400">📄</span>
          <button type="button" onClick={() => void buka(b.id)} title={b.nama} className="min-w-0 flex-1 truncate text-left font-medium text-navy-700 underline-offset-2 hover:underline">
            {b.nama}
          </button>
          <small className="hidden shrink-0 text-slate-500 sm:inline">{saizFail(b.saiz)} · {tarikh(b.dicipta)}</small>
          {boleh && (
            <button type="button" onClick={() => void buang(b.id)} aria-label={`Buang ${b.nama}`} className={`${BTN_BAHAYA} !min-h-8 shrink-0 !px-2 !py-1 text-xs`}>Buang</button>
          )}
        </div>
      ))}
      {boleh && (sudahDisimpan ? (
        <label className={`text-sm font-semibold ${sibuk ? "text-slate-500" : "cursor-pointer text-navy-700 hover:underline"}`}>
          {sibuk ?? "+ Muat naik bukti"}
          <input
            type="file"
            multiple
            disabled={!!sibuk}
            className="sr-only"
            onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; if (f.length) void muatNaik(f); }}
          />
        </label>
      ) : (
        <small className="text-slate-500">Tunggu sasaran ini disimpan sebelum memuat naik bukti.</small>
      ))}
      {boleh && <small className="text-slate-500">Maksimum {HAD_BAIT / 1048576} MB sebuah fail.</small>}
      {ralat && <p role="alert" className="text-sm font-medium text-red-700">{ralat}</p>}
    </div>
  );
}

function LajurNilai({ which, s, borang, k, peranan, sas, adaPelayan }: {
  which: 1 | 2; s: Suntingan; borang: Borang; k: Kuasa; peranan: PerananLihat; sas: Sasaran; adaPelayan: boolean;
}) {
  const pk = which === 1 ? "p1" : "akhir";
  const pf = which === 1 ? "p1" : "p2";
  const mf = which === 1 ? "m1" : "m2";
  const idx = which === 1 ? 1 : 3;
  const dikecualikan = (which === 1 && sas.status === "TAMBAH") || (which === 2 && sas.status === "GUGUR");
  const bolehP = k[pf] && !dikecualikan;
  const bolehM = k[mf] && !dikecualikan;
  const nilaiSasaran = which === 1 ? sas.ukuran?.sasaran ?? "" : sas.ukuran?.sasaranAkhir ?? sas.ukuran?.sasaran ?? "";
  const nilaiCapai = sas.ukuran?.[pf] ?? "";
  const sasaranSah = Number(normalAngkaUkuran(nilaiSasaran)) > 0;
  const bolehSasaran = !dikecualikan && (k.penetapan || bolehP
    || (which === 2 && k.semakan && (sas.status === "PINDA" || sas.status === "TAMBAH"))
    || (bolehM && (!nilaiCapai || !sasaranSah)));
  const tukarUkuran = (medan: "sasaran" | "sasaranAkhir" | "p1" | "p2", nilai: string) =>
    s.ubahSasaran(sas.id, { ukuran: { sasaran: sas.ukuran?.sasaran ?? "", ...sas.ukuran, [medan]: nilai } });
  const asal = which === 1 ? sas.m1_asal : sas.m2_asal;
  const buka = bolehP || bolehM || bolehSasaran || (which === 1 && k.status);
  const kosong = which === 1 && sas.status === "TAMBAH" ? "Sasaran ditambah selepas penilaian pertama"
    : which === 2 && sas.status === "GUGUR" ? "Sasaran digugurkan" : "Belum diisi";
  const varianStatus: Varian = sas.status === "GUGUR" ? "bad" : sas.status === "TAMBAH" ? "info" : sas.status === "PINDA" ? "warn" : "";
  const nilaiP = pencapaianSasaran(sas, which);
  const nilaiM = markahSasaran(sas, which);
  const markahLama = sas.ukuran?.[pf] === undefined && nilaiM !== "";

  return (
    <div className={`grid min-w-0 gap-2 rounded-lg border p-3 ${buka ? "border-navy-700/40 bg-white" : "border-garis bg-slate-50"}`}>
      <h4 className="flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        {which === 1 ? "Penilaian pertama" : "Penilaian akhir"}
        {keadaan(borang, idx) === "kunci" && <Chip>belum dibuka</Chip>}
      </h4>
      {!dikecualikan && <div className="grid gap-2">
        {bolehSasaran ? <InputUkuran id={`sasaran-${pf}-${sas.id}`} label="Nilai sasaran" nilai={nilaiSasaran}
          tukar={(v) => tukarUkuran(which === 1 ? "sasaran" : "sasaranAkhir", v)} simpan={s.simpanSegera} />
          : <div className="text-sm text-slate-600">Nilai sasaran: <b className="font-mono text-slate-800">{nilaiSasaran || "Belum diisi"}</b></div>}
        {bolehP || bolehM ? <InputUkuran id={`capai-${pf}-${sas.id}`} label="Nilai pencapaian" nilai={nilaiCapai}
          tukar={(v) => tukarUkuran(pf, v)} simpan={s.simpanSegera} />
          : <div className="text-sm text-slate-600">Nilai pencapaian: <b className="font-mono text-slate-800">{nilaiCapai || "Belum diisi"}</b></div>}
        {(bolehSasaran || bolehP || bolehM) && <small className="text-slate-500">Gunakan unit yang sama, contohnya sasaran 20 tugasan dan pencapaian 15 tugasan.</small>}
        {nilaiSasaran && !sasaranSah && <p role="alert" className="text-sm text-red-700">Nilai sasaran mesti nombor yang lebih daripada sifar.</p>}
        {nilaiCapai && !normalAngkaUkuran(nilaiCapai) && <p role="alert" className="text-sm text-red-700">Nilai pencapaian mesti nombor sifar atau lebih.</p>}
      </div>}
      {bolehP ? (
        <div className="grid gap-1">
        <label htmlFor={`${pf}-${sas.id}`} className="text-sm font-semibold text-slate-600">Penerangan pencapaian (pilihan jika angka diisi)</label>
        <textarea
          id={`${pf}-${sas.id}`}
          rows={2}
          value={sas[pf]}
          maxLength={1000}
          onChange={(e) => s.ubahSasaran(sas.id, { [pf]: e.target.value })}
          onBlur={s.simpanSegera}
          placeholder={`Pencapaian semasa ${which === 1 ? "penilaian pertama" : "penilaian akhir"}`}
          className={`${INPUT} resize-y leading-snug`}
        />
        </div>
      ) : (
        <p className={`whitespace-pre-wrap break-words py-1 text-sm ${nilaiP ? "" : "italic text-slate-500"}`}>{nilaiP || kosong}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <output aria-label={`Markah ${pf}-${sas.id}`} className="font-mono text-lg font-semibold">{nilaiM || "–"}</output>
        <small className="text-slate-500">{markahLama ? "markah tersimpan" : "markah automatik"}</small>
        {asal !== undefined && <span className="text-xs font-medium text-amber-800">Cadangan PYD: {asal || "–"} · diubah PP1</span>}
        {which === 1 && (k.status ? (
          <select
            aria-label="Status sasaran"
            value={sas.status}
            onChange={(e) => { s.ubahSasaran(sas.id, { status: e.target.value as StatusSasaran }); s.simpanSegera(); }}
            className={`${INPUT} w-auto`}
          >
            {STATUS_SASARAN.map((v) => <option key={v} value={v} disabled={v === "TAMBAH" && sas.status !== "TAMBAH"}>{v}</option>)}
          </select>
        ) : (
          <Chip v={varianStatus}>{sas.status}</Chip>
        ))}
        {markahLama && (bolehP || bolehM) && <small className="text-slate-500">Isi angka sasaran dan pencapaian untuk menggunakan kiraan automatik.</small>}
        {bolehM && peranan === "PP1" && <small className="font-medium text-amber-800">Semak dan betulkan angka pencapaian jika perlu.</small>}
      </div>
      <SenaraiBukti
        s={s}
        borangId={borang.id}
        sasaranId={sas.id}
        pk={pk}
        boleh={k.bukti[pk] && !(which === 1 && sas.status === "TAMBAH")}
        sudahDisimpan={adaPelayan}
      />
    </div>
  );
}

function Ulasan({ s, borang, sas, peranan, adaPelayan }: {
  s: Suntingan; borang: Borang; sas: Sasaran; peranan: PerananLihat; adaPelayan: boolean;
}) {
  const senarai = (s.penuh?.ulasan ?? []).filter((u) => u.sasaran_id === sas.id);
  const akhir = senarai[senarai.length - 1];
  const perluBalas = !!akhir && (peranan === "PYD" ? akhir.oleh_peranan !== "PYD" : akhir.oleh_peranan === "PYD");
  const [buka, setBuka] = useState(perluBalas);
  const [teks, setTeks] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const boleh = adaPelayan;
  if (!senarai.length && !boleh) return null;

  async function hantar() {
    const t = teks.trim();
    if (!t) return;
    setSibuk(true); setRalat(null);
    try {
      const r = await tambahUlasan({ borangId: borang.id, sasaranId: sas.id, teks: t });
      if (r.ok) { s.tambahUlasanLokal(r.ulasan); setTeks(""); } else setRalat(r.mesej);
    } catch (e) {
      setRalat(e instanceof Error ? e.message : "Gagal menghantar ulasan.");
    }
    setSibuk(false);
  }

  return (
    <details open={buka} onToggle={(e) => setBuka(e.currentTarget.open)} className="border-t border-dashed border-garis pt-2">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-semibold text-navy-700">
        Ulasan{senarai.length ? ` (${senarai.length})` : ""}
        {perluBalas && <Chip v="emas">{peranan === "PYD" ? "Perlu dibalas" : "Balasan PYD"}</Chip>}
      </summary>
      {senarai.length ? (
        <div className="my-3 grid gap-2.5">
          {senarai.map((u) => (
            <div key={u.id} className="grid grid-cols-[30px_minmax(0,1fr)] gap-2 text-sm">
              <span className={`grid size-[30px] place-items-center rounded-full text-[11px] font-bold ${u.oleh_peranan === "PP1" ? "bg-[#f6edd6] text-emas-gelap" : u.oleh_peranan === "PP2" ? "bg-violet-50 text-violet-700" : "bg-navy-100 text-navy-700"}`}>
                {inisial(u.oleh_nama)}
              </span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500"><b className="text-slate-800">{namaPendek(u.oleh_nama)}</b> · {u.oleh_peranan} · {tarikh(u.dicipta, true)}</div>
                <div className="whitespace-pre-wrap break-words">{u.teks}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="my-2 text-sm text-slate-500">Belum ada ulasan. {peranan === "PYD" ? "PP boleh mengulas di sini, dan anda boleh membalas." : "Ulasan anda akan dilihat oleh PYD."}</p>
      )}
      {boleh && (
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={teks}
            maxLength={1000}
            onChange={(e) => setTeks(e.target.value)}
            placeholder={peranan === "PYD" ? "Balas atau tanya PP" : "Tulis ulasan kepada PYD"}
            aria-label="Ulasan sasaran"
            className={`${INPUT} min-h-10 flex-1 resize-y`}
          />
          <button type="button" onClick={() => void hantar()} disabled={sibuk || !teks.trim()} className={BTN_UTAMA}>{sibuk ? "Menghantar…" : "Hantar"}</button>
        </div>
      )}
      {ralat && <p role="alert" className="mt-1 text-sm font-medium text-red-700">{ralat}</p>}
    </details>
  );
}

export default function KadSasaran({ s, borang, k, peranan, sas, no, si, len, adaPelayan, pend, setPend, fokusId }: {
  s: Suntingan; borang: Borang; k: Kuasa; peranan: PerananLihat; sas: Sasaran; no: number; si: number; len: number;
  adaPelayan: boolean; pend: string | null; setPend: (v: string | null) => void; fokusId: string | null;
}) {
  const suntingTeks = bolehTeks(k, sas);
  const padam = pend === `del-${sas.id}`;
  return (
    <div className={`grid gap-3 border-b border-garis p-3 last:border-b-0 sm:grid-cols-[34px_minmax(0,1fr)] sm:p-4 ${sas.status === "GUGUR" ? "bg-slate-50/60" : ""}`}>
      <div className="grid size-[30px] place-items-center rounded-md bg-navy-100 font-mono text-[15px] font-semibold text-navy-700">{no}</div>
      <div className="grid min-w-0 gap-2.5">
        {suntingTeks ? (
          <textarea
            id={`t-${sas.id}`}
            rows={2}
            value={sas.teks}
            maxLength={1000}
            autoFocus={sas.id === fokusId}
            aria-label={`Sasaran keberhasilan ${no}`}
            placeholder="Memastikan … daripada … orang murid … mencapai … pada …"
            onChange={(e) => s.ubahSasaran(sas.id, { teks: e.target.value })}
            onBlur={s.simpanSegera}
            className={`${INPUT} resize-y leading-snug`}
          />
        ) : (
          <div className={`break-words text-[15.5px] leading-relaxed ${sas.status === "GUGUR" ? "opacity-60" : ""}`}>
            {sas.teks ? segmenTebal(sas.teks).map((g, i) => (g.tebal ? <b key={i}>{g.teks}</b> : <span key={i}>{g.teks}</span>)) : <span className="italic text-slate-500">Sasaran belum ditulis</span>}
          </div>
        )}
        {(suntingTeks || peranan !== "PYD") && (
          <div className="flex flex-wrap gap-1.5">
            {petunjuk(sas.teks).map(([j, t]) => <Chip key={t} v={j}>{t}</Chip>)}
          </div>
        )}
        <div className={`grid gap-2.5 md:grid-cols-2 ${sas.status === "GUGUR" ? "opacity-80" : ""}`}>
          <LajurNilai which={1} s={s} borang={borang} k={k} peranan={peranan} sas={sas} adaPelayan={adaPelayan} />
          <LajurNilai which={2} s={s} borang={borang} k={k} peranan={peranan} sas={sas} adaPelayan={adaPelayan} />
        </div>
        <Ulasan s={s} borang={borang} sas={sas} peranan={peranan} adaPelayan={adaPelayan} />
        {k.penetapan && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => s.alihSasaran(sas.id, -1)} disabled={si === 0} aria-label="Naikkan" className={BTN_SENYAP}>↑</button>
            <button type="button" onClick={() => s.alihSasaran(sas.id, 1)} disabled={si === len - 1} aria-label="Turunkan" className={BTN_SENYAP}>↓</button>
            <span className="flex-1" />
            {padam ? (
              <span className="flex flex-wrap items-center gap-1.5 text-sm text-red-700">
                Padam sasaran ini?
                <button type="button" onClick={() => { s.padamSasaran(sas.id); setPend(null); }} className={BTN_BAHAYA_PEKAT}>Padam</button>
                <button type="button" onClick={() => setPend(null)} className={BTN_SENYAP}>Batal</button>
              </span>
            ) : (
              <button type="button" onClick={() => setPend(`del-${sas.id}`)} className={BTN_BAHAYA}>Padam</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
