"use client";

import { PENYAKIT, type AkuanAktiviti, type AktivitiBorang } from "@/data/borang-aktiviti";
import { SEKOLAH } from "@/data/sekolah";
import { aset } from "@/lib/laluan";
import { mulaCetak } from "./cetak-mudah-alih";

type Program = Pick<AktivitiBorang, "nama" | "tarikh" | "masa" | "tempat" | "anjuran">;

function Garis({ label, nilai, lebar = "w-full" }: { label: string; nilai: string; lebar?: string }) {
  return <p className={`flex min-w-0 items-end gap-1 ${lebar}`}><b className="shrink-0">{label}</b><span className="min-w-0 flex-1 border-b border-black px-1 leading-5">{nilai}</span></p>;
}

/** Borang waris dan kesihatan — berdasarkan rujukan sekolah A4 melintang. */
export default function CetakAkuan({ aktiviti: a, data: d }: { aktiviti: Program; data: AkuanAktiviti }) {
  const penyakit = d.penyakit
    .map((p, i) => p.ada ? `${PENYAKIT[i]}${p.catatan ? ` — ${p.catatan}` : ""}` : "")
    .filter(Boolean).join("; ");

  return <>
    <button type="button" onClick={() => mulaCetak("akuan-cetak", "Borang Kebenaran Waris")}
      className="my-4 rounded bg-navy-800 px-4 py-2 text-white print:hidden">
      Cetak / Simpan PDF
    </button>
    <div id="akuan-cetak" className="grid gap-0 bg-white text-[11px] leading-[1.25] text-black lg:grid-cols-2 print:grid-cols-2">
      <style>{`@media print {
        @page { size: A4 landscape; margin: 7mm; }
        body * { visibility: hidden; }
        #akuan-cetak, #akuan-cetak * { visibility: visible; }
        #akuan-cetak { position: absolute; inset: 0; width: 100%; padding: 0; font-size: 8pt; line-height: 1.17; }
        #akuan-cetak section { break-inside: avoid; }
      }`}</style>

      <section className="min-w-0 border-b border-black p-5 lg:border-b-0 lg:border-r print:border-b-0 print:border-r">
        <h1 className="text-center text-sm font-bold uppercase">Surat Akuan Kebenaran Waris Menyertai</h1>
        <p className="mx-auto mt-1 w-3/4 border-b border-black text-center font-semibold">{a.nama}</p>
        <div className="mt-3 space-y-1">
          <Garis label="Saya" nilai={d.penjagaNama} />
          <div className="flex gap-3"><Garis label="No. Kad Pengenalan" nilai={d.penjagaKp} /><Garis label="No. Telefon" nilai={d.telefon} /></div>
          <Garis label="Alamat" nilai={d.alamat} />
        </div>
        <p className="mt-2">adalah waris kepada murid seperti di bawah:</p>
        <div className="mt-1 space-y-1"><Garis label="Nama Murid" nilai={d.muridNama} /><div className="flex gap-3"><Garis label="Kelas" nilai={d.kelas} /><Garis label="No. KP / Surat Beranak" nilai={d.muridKp} /></div></div>
        <p className="mt-2">Saya dengan ini memberi kebenaran bertulis kepada anak / jagaan untuk menyertai:</p>
        <div className="mt-1 grid gap-1 sm:grid-cols-2 print:grid-cols-2"><Garis label="Nama Program" nilai={a.nama} /><Garis label="Tarikh Program" nilai={a.tarikh} /><Garis label="Masa" nilai={a.masa} /><Garis label="Tempat" nilai={a.tempat} /><Garis label="Anjuran" nilai={a.anjuran} lebar="sm:col-span-2 print:col-span-2" /></div>
        <p className="mt-2 text-justify">2. Saya difahamkan bahawa soal keselamatan dan disiplin sentiasa diberi perhatian sewajarnya oleh Guru / Pegawai / Urusetia yang diamanahkan. Sekiranya kesihatan anak / jagaan saya terganggu semasa latihan, perjalanan atau program, saya membenarkan pihak sekolah mendapatkan rawatan perubatan bagi pihak saya.</p>
        <p className="mt-2">3. Murid di atas <b>{penyakit ? "ADA" : "TIDAK ADA"}</b> menghidap penyakit kronik / berjangkit. Nyatakan jika ada: <span className="border-b border-black px-8">{penyakit}</span></p>
        <p className="mt-2">4. Saya mengakui bahawa murid ADA perlindungan insurans Takaful.</p>
        <div className="mt-4 grid grid-cols-2 gap-5"><p>…………………………………<br />Tandatangan Ibu Bapa / Penjaga<br />Tarikh: {a.tarikh}</p><p><b>Pengakuan Saksi</b><br />Tandatangan: ………………………<br />Nama: ………………………<br />No. Kad Pengenalan: ………………………</p></div>
        <p className="mt-3">Disahkan oleh<br />…………………………………<br />Guru Besar<br />{SEKOLAH.namaPenuh}<br />Cop rasmi sekolah</p>
      </section>

      <section className="min-w-0 p-5">
        <header className="flex items-center justify-center gap-2 border-b border-black pb-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aset("/logo-sktd.png")} alt="Lencana sekolah" className="h-9 w-9 object-contain" />
          <div><h2 className="font-bold uppercase">{SEKOLAH.namaPenuh}</h2><p>{SEKOLAH.hubungi.alamat.replace("\n", ", ")}</p><p>Tel: {SEKOLAH.hubungi.telefon} · Kod: {SEKOLAH.kod}</p></div>
        </header>
        <h2 className="mt-2 text-center text-sm font-bold uppercase">Borang Perakuan Kesihatan<br />Untuk Menyertai Sukan dan Aktiviti Kecergasan</h2>
        <div className="mt-2 space-y-1"><Garis label="A. Nama Sekolah" nilai={SEKOLAH.namaPenuh} /><p className="font-bold">B. Maklumat Program</p><Garis label="1. Nama Program" nilai={a.nama} /><div className="flex gap-3"><Garis label="2. Tarikh" nilai={a.tarikh} /><Garis label="3. Tempat" nilai={a.tempat} /></div><p className="font-bold">C. Maklumat Murid</p><Garis label="1. Nama Penuh Murid" nilai={d.muridNama} /><div className="flex gap-3"><Garis label="2. Tahun / Kelas" nilai={d.kelas} /><Garis label="3. No. KP" nilai={d.muridKp} /></div></div>
        <p className="mt-2 font-bold">D. Pengakuan Kesihatan Murid</p><p>Adakah anak anda sekarang ini menghidap masalah berikut?</p>
        <table className="mt-1 w-full border-collapse text-left text-[9px]"><thead><tr>{["Jenis penyakit", "Ya", "Tidak", "Catatan"].map((x) => <th key={x} className="border border-black p-1">{x}</th>)}</tr></thead><tbody>{PENYAKIT.map((x, i) => <tr key={x}><td className="border border-black p-1">{String.fromCharCode(65 + i)}. {x}</td><td className="border border-black p-1 text-center">{d.penyakit[i]?.ada ? "/" : ""}</td><td className="border border-black p-1 text-center">{!d.penyakit[i]?.ada ? "/" : ""}</td><td className="max-w-24 break-words border border-black p-1">{d.penyakit[i]?.catatan}</td></tr>)}</tbody></table>
        <p className="mt-2 text-justify">Saya mengaku bahawa semua maklumat di atas adalah benar mengikut pengetahuan saya. Dengan ini saya <b>{d.bersetuju ? "MEMBENARKAN" : "TIDAK MEMBENARKAN"}</b> anak / jagaan saya menyertai program di atas.</p>
        <p className="mt-4">Tandatangan: …………………………………<br />Nama Penjaga: {d.penjagaNama}<br />Tarikh: {a.tarikh}</p>
      </section>
    </div>
  </>;
}
