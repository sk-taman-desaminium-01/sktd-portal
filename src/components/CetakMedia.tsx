import type { BarisSurat, DataSuratGambar } from "@/lib/surat";
import type { KepalaSurat } from "./CetakSurat";
import { aset } from "@/lib/laluan";
export default function CetakMedia({ surat, data: d, kepala }: { surat: BarisSurat; data: DataSuratGambar; kepala: KepalaSurat }) {
  const baris = (label: string, nilai?: string) => <p className="mt-5 flex gap-4"><span className="w-48 shrink-0">{label}</span><span className="flex-1 whitespace-pre-line border-b border-black">{nilai || " "}</span></p>;
  return <div id="surat-cetak" className="hidden text-[11pt] leading-relaxed text-black print:block">
    <style>{`@media print { body * {visibility:hidden} #surat-cetak,#surat-cetak * {visibility:visible} #surat-cetak {position:absolute;inset:0;width:100%} @page {size:A4 portrait;margin:22mm} .media-muka {break-after:page;min-height:240mm} .media-muka:last-child {break-after:auto} }`}</style>
    <section className="media-muka">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={aset("/logo-kpm.png")} alt="Kementerian Pendidikan" className="mx-auto mb-8 h-24 object-contain" />
      <h1 className="border-b-2 border-black pb-5 text-center font-bold uppercase leading-tight">Surat Akuan Ibu Bapa/Penjaga<br/>untuk kebenaran rakaman gambar/video/audio murid serta<br/>memuat naik ke laman media sosial bagi program anjuran<br/>institusi pendidikan bawah Kementerian Pendidikan Malaysia<br/>bagi tahun: {surat.dicipta.slice(0,4)}</h1>
      {baris("Saya (Nama):", d.penjagaNama)}{baris("No. Kad Pengenalan:", d.penjagaKp)}{baris("Beralamat:", d.alamat)}{baris("No. telefon:", d.telefon)}
      <p className="mt-10">mengaku ialah ibu/bapa/penjaga kepada murid bernama seperti di bawah:<br/>(sila pilih mana yang berkenaan)</p>
      {baris("Nama murid:", d.muridNama)}{baris("Tingkatan/Darjah/Lain-lain (sila nyatakan):", d.muridKelas)}{baris("No. Kad Pengenalan/MyKid:", d.muridKp)}{baris("Alamat Institusi Pendidikan:", `${kepala.nama}\n${kepala.alamat}`)}
    </section>
    <section className="media-muka">
      <p>Saya dengan ini;</p>
      <p className="mt-5">(a) <b>{d.bersetuju ? "Bersetuju" : "Tidak bersetuju"}</b> membenarkan pihak institusi pendidikan bawah KPM untuk mengambil rakaman gambar/video/audio anak/kanak-kanak jagaan saya bagi setiap program/majlis/aktiviti yang dilaksanakan sepanjang tahun ini; dan</p>
      <p className="mt-5">(b) <b>{d.bersetuju ? "Bersetuju" : "Tidak bersetuju"}</b> membenarkan institusi pendidikan bawah KPM memuat naik rakaman gambar/video/audio anak/kanak-kanak jagaan saya di mana-mana platform seliaan institusi pendidikan bawah KPM.</p>
      <p className="mt-5">(c) Mengesahkan butiran yang diberikan adalah BENAR dan FAHAM dengan perkara yang dinyatakan pada bahagian (a) dan (b).</p>
      <p className="mt-6 text-[9pt]">Nota:<br/>1. KPM – Kementerian Pendidikan Malaysia<br/>2. Institusi pendidikan bawah KPM termasuk bahagian KPM, jabatan pendidikan negeri dan pejabat pendidikan daerah.</p>
      <div className="mt-8 h-16">{surat.tandatangan_url &&
        // eslint-disable-next-line @next/next/no-img-element
        <img src={surat.tandatangan_url} alt="Tandatangan penjaga" className="h-16 max-w-48 object-contain" />}</div>
      <p>........................................................<br/>Tandatangan ibu bapa/penjaga</p>
      <p>Nama: {d.penjagaNama?.toUpperCase()}<br/>Tarikh: {surat.dicipta.slice(0,10)}</p>
      <h2 className="mt-8 font-bold">DISAHKAN OLEH GURU KELAS</h2>
      <p className="mt-3">Saya dengan ini memperakui bahawa ibu bapa/penjaga murid seperti yang dinyatakan telah menandatangani borang ini bagi tujuan di atas.</p>
      <p className="mt-12">........................................................<br/>Tandatangan Guru Kelas<br/>Nama (HURUF BESAR):<br/>Tarikh:<br/>Cop Institusi Pendidikan:</p>
    </section>
  </div>;
}
