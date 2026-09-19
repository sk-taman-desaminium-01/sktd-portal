"use client";
import { useState } from "react";
import Link from "next/link";
import { PENYAKIT, type AkuanAktiviti } from "@/data/borang-aktiviti";
import { hantarAkuan } from "@/lib/borang-aktiviti";
export default function Borang({aktivitiId}:{aktivitiId:string}){
 const [nota,setNota]=useState("");const [sibuk,setSibuk]=useState(false);const [resit,setResit]=useState<string>();
 async function hantar(fd:FormData){setSibuk(true);setNota("");try{
 const teks=(k:string)=>String(fd.get(k)??"").trim();
 const data:AkuanAktiviti={muridNama:teks("muridNama"),muridKp:teks("muridKp").replace(/[- ]/g,""),kelas:teks("kelas"),penjagaNama:teks("penjagaNama"),penjagaKp:teks("penjagaKp").replace(/[- ]/g,""),alamat:teks("alamat"),telefon:teks("telefon"),bersetuju:teks("izin")==="ya",penyakit:PENYAKIT.map((_,i)=>({ada:teks(`ada-${i}`)==="ya",catatan:teks(`catatan-${i}`)}))};
 const r=await hantarAkuan(aktivitiId,data,teks("laman"));setNota(r.mesej);if(r.ok)setResit(r.resit);
 }catch{setNota("Sambungan terputus. Hubungi pengurus jika penghantaran sudah diterima.");}finally{setSibuk(false)}}
 if(resit)return <div className="mt-5 rounded-xl border bg-white p-5"><p>{nota}</p><Link className="mt-4 block font-bold underline" href={`/kebenaran/resit/${resit}`}>Buka resit dan cetak dua borang</Link><p className="mt-2 text-sm">Simpan pautan ini secara peribadi. Pautan sah selama 90 hari.</p></div>;
 return <form action={hantar} className="mt-5 space-y-4 rounded-xl border bg-white p-5"><fieldset disabled={sibuk} className="space-y-4">
 {([['muridNama','Nama penuh murid'],['muridKp','No. MyKid/KP murid'],['kelas','Kelas (contoh: 4 BESTARI)'],['penjagaNama','Nama ibu bapa/penjaga'],['penjagaKp','No. KP penjaga'],['alamat','Alamat penjaga'],['telefon','No. telefon']] as const).map(([k,label])=><label className="block text-sm" key={k}>{label}<input name={k} required maxLength={k==='alamat'?500:150} autoComplete="off" className="mt-1 block w-full rounded border p-2"/></label>)}
 <label className="hidden" aria-hidden="true">Laman web<input name="laman" tabIndex={-1} autoComplete="off"/></label>
 <h2 className="font-bold">Maklumat kesihatan</h2><p className="text-sm">Jawab semua soalan. Isi catatan jika ada penyakit atau alahan.</p>
 {PENYAKIT.map((x,i)=><fieldset key={x} className="rounded border p-3"><legend className="px-1 text-sm font-semibold">{x}</legend><div className="flex gap-5">{['ya','tidak'].map(v=><label key={v}><input type="radio" name={`ada-${i}`} value={v} required/> {v==='ya'?'Ya':'Tidak'}</label>)}</div><input name={`catatan-${i}`} maxLength={100} aria-label={`Catatan ${x}`} placeholder="Catatan" className="mt-2 w-full rounded border p-2 text-sm"/></fieldset>)}
 <fieldset><legend className="font-bold">Kebenaran penyertaan</legend>{['ya','tidak'].map(v=><label key={v} className="mr-5 inline-flex gap-2"><input required type="radio" name="izin" value={v}/><b>{v==='ya'?'Membenarkan':'Tidak membenarkan'}</b></label>)}</fieldset>
 <label className="flex gap-2 text-sm"><input type="checkbox" required/>Saya ibu bapa/penjaga murid ini dan mengesahkan semua maklumat adalah benar. Saya memahami perakuan rawatan perubatan dan perlindungan Takaful dalam borang cetakan.</label>
 <p className="text-xs">Maklumat digunakan sekolah untuk pengurusan penyertaan dan keselamatan murid. Tandatangan, saksi dan cop dilengkapkan pada cetakan.</p>
 <button className="rounded bg-navy-800 px-5 py-2 text-white disabled:opacity-50" disabled={sibuk}>{sibuk?'Menghantar…':'Hantar akuan'}</button>
 </fieldset>{nota&&<p role="status" className="text-sm">{nota}</p>}</form>
}
