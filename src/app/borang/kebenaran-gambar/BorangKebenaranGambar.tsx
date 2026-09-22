"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import CetakMedia from "@/components/CetakMedia";
import TandaTangan from "@/components/TandaTangan";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import type { KepalaSurat } from "@/components/CetakSurat";
import type { BarisSurat, DataSuratGambar } from "@/lib/surat";
import { hantarKebenaranGambarAwam, namaGuruKelasBorangAwam } from "@/lib/surat-awam";
import PilihCari from "@/components/PilihCari";

type Nilai = {
  penjagaNama: string;
  penjagaKp: string;
  alamat: string;
  telefon: string;
  muridNama: string;
  muridKp: string;
  muridKelas: string;
  catatan: string;
};

const NILAI_AWAL: Nilai = {
  penjagaNama: "", penjagaKp: "", alamat: "", telefon: "",
  muridNama: "", muridKp: "", muridKelas: "", catatan: "",
};

function Medan({ label, children, kelas = "" }: { label: string; children: React.ReactNode; kelas?: string }) {
  return <label className={`block min-w-0 text-sm font-semibold text-navy-800 ${kelas}`}>{label}{children}</label>;
}

export default function BorangKebenaranGambar({ kelas, kepala }: { kelas: string[]; kepala: KepalaSurat }) {
  const [nilai, setNilai] = useState<Nilai>({ ...NILAI_AWAL });
  const [bersetuju, setBersetuju] = useState<boolean | null>(null);
  const [tandatangan, setTandatangan] = useState<string | null>(null);
  const [rekodCetak, setRekodCetak] = useState<BarisSurat | null>(null);
  const [mesej, setMesej] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const borangRef = useRef<HTMLFormElement | null>(null);
  const perangkapRef = useRef<HTMLInputElement | null>(null);

  function ubah(kunci: keyof Nilai, kandungan: string) {
    setNilai((asal) => ({ ...asal, [kunci]: kandungan }));
  }

  function dataCetak(): DataSuratGambar | null {
    if (!borangRef.current?.reportValidity()) return null;
    // Kelas bermula KOSONG: lalai "kelas pertama" pernah membuat borang
    // masuk ke guru kelas yang salah bila ibu bapa terlepas medan ini.
    if (!nilai.muridKelas) {
      setMesej({ ok: false, teks: "Pilih kelas anak anda." });
      return null;
    }
    if (bersetuju === null) {
      setMesej({ ok: false, teks: "Pilih Bersetuju atau Tidak bersetuju." });
      return null;
    }
    if (!tandatangan) {
      setMesej({ ok: false, teks: "Sahkan tandatangan ibu bapa atau penjaga dahulu." });
      return null;
    }
    return { ...nilai, bersetuju, sumber: "awam" };
  }

  function binaRekod(data: DataSuratGambar, id: string, dicipta: string): BarisSurat {
    return {
      id, jenis: "gambar", status: "selesai", tajuk: `Kebenaran Gambar — ${data.muridNama.trim()}`,
      rujukan_kami: null, pemohon_nama: data.penjagaNama ?? "", pemohon_emel: "",
      tandatangan_url: tandatangan, data, dicipta,
    };
  }

  async function pratonton() {
    setMesej(null);
    const data = dataCetak();
    if (!data) return;
    setSibuk(true);
    try {
      data.guruKelasNama = await namaGuruKelasBorangAwam(data.muridKelas);
      flushSync(() => setRekodCetak(binaRekod(data, "pratonton", new Date().toISOString())));
      mulaCetak("surat-cetak", "Kebenaran Gambar");
    } finally {
      setSibuk(false);
    }
  }

  async function hantar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = dataCetak();
    if (!data) return;
    setSibuk(true);
    setMesej(null);
    try {
      const hasil = await hantarKebenaranGambarAwam({
        ...data,
        penjagaNama: data.penjagaNama ?? "", penjagaKp: data.penjagaKp ?? "",
        alamat: data.alamat ?? "", telefon: data.telefon ?? "", muridKp: data.muridKp ?? "",
        tandatangan_url: tandatangan,
        lamanPerangkap: perangkapRef.current?.value ?? "",
      });
      setMesej({ ok: hasil.ok, teks: hasil.mesej });
      if (hasil.ok && hasil.id && hasil.dicipta) {
        data.guruKelasNama = hasil.guruKelasNama;
        setRekodCetak(binaRekod(data, hasil.id, hasil.dicipta));
      }
    } catch {
      setMesej({ ok: false, teks: "Sambungan terputus. Cuba lagi sebelum menghantar semula." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <>
      <form ref={borangRef} onSubmit={hantar} className="mt-6 min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <fieldset disabled={sibuk} className="min-w-0 space-y-5 disabled:opacity-70">
          <section>
            <h2 className="text-lg font-bold text-navy-800">Maklumat ibu bapa atau penjaga</h2>
            <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
              <Medan label="Nama penuh">
                <input required autoComplete="name" maxLength={150} value={nilai.penjagaNama} onChange={(e) => ubah("penjagaNama", e.target.value)} className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
              </Medan>
              <Medan label="No. Kad Pengenalan">
                <input required inputMode="numeric" autoComplete="off" pattern="[0-9 -]{12,14}" maxLength={14} value={nilai.penjagaKp} onChange={(e) => ubah("penjagaKp", e.target.value)} className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
              </Medan>
              <Medan label="No. telefon">
                <input required inputMode="tel" autoComplete="tel" maxLength={30} value={nilai.telefon} onChange={(e) => ubah("telefon", e.target.value)} className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
              </Medan>
              <Medan label="Alamat" kelas="sm:col-span-2">
                <textarea required autoComplete="street-address" rows={3} maxLength={500} value={nilai.alamat} onChange={(e) => ubah("alamat", e.target.value)} className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
              </Medan>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5">
            <h2 className="text-lg font-bold text-navy-800">Maklumat murid</h2>
            <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
              <Medan label="Nama penuh murid">
                <input required autoComplete="off" maxLength={150} value={nilai.muridNama} onChange={(e) => ubah("muridNama", e.target.value)} className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
              </Medan>
              <Medan label="No. MyKid murid">
                <input required inputMode="numeric" autoComplete="off" pattern="[0-9 -]{12,14}" maxLength={14} value={nilai.muridKp} onChange={(e) => ubah("muridKp", e.target.value)} className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
              </Medan>
              <Medan label="Kelas">
                <div className="mt-1 font-normal"><PilihCari id="gambar-kelas" label="Kelas" sembunyiLabel nilai={nilai.muridKelas} tukar={(v) => ubah("muridKelas", v)} placeholder="Taip kelas, cth: 4 bes" pilihan={kelas.map((k) => ({ nilai: k, label: k }))} /></div>
              </Medan>
            </div>
          </section>

          <fieldset className="min-w-0 border-t border-slate-200 pt-5">
            <legend className="pt-5 text-lg font-bold text-navy-800">Keputusan kebenaran ibu bapa</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={`flex min-h-12 items-center gap-3 rounded-xl border p-3 text-sm font-semibold ${bersetuju === true ? "border-[#18734e] bg-[#edf8f2] text-[#145f42]" : "border-slate-300"}`}>
                <input required type="radio" name="keputusan-gambar-awam" checked={bersetuju === true} onChange={() => setBersetuju(true)} /> Bersetuju
              </label>
              <label className={`flex min-h-12 items-center gap-3 rounded-xl border p-3 text-sm font-semibold ${bersetuju === false ? "border-[#9b2d2d] bg-[#fff1f1] text-[#842525]" : "border-slate-300"}`}>
                <input required type="radio" name="keputusan-gambar-awam" checked={bersetuju === false} onChange={() => setBersetuju(false)} /> Tidak bersetuju
              </label>
            </div>
          </fieldset>

          <Medan label="Catatan (jika perlu)">
            <textarea rows={2} maxLength={300} value={nilai.catatan} onChange={(e) => ubah("catatan", e.target.value)} className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
          </Medan>

          <div>
            <h2 className="text-sm font-semibold text-navy-800">Tandatangan ibu bapa atau penjaga</h2>
            <div className="mt-2"><TandaTangan nilai={tandatangan} tetap={setTandatangan} tempatan /></div>
          </div>
          <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
            <input type="checkbox" required className="mt-1 shrink-0" />
            <span>Saya mengesahkan bahawa saya ialah ibu bapa atau penjaga murid ini dan semua maklumat yang diberikan adalah benar.</span>
          </label>
          <label className="sr-only" aria-hidden="true">Laman web<input ref={perangkapRef} tabIndex={-1} autoComplete="off" /></label>

          {mesej && <p role="status" className={`rounded-xl border p-3 text-sm ${mesej.ok ? "border-[#b9ddca] bg-[#edf8f2] text-[#145f42]" : "border-[#edc2c2] bg-[#fff1f1] text-[#842525]"}`}>{mesej.teks}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void pratonton()} className="min-h-11 rounded-lg border border-navy-700 px-5 py-2.5 text-sm font-semibold text-navy-800">Pratonton borang</button>
            <button type="submit" disabled={sibuk || Boolean(rekodCetak && mesej?.ok)} className="min-h-11 rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{sibuk ? "Menyimpan…" : rekodCetak && mesej?.ok ? "Keputusan telah disimpan" : "Hantar keputusan"}</button>
          </div>
        </fieldset>
      </form>

      {rekodCetak && mesej?.ok && (
        <section className="mt-5 rounded-2xl border border-[#b9ddca] bg-[#edf8f2] p-5">
          <h2 className="font-bold text-[#145f42]">Salinan borang sedia</h2>
          <p className="mt-1 text-sm text-[#145f42]">Tekan butang di bawah untuk pratonton, cetak atau pilih Simpan sebagai PDF.</p>
          <button type="button" onClick={() => mulaCetak("surat-cetak", "Kebenaran Gambar")} className="mt-4 min-h-11 w-full rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white sm:w-auto">Cetak / Simpan PDF</button>
        </section>
      )}
      {rekodCetak && <CetakMedia surat={rekodCetak} data={rekodCetak.data as DataSuratGambar} kepala={kepala} />}
    </>
  );
}
