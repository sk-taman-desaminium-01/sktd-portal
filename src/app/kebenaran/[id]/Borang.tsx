"use client";

import { useState } from "react";
import Link from "next/link";
import { PENYAKIT, type AkuanAktiviti } from "@/data/borang-aktiviti";
import { hantarAkuan } from "@/lib/borang-aktiviti";
import TandaTangan from "@/components/TandaTangan";

function Teks({ nama, label, jenis = "text", panjang = 150, lengkap = "off" }: { nama: string; label: string; jenis?: string; panjang?: number; lengkap?: string }) {
  const kadPengenalan = nama === "muridKp" || nama === "penjagaKp";
  return <label className="block min-w-0 text-sm font-semibold text-navy-800">{label}<input name={nama} type={jenis} required maxLength={kadPengenalan ? 14 : panjang} inputMode={kadPengenalan ? "numeric" : jenis === "tel" ? "tel" : undefined} pattern={kadPengenalan ? "[0-9 -]{12,14}" : undefined} autoComplete={lengkap} className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>;
}

export default function Borang({ aktivitiId }: { aktivitiId: string }) {
  const [nota, setNota] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [resit, setResit] = useState<string>();
  const [tandatangan, setTandatangan] = useState<string | null>(null);

  async function hantar(formData: FormData) {
    setSibuk(true);
    setNota("");
    try {
      const teks = (kunci: string) => String(formData.get(kunci) ?? "").trim();
      const data: AkuanAktiviti = {
        muridNama: teks("muridNama"), muridKp: teks("muridKp").replace(/[- ]/g, ""), kelas: "",
        penjagaNama: teks("penjagaNama"), penjagaKp: teks("penjagaKp").replace(/[- ]/g, ""),
        alamat: teks("alamat"), telefon: teks("telefon"), bersetuju: teks("izin") === "ya",
        penyakit: PENYAKIT.map((_, indeks) => ({ ada: teks(`ada-${indeks}`) === "ya", catatan: teks(`catatan-${indeks}`) })),
        ...(tandatangan ? { tandatangan } : {}),
      };
      if (!tandatangan) { setNota("Sila turunkan tandatangan ibu bapa/penjaga dahulu."); return; }
      const hasil = await hantarAkuan(aktivitiId, data, teks("laman"));
      setNota(hasil.mesej);
      if (hasil.ok) setResit(hasil.resit);
    } catch {
      setNota("Sambungan terputus. Hubungi pengurus jika penghantaran sudah diterima.");
    } finally {
      setSibuk(false);
    }
  }

  if (resit) {
    return <section className="mt-5 rounded-2xl border border-[#b9ddca] bg-[#edf8f2] p-5"><h2 className="font-bold text-[#145f42]">Akuan berjaya diterima</h2><p className="mt-2 text-sm text-[#145f42]">{nota}</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-bold text-white" href={`/kebenaran/resit/${resit}`}>Pratonton dan cetak borang</Link><p className="mt-3 text-xs text-slate-600">Simpan pautan resit secara peribadi. Pautan sah selama 90 hari.</p></section>;
  }

  return (
    <form action={hantar} className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <fieldset disabled={sibuk} className="min-w-0 space-y-5 disabled:opacity-70">
        <section>
          <h2 className="text-lg font-bold text-navy-800">Maklumat murid dan penjaga</h2>
          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
            <Teks nama="muridNama" label="Nama penuh murid (seperti dalam MyKid)" />
            <Teks nama="muridKp" label="No. MyKid / Surat Beranak murid" />
            <Teks nama="penjagaNama" label="Nama ibu bapa atau penjaga" lengkap="name" />
            <Teks nama="penjagaKp" label="No. KP penjaga" />
            <Teks nama="telefon" label="No. telefon" jenis="tel" lengkap="tel" />
            <label className="block min-w-0 text-sm font-semibold text-navy-800 sm:col-span-2">Alamat penjaga<textarea name="alamat" required maxLength={500} rows={3} autoComplete="street-address" className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5">
          <h2 className="text-lg font-bold text-navy-800">Maklumat kesihatan</h2>
          <p className="mt-1 text-sm text-slate-600">Jawab semua soalan. Isi catatan jika ada penyakit atau alahan.</p>
          <div className="mt-4 space-y-3">
            {PENYAKIT.map((penyakit, indeks) => (
              <fieldset key={penyakit} className="min-w-0 rounded-xl border border-slate-200 p-3">
                <legend className="max-w-full px-1 text-sm font-semibold text-navy-800">{penyakit}</legend>
                <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <label className="flex items-center gap-2"><input type="radio" name={`ada-${indeks}`} value="ya" required /> Ya</label>
                  <label className="flex items-center gap-2"><input type="radio" name={`ada-${indeks}`} value="tidak" required /> Tidak</label>
                </div>
                <input name={`catatan-${indeks}`} maxLength={100} aria-label={`Catatan ${penyakit}`} placeholder="Catatan (jika ada)" className="mt-3 block w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </fieldset>
            ))}
          </div>
        </section>

        <fieldset className="min-w-0 border-t border-slate-200 pt-5">
          <legend className="pt-5 text-lg font-bold text-navy-800">Keputusan penyertaan</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-300 p-3 text-sm font-semibold"><input required type="radio" name="izin" value="ya" /> Membenarkan</label>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-300 p-3 text-sm font-semibold"><input required type="radio" name="izin" value="tidak" /> Tidak membenarkan</label>
          </div>
        </fieldset>

        <section className="border-t border-slate-200 pt-5">
          <h2 className="text-lg font-bold text-navy-800">Tandatangan ibu bapa / penjaga</h2>
          <p className="mt-1 text-sm text-slate-600">Lukis dengan jari, atau muat naik gambar tandatangan. Ia dicetak pada kedua-dua muka borang.</p>
          <div className="mt-3"><TandaTangan nilai={tandatangan} tetap={setTandatangan} tempatan /></div>
        </section>

        <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-700"><input type="checkbox" required className="mt-1 shrink-0" /><span>Saya ialah ibu bapa atau penjaga murid ini dan mengesahkan semua maklumat adalah benar. Saya memahami perakuan rawatan perubatan dan perlindungan Takaful dalam borang cetakan.</span></label>
        <label className="sr-only" aria-hidden="true">Laman web<input name="laman" tabIndex={-1} autoComplete="off" /></label>
        <p className="text-xs leading-relaxed text-slate-500">Maklumat digunakan oleh sekolah untuk pengurusan penyertaan dan keselamatan murid. Hanya murid yang dipilih oleh jurulatih/pengurus pasukan boleh didaftarkan. Saksi dan cop sekolah dilengkapkan pada cetakan.</p>
        <button className="min-h-11 w-full rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto" disabled={sibuk}>{sibuk ? "Menghantar…" : "Hantar akuan"}</button>
      </fieldset>
      {nota && <p role="status" className="mt-4 rounded-xl border border-[#edc2c2] bg-[#fff1f1] p-3 text-sm text-[#842525]">{nota}</p>}
    </form>
  );
}
