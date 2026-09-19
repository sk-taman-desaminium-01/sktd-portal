"use client";
import { PENYAKIT, type AkuanAktiviti, type AktivitiBorang } from "@/data/borang-aktiviti";
import { SEKOLAH } from "@/data/sekolah";
import { aset } from "@/lib/laluan";
type Program = Pick<AktivitiBorang,"nama"|"tarikh"|"masa"|"tempat"|"anjuran">;
export default function CetakAkuan({ aktiviti:a, data:d }: { aktiviti:Program; data:AkuanAktiviti }) {
 const butiran=(label:string,v:string)=><p className="mt-1"><b>{label}:</b> {v}</p>;
 return <><button type="button" onClick={()=>window.print()} className="my-4 rounded bg-navy-800 px-4 py-2 text-white print:hidden">Cetak / Simpan PDF</button>
 <div id="akuan-cetak" className="grid gap-6 bg-white p-5 text-[10px] leading-snug text-black lg:grid-cols-2 print:grid-cols-2">
 <style>{`@media print { @page {size:A4 landscape;margin:8mm} body * {visibility:hidden} #akuan-cetak,#akuan-cetak * {visibility:visible} #akuan-cetak {position:absolute;inset:0;width:100%;padding:0;gap:10mm;font-size:8.5pt;line-height:1.22} #akuan-cetak section {break-inside:avoid} }`}</style>
 <section>
 <header className="flex items-center justify-center gap-2 border-b border-black pb-2 text-center"><img src={aset("/logo-sktd.png")} alt="Lencana sekolah" className="h-10 w-10 object-contain"/><div><h1 className="font-bold">{SEKOLAH.namaPenuh.toUpperCase()}</h1><p>{SEKOLAH.hubungi.alamat}</p><p>Tel: {SEKOLAH.hubungi.telefon} · {SEKOLAH.hubungi.emel}</p></div></header>
 <h2 className="my-3 text-center font-bold uppercase">SURAT AKUAN KEBENARAN WARIS MENYERTAI<br/>{a.nama}</h2>
 <p>Saya <b>{d.penjagaNama}</b>, No. KP <b>{d.penjagaKp}</b>, beralamat <b>{d.alamat}</b>, No. telefon <b>{d.telefon}</b>, waris kepada:</p>
 {butiran("Nama Murid",d.muridNama)}{butiran("Kelas",d.kelas)}{butiran("No. KP / Surat Beranak",d.muridKp)}
 <p className="mt-2">Dengan ini <b>{d.bersetuju?"MEMBENARKAN":"TIDAK MEMBENARKAN"}</b> anak/jagaan saya menyertai:</p>
 {butiran("Nama Program",a.nama)}{butiran("Tarikh Program",a.tarikh)}{butiran("Masa",a.masa)}{butiran("Tempat",a.tempat)}{butiran("Anjuran",a.anjuran)}
 <p className="mt-3 text-justify">2. Saya difahamkan bahawa soal keselamatan dan disiplin sentiasa diberi perhatian sewajarnya oleh Guru / Pegawai / Urusetia yang telah diamanahkan. Sekiranya kesihatan anak / jagaan saya terganggu dalam masa latihan / perkhemahan atau perjalanan / semasa program, maka saya dengan sepenuh hati membenarkan Guru / Pegawai / Urusetia menguruskan bagi pihak saya untuk mendapatkan rawatan perubatan.</p>
 <p className="mt-2">3. Anak/jagaan saya <b>{d.penyakit.some(p=>p.ada)?"ADA":"TIDAK ADA"}</b> penyakit seperti dinyatakan dalam perakuan kesihatan di sebelah.</p>
 <p className="mt-2">4. Anak/jagaan saya ADA perlindungan insuran Takaful.</p>
 <div className="mt-8 grid grid-cols-2 gap-5"><p>.........................................<br/>Tandatangan Ibu Bapa/Penjaga<br/>Nama: {d.penjagaNama}<br/>Tarikh: ........................</p><p>.........................................<br/>Tandatangan Saksi<br/>Nama: ........................<br/>No. KP: ........................</p></div>
 <p className="mt-8">Disahkan oleh: .........................................<br/>Guru Besar {SEKOLAH.namaPenuh}<br/>Cop Sekolah:</p>
 </section>
 <section>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={aset("/logo-kpm.png")} alt="Kementerian Pendidikan" className="mx-auto h-14 object-contain" />
 <h2 className="my-2 text-center font-bold">BORANG PERAKUAN KESIHATAN UNTUK MENYERTAI<br/>SUKAN DAN AKTIVITI KECERGASAN</h2>
 {butiran("A. NAMA SEKOLAH",SEKOLAH.namaPenuh)}
 <h3 className="mt-2 font-bold">B. MAKLUMAT PROGRAM</h3>{butiran("Nama Program",a.nama)}{butiran("Tarikh",a.tarikh)}{butiran("Tempat",a.tempat)}
 <h3 className="mt-2 font-bold">C. MAKLUMAT MURID</h3>{butiran("Nama Penuh",d.muridNama)}{butiran("Tahun/Kelas",d.kelas)}{butiran("No. Kad Pengenalan",d.muridKp)}
 <h3 className="my-2 font-bold">D. MAKLUMAT KESIHATAN</h3>
 <table className="w-full border-collapse text-left"><thead><tr>{["Penyakit","Ya","Tidak","Catatan"].map(x=><th key={x} className="border border-black p-1">{x}</th>)}</tr></thead>
 <tbody>{PENYAKIT.map((x,i)=><tr key={x}><td className="border border-black p-1">{x}</td><td className="border border-black p-1 text-center">{d.penyakit[i]?.ada?"/":""}</td><td className="border border-black p-1 text-center">{!d.penyakit[i]?.ada?"/":""}</td><td className="max-w-28 break-words border border-black p-1">{d.penyakit[i]?.catatan}</td></tr>)}</tbody></table>
 <p className="mt-3 text-justify">Saya mengaku bahawa maklumat yang diberikan adalah benar. Saya <b>{d.bersetuju?"MEMBENARKAN":"TIDAK MEMBENARKAN"}</b> anak/jagaan saya menyertai program di atas.</p>
 <p className="mt-8">.........................................<br/>Tandatangan Ibu Bapa/Penjaga<br/>Nama: {d.penjagaNama}<br/>Tarikh: ........................</p>
 </section></div></>;
}
