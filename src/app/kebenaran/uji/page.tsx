import { notFound } from "next/navigation";
import CetakAkuan from "@/components/CetakAkuan";
import CetakMedia from "@/components/CetakMedia";
import Borang from "../[id]/Borang";
import { PENYAKIT } from "@/data/borang-aktiviti";
export default async function Page({searchParams}:{searchParams:Promise<{jenis?:string}>}){
 if(process.env.NODE_ENV!=="development")notFound();
 const {jenis}=await searchParams;
 const a={nama:"AKTIVITI UJIAN PAPARAN",tarikh:"2026-10-01",masa:"8.00 pagi – 12.00 tengah hari",tempat:"PADANG SEKOLAH",anjuran:"SK TAMAN DESAMINIUM"};
 const d={muridNama:"MURID CONTOH",muridKp:"000000000000",kelas:"4 BESTARI",penjagaNama:"PENJAGA CONTOH",penjagaKp:"000000000000",alamat:"ALAMAT CONTOH UNTUK UJIAN PAPARAN",telefon:"0000000000",bersetuju:true,penyakit:PENYAKIT.map(()=>({ada:false,catatan:""}))};
 return <main className="mx-auto max-w-6xl p-6"><h1 className="text-xl font-bold print:hidden">Data rekaan untuk ujian paparan sahaja</h1>{jenis==="isi"?<Borang aktivitiId="00000000-0000-0000-0000-000000000000"/>:jenis==="media"?<><style>{`#surat-cetak {display:block}`}</style><CetakMedia surat={{id:"uji",jenis:"gambar",status:"selesai",tajuk:"Ujian",rujukan_kami:null,pemohon_nama:"Ujian",pemohon_emel:"uji@example.invalid",tandatangan_url:null,data:d,dicipta:"2026-09-19"}} data={d} kepala={{nama:a.anjuran,kod:"BBA8284",alamat:"ALAMAT SEKOLAH",telefon:"",faks:"",emel:""}}/></>:<CetakAkuan aktiviti={a} data={d}/>}</main>
}
