"use client";

import { PENYAKIT, type AkuanAktiviti, type AktivitiBorang } from "@/data/borang-aktiviti";
import { SEKOLAH } from "@/data/sekolah";
import { aset } from "@/lib/laluan";
import { mulaCetak } from "./cetak-mudah-alih";

type Program = Pick<AktivitiBorang, "nama" | "tarikh" | "masa" | "tempat" | "anjuran">;

function Garis({ label, nilai, kelas = "" }: { label: string; nilai?: string; kelas?: string }) {
  return <div className={`akuan-garis ${kelas}`}><b>{label}</b><span>{nilai || " "}</span></div>;
}

/** Dua borang satu halaman — disusun semula daripada Surat Kebenaran Waris kosong. */
export default function CetakAkuan({ aktiviti: a, data: d }: { aktiviti: Program; data: AkuanAktiviti }) {
  const penyakit = d.penyakit
    .map((p, i) => p.ada ? `${PENYAKIT[i]}${p.catatan ? ` — ${p.catatan}` : ""}` : "")
    .filter(Boolean)
    .join("; ");

  return <>
    <button type="button" onClick={() => mulaCetak("akuan-cetak", "Borang Kebenaran Waris")}
      className="my-4 rounded bg-navy-800 px-4 py-2 text-white print:hidden">
      Cetak / Simpan PDF
    </button>

    <div id="akuan-cetak" data-cetak-kertas="landscape" className="bg-white text-black">
      <style>{`
        #akuan-cetak { color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.25; }
        #akuan-cetak .akuan-panel { min-width: 0; padding: 5mm; }
        #akuan-cetak .akuan-waris { border-bottom: 1px solid #000; }
        #akuan-cetak .akuan-kepala-waris { display: grid; grid-template-columns: 24mm minmax(0, 1fr) 20mm; gap: 3mm; align-items: center; min-height: 22mm; }
        #akuan-cetak .akuan-kepala-kesihatan { display: flex; min-height: 22mm; align-items: center; justify-content: center; border-bottom: 1px solid #000; padding-bottom: 2mm; }
        #akuan-cetak .akuan-logo-kpm { width: 22mm; height: 21mm; object-fit: contain; }
        #akuan-cetak .akuan-logo-sktd { width: 18mm; height: 21mm; object-fit: contain; }
        #akuan-cetak .akuan-sekolah { font-size: 8.5px; line-height: 1.24; }
        #akuan-cetak .akuan-sekolah b { font-size: 9.5px; }
        #akuan-cetak .akuan-tajuk { margin: 3mm 0 1.5mm; border-bottom: 1px solid #000; padding-bottom: 1.5mm; text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        #akuan-cetak .akuan-program-tajuk { margin: 0 auto; width: 72%; border-bottom: 1px solid #000; padding: 0 1mm 1mm; text-align: center; font-weight: 700; }
        #akuan-cetak .akuan-garis { display: flex; min-width: 0; align-items: end; gap: 1.5mm; }
        #akuan-cetak .akuan-garis b { flex: 0 0 auto; }
        #akuan-cetak .akuan-garis span { min-width: 0; flex: 1; border-bottom: 1px solid #000; padding: 0 1mm 1px; overflow-wrap: anywhere; }
        #akuan-cetak .akuan-dua { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 3mm; }
        #akuan-cetak .akuan-perenggan { margin: 2.3mm 0 0; text-align: justify; }
        #akuan-cetak .akuan-senarai-program { display: grid; grid-template-columns: 26mm minmax(0, 1fr); gap: 1mm 2mm; margin: 2mm 9mm 0; }
        #akuan-cetak .akuan-senarai-program > b { font-weight: 400; }
        #akuan-cetak .akuan-senarai-program > span { border-bottom: 1px solid #000; padding-left: 1mm; }
        #akuan-cetak .akuan-tandatangan { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 6mm; margin-top: 5mm; }
        #akuan-cetak .akuan-tandatangan p { margin: 0; }
        #akuan-cetak .akuan-tandatangan .ruang { display: block; height: 9mm; border-bottom: 1px dotted #000; }
        #akuan-cetak .akuan-pengesahan { margin: 4mm 0 0; }
        #akuan-cetak .akuan-pengesahan .ruang { display: block; width: 34mm; height: 8mm; border-bottom: 1px dotted #000; }
        #akuan-cetak .akuan-kanan-tajuk { margin: 2.5mm 0; text-align: center; font-size: 12px; font-weight: 700; line-height: 1.25; text-transform: uppercase; }
        #akuan-cetak .akuan-bahagian { margin: 2mm 0 0; font-weight: 700; }
        #akuan-cetak .akuan-butiran { display: grid; grid-template-columns: 4mm minmax(0, 1fr); gap: 1mm 2mm; margin: 1.5mm 0 0 9mm; }
        #akuan-cetak .akuan-butiran span:nth-child(even) { border-bottom: 1px solid #000; padding-left: 1mm; }
        #akuan-cetak .akuan-jadual { width: 100%; margin-top: 2mm; border-collapse: collapse; font-size: 9px; }
        #akuan-cetak .akuan-jadual th, #akuan-cetak .akuan-jadual td { border: 1px solid #000; padding: 1.1mm; vertical-align: middle; }
        #akuan-cetak .akuan-jadual th { text-align: center; font-weight: 700; }
        #akuan-cetak .akuan-jadual .kod { width: 6mm; text-align: center; }
        #akuan-cetak .akuan-jadual .ya-tidak { width: 10mm; text-align: center; }
        #akuan-cetak .akuan-jadual .catatan { width: 29mm; overflow-wrap: anywhere; }
        #akuan-cetak .akuan-perakuan { margin: 2mm 0 0; text-align: justify; }
        #akuan-cetak .akuan-tandatangan-kanan { margin-top: 4mm; }
        #akuan-cetak .akuan-tandatangan-kanan p { margin: 1.7mm 0 0; }
        #akuan-cetak .akuan-garis-pendek { display: inline-block; min-width: 42mm; border-bottom: 1px dotted #000; }
        @media (min-width: 960px) { #akuan-cetak { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); } #akuan-cetak .akuan-waris { border-bottom: 0; border-right: 1px solid #000; } }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden; }
          #akuan-cetak, #akuan-cetak * { visibility: visible; }
          #akuan-cetak { position: absolute; inset: 0; display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; font-size: 8.1pt; line-height: 1.17; }
          #akuan-cetak .akuan-panel { padding: 3.4mm; }
          #akuan-cetak .akuan-waris { border-bottom: 0; border-right: 1px solid #000; }
          #akuan-cetak .akuan-tajuk, #akuan-cetak .akuan-kanan-tajuk { font-size: 9pt; }
          #akuan-cetak .akuan-sekolah { font-size: 6.7pt; }
          #akuan-cetak .akuan-sekolah b { font-size: 7.4pt; }
          #akuan-cetak .akuan-jadual { font-size: 7.3pt; }
          #akuan-cetak .akuan-jadual th, #akuan-cetak .akuan-jadual td { padding: .75mm; }
          #akuan-cetak .akuan-perenggan { margin-top: 1.7mm; }
          #akuan-cetak .akuan-tandatangan { margin-top: 3mm; }
          #akuan-cetak .akuan-pengesahan { margin-top: 2mm; }
          @page { size: A4 landscape; margin: 9mm 10mm; }
        }
      `}</style>

      <section className="akuan-panel akuan-waris">
        <header className="akuan-kepala-waris">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aset("/logo-kpm.png")} alt="Kementerian Pendidikan Malaysia" className="akuan-logo-kpm" />
          <div className="akuan-sekolah"><b>{SEKOLAH.namaPenuh.toUpperCase()}</b><br />{SEKOLAH.hubungi.alamat.replace("\n", ", ")}<br />Tel : {SEKOLAH.hubungi.telefon}<br />Kod Sekolah : {SEKOLAH.kod}<br />E-mel: {SEKOLAH.hubungi.emel}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aset("/logo-sktd.png")} alt="Lencana SK Taman Desaminium" className="akuan-logo-sktd" />
        </header>
        <h1 className="akuan-tajuk">Surat Akuan Kebenaran Waris Menyertai</h1>
        <p className="akuan-program-tajuk">{a.nama}</p>

        <div className="mt-3 space-y-1">
          <Garis label="Saya" nilai={d.penjagaNama} />
          <div className="akuan-dua"><Garis label="No. Kad Pengenalan" nilai={d.penjagaKp} /><Garis label="No. Telefon" nilai={d.telefon} /></div>
          <Garis label="Alamat" nilai={d.alamat} />
        </div>
        <p className="akuan-perenggan">adalah waris kepada murid seperti di bawah:-</p>
        <div className="mt-1.5 space-y-1"><Garis label="Nama Murid :" nilai={d.muridNama} /><div className="akuan-dua"><Garis label="Kelas :" nilai={d.kelas} /><Garis label="No. Kad Pengenalan / Surat Beranak :" nilai={d.muridKp} /></div></div>
        <p className="akuan-perenggan">Saya dengan ini memberi kebenaran bertulis kepada anak / jagaan untuk menyertai :-</p>
        <div className="akuan-senarai-program"><b>Nama Program</b><span>{a.nama}</span><b>Tarikh Program</b><span>{a.tarikh}</span><b>Masa</b><span>{a.masa}</span><b>Tempat</b><span>{a.tempat}</span><b>Anjuran</b><span>{a.anjuran}</span></div>
        <p className="akuan-perenggan">2. Saya difahamkan bahawa soal keselamatan dan disiplin sentiasa diberi perhatian sewajarnya oleh Guru / Pegawai / Urusetia yang telah diamanahkan. Sekiranya kesihatan anak / jagaan saya terganggu dalam masa latihan, perjalanan atau semasa program, saya membenarkan Guru / Pegawai / Urusetia mendapatkan rawatan perubatan bagi pihak saya.</p>
        <p className="akuan-perenggan">3. Saya dengan ini mengaku bahawa murid di atas <b>{penyakit ? "ADA" : "TIDAK ADA"}</b> menghidap penyakit kronik / berjangkit. Nyatakan jika ada: <span className="border-b border-black px-10">{penyakit || " "}</span></p>
        <p className="akuan-perenggan">4. Saya dengan ini mengakui bahawa murid ADA perlindungan Insurans Takaful.</p>
        <div className="akuan-tandatangan"><p><span className="ruang" />Tandatangan Ibu Bapa / Penjaga<br />Tarikh : {a.tarikh}</p><p><b>PENGAKUAN SAKSI</b><br />Saya memperakukan bahawa segala keterangan di atas adalah benar.<br />Tandatangan Saksi : <span className="akuan-garis-pendek" /><br />Nama : <span className="akuan-garis-pendek" /><br />No. Kad Pengenalan : <span className="akuan-garis-pendek" /></p></div>
        <div className="akuan-pengesahan">Disahkan oleh<span className="ruang" />Guru Besar<br />{SEKOLAH.namaPenuh}<span className="float-right">cop rasmi sekolah</span></div>
      </section>

      <section className="akuan-panel">
        <header className="akuan-kepala-kesihatan">
          {/* Logo MSSS dalam contoh asal memang dikeluarkan — hanya KPM. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aset("/logo-kpm.png")} alt="Kementerian Pendidikan Malaysia" className="akuan-logo-kpm" />
        </header>
        <h2 className="akuan-kanan-tajuk">Borang Perakuan Kesihatan<br />Untuk Menyertai Sukan dan Aktiviti Kecergasan</h2>
        <p className="akuan-bahagian">A. &nbsp;&nbsp; NAMA SEKOLAH <span className="ml-8 font-normal">: {SEKOLAH.namaPenuh.toUpperCase()}</span></p>
        <p className="akuan-bahagian">B. &nbsp;&nbsp; MAKLUMAT PROGRAM :</p>
        <div className="akuan-butiran"><span>1.</span><span>NAMA PROGRAM : {a.nama}</span><span>2.</span><span>TARIKH : {a.tarikh}</span><span>3.</span><span>TEMPAT : {a.tempat}</span></div>
        <p className="akuan-bahagian">C. MAKLUMAT MURID :</p>
        <div className="akuan-butiran"><span>1.</span><span>NAMA PENUH MURID : {d.muridNama}</span><span>2.</span><span>TAHUN / TINGKATAN : {d.kelas}</span><span>3.</span><span>NO. S. BERANAK / NO. KP : {d.muridKp}</span></div>
        <p className="akuan-bahagian">D. PENGAKUAN KESIHATAN MURID</p>
        <p className="mt-1">Adakah anak anda sekarang ini menghidap masalah berikut?</p>
        <table className="akuan-jadual"><thead><tr><th className="kod" /><th>JENIS PENYAKIT</th><th className="ya-tidak">YA</th><th className="ya-tidak">TIDAK</th><th className="catatan">CATATAN</th></tr></thead><tbody>{PENYAKIT.map((x, i) => <tr key={x}><td className="kod">{String.fromCharCode(65 + i)}</td><td>{x}</td><td className="ya-tidak">{d.penyakit[i]?.ada ? "/" : ""}</td><td className="ya-tidak">{!d.penyakit[i]?.ada ? "/" : ""}</td><td className="catatan">{d.penyakit[i]?.catatan || ""}</td></tr>)}</tbody></table>
        <p className="akuan-perakuan"><b>Saya mengaku bahawa semua maklumat di atas adalah benar mengikut pengetahuan saya.</b></p>
        <p className="akuan-perakuan">Dengan ini, saya <b>{d.bersetuju ? "MEMBENARKAN" : "TIDAK MEMBENARKAN"}</b> anak jagaan saya menyertai program di atas.</p>
        <div className="akuan-tandatangan-kanan"><p>Tandatangan &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span className="akuan-garis-pendek" /></p><p>Nama Penjaga &nbsp;: <span className="akuan-garis-pendek">{d.penjagaNama}</span><span className="ml-8">Tarikh : {a.tarikh}</span></p><p className="font-bold">*Potong yang mana tidak berkenaan</p></div>
      </section>
    </div>
  </>;
}
