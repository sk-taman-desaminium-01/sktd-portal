"use server";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { pengguna } from "./akses";
import { boleh } from "./peranan";
import { klienTulis } from "./supabase-pelayan";
import { tahunSesiAktif } from "./sesi-aktif";
import { bacaSemua } from "./baca-semua";
import { bacaSenaraiMurid } from "./kenal-murid";
import { hariIniMY } from "./bilik";
import { semakAkuan, type AktivitiBorang, type AkuanAktiviti, type JawapanAktiviti } from "@/data/borang-aktiviti";
const uuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s);
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
async function akses() {
 const saya = await pengguna(); if (!saya?.peranan) throw new Error("Tiada kebenaran.");
 return { saya, admin: boleh(saya.peranan,"urus_guru_kelas") };
}
async function urus(id: string) {
 if (!uuid(id)) throw new Error("Aktiviti tidak sah.");
 const { saya, admin } = await akses();
 const rows = await klienTulis().minta(`borang_aktiviti?select=*&id=eq.${id}&limit=1`) as AktivitiBorang[];
 const a = rows[0]; if (!a || (!admin && a.pengurus_emel !== saya.emel)) throw new Error("Tiada kebenaran aktiviti.");
 if (!admin) {
   const skop = await skopAktivitiSaya();
   if (!skop.includes(a.skop)) throw new Error("Tugasan pengurus tidak lagi aktif.");
 }
 return a;
}
export async function skopAktivitiSaya(): Promise<string[]> {
 const { saya, admin } = await akses(); if (admin) return ["SEKOLAH"];
 const sesi = await tahunSesiAktif();
 const rows = await klienTulis().minta(`pbd_guru_kelas?select=kelas&guru_id=eq.${saya.id}&tahun_sesi=eq.${sesi}&peranan=eq.pengurus_pasukan`) as {kelas:string}[];
 return [...new Set(rows.map((r) => r.kelas))];
}
export async function senaraiAktivitiSaya(): Promise<AktivitiBorang[]> {
 const { saya, admin } = await akses();
 return bacaSemua<AktivitiBorang>(`borang_aktiviti?select=*&order=dicipta.desc,id.asc${admin ? "" : `&pengurus_emel=eq.${encodeURIComponent(saya.emel)}`}`);
}
export async function ciptaAktiviti(input: Omit<AktivitiBorang,"id"|"pengurus_emel"|"aktif">) {
 try {
  const { saya, admin } = await akses();
  for (const k of ["nama","masa","tempat","anjuran","skop"] as const) if (!input[k]?.trim() || input[k].length>500) throw new Error("Lengkapkan butiran aktiviti.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarikh) || !/^\d{4}-\d{2}-\d{2}$/.test(input.tutup) || input.tutup<hariIniMY() || input.tutup>input.tarikh) throw new Error("Tarikh tutup mesti hari ini atau kemudian dan tidak melebihi tarikh aktiviti.");
  if (!admin && !(await skopAktivitiSaya()).includes(input.skop)) throw new Error("Skop bukan tugasan anda.");
  const rows = await klienTulis().minta("borang_aktiviti", {method:"POST",body:JSON.stringify({nama:input.nama.trim(),tarikh:input.tarikh,masa:input.masa.trim(),tempat:input.tempat.trim(),anjuran:input.anjuran.trim(),skop:input.skop,pengurus_emel:saya.emel,tutup:input.tutup})}) as AktivitiBorang[];
  revalidatePath("/borang/aktiviti"); return {ok:true,mesej:"Aktiviti dicipta. Tambah peserta sebelum berkongsi pautan.",rekod:rows[0]};
 } catch(e) {return {ok:false,mesej:e instanceof Error?e.message:"Gagal menyimpan."};}
}
export async function pesertaAktiviti(id: string) {
 await urus(id);
 return bacaSemua<{murid_id:string;nama:string;no_kp:string;kelas:string}>(`borang_peserta?select=murid_id,nama,no_kp,kelas&aktiviti_id=eq.${id}&order=nama.asc,murid_id.asc`);
}
export async function tambahPesertaAktiviti(id: string, teks: string, simpan=false) {
 try {
  await urus(id); const {murid,berulang} = bacaSenaraiMurid(teks);
  if (!murid.length || murid.length>200 || berulang.length || murid.some((m)=>!m.no_kp)) throw new Error("Senarai mesti 1–200 murid dengan No. KP unik.");
  const db=klienTulis(); const sesi=await tahunSesiAktif();
  const rows=await db.minta(`pbd_pendaftaran?select=murid_id,tahun,kelas,pbd_murid!inner(nama,no_kp)&tahun_sesi=eq.${sesi}&status=in.(aktif,pindah_masuk,ulang)&pbd_murid.no_kp=in.(${murid.map((m)=>m.no_kp).join(",")})`) as {murid_id:string;tahun:number;kelas:string;pbd_murid:{nama:string;no_kp:string}}[];
  if(rows.length!==murid.length) throw new Error("Ada peserta belum terdapat dalam daftar ePBD aktif. Betulkan daftar dahulu.");
  const peserta=rows.map((r)=>({aktiviti_id:id,murid_id:r.murid_id,nama:r.pbd_murid.nama,no_kp:r.pbd_murid.no_kp,kelas:r.tahun?`${r.tahun} ${r.kelas}`:r.kelas}));
  if(simpan) await db.minta("borang_peserta?on_conflict=aktiviti_id,murid_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(peserta)});
  return {ok:true,mesej:`${peserta.length} peserta ${simpan?"disimpan":"disemak tanpa menyimpan"}.`,peserta};
 } catch(e) {return {ok:false,mesej:e instanceof Error?e.message:"Gagal membaca peserta."};}
}
export async function jawapanAktiviti(id:string):Promise<JawapanAktiviti[]> {
 await urus(id); return bacaSemua<JawapanAktiviti>(`borang_jawapan?select=id,aktiviti_id,data,dicipta&aktiviti_id=eq.${id}&order=dicipta.asc,id.asc`);
}
export async function tutupAktiviti(id:string) {
 await urus(id); await klienTulis().minta(`borang_aktiviti?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({aktif:false})}); revalidatePath("/borang/aktiviti");
}
export async function suntingAktiviti(id: string, input: Pick<AktivitiBorang,"nama"|"tarikh"|"masa"|"tempat"|"anjuran"|"tutup">) {
 try {
  const asal = await urus(id);
  for (const k of ["nama","masa","tempat","anjuran"] as const) if (!input[k]?.trim() || input[k].length > 500) throw new Error("Lengkapkan butiran aktiviti.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarikh) || !/^\d{4}-\d{2}-\d{2}$/.test(input.tutup) || input.tutup > input.tarikh) throw new Error("Tarikh aktiviti atau tarikh tutup tidak sah.");
  const data = { nama: input.nama.trim(), tarikh: input.tarikh, masa: input.masa.trim(), tempat: input.tempat.trim(), anjuran: input.anjuran.trim(), tutup: input.tutup };
  await klienTulis().minta(`borang_aktiviti?id=eq.${asal.id}`, { method: "PATCH", body: JSON.stringify(data) });
  revalidatePath("/borang/aktiviti"); return { ok: true, mesej: "Butiran aktiviti dikemas kini.", rekod: { ...asal, ...data } };
 } catch (e) { return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyunting aktiviti." }; }
}
export async function padamAktiviti(id: string) {
 await urus(id);
 await klienTulis().minta(`borang_aktiviti?id=eq.${id}`, { method: "DELETE" });
 revalidatePath("/borang/aktiviti");
}
export async function padamJawapanAktiviti(aktivitiId: string, jawapanId: string) {
 await urus(aktivitiId);
 if (!uuid(jawapanId)) throw new Error("Jawapan tidak sah.");
 await klienTulis().minta(`borang_jawapan?id=eq.${jawapanId}&aktiviti_id=eq.${aktivitiId}`, { method: "DELETE" });
 revalidatePath("/borang/aktiviti");
}
/** Hanya butiran program awam; tiada senarai peserta atau maklumat penjaga. */
export async function aktivitiAwam(id?:string) {
 if(id && !uuid(id)) return [];
 return bacaSemua<Pick<AktivitiBorang,"id"|"nama"|"tarikh"|"masa"|"tempat"|"anjuran"|"tutup">>(`borang_aktiviti?select=id,nama,tarikh,masa,tempat,anjuran,tutup&aktif=eq.true&tutup=gte.${hariIniMY()}&order=tarikh.asc,id.asc${id?`&id=eq.${id}`:""}`);
}
export async function hantarAkuan(id:string, data: AkuanAktiviti, lamanPerangkap="") {
 try {
  if(lamanPerangkap || !uuid(id) || !semakAkuan(data)) throw new Error("Lengkapkan semua medan dan jawapan kesihatan.");
  const h=await headers();
  // Header platform dipercayai; jangan menerima IP daripada badan borang.
  const ip=h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "tidak-diketahui";
  const db=klienTulis();
  const dibenar=await db.minta("rpc/borang_ambil_giliran",{method:"POST",body:JSON.stringify({p_kunci:hash(`${ip}:${id}`)})});
  if(!dibenar) throw new Error("Had cubaan hari ini dicapai. Hubungi pengurus aktiviti.");
  if(!(await aktivitiAwam(id)).length) throw new Error("Borang telah ditutup atau tidak ditemui.");
  const p=await db.minta(`borang_peserta?select=murid_id,nama,kelas&aktiviti_id=eq.${id}&no_kp=eq.${data.muridKp}&limit=1`) as {murid_id:string;nama:string;kelas:string}[];
  const sama=(s:string)=>s.toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(!p[0] || sama(p[0].nama)!==sama(data.muridNama) || sama(p[0].kelas)!==sama(data.kelas)) throw new Error("Butiran peserta tidak sepadan. Semak nama, kelas dan No. MyKid dengan pengurus.");
  const resit=randomBytes(32).toString("hex");
  await db.minta("borang_jawapan",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({aktiviti_id:id,murid_id:p[0].murid_id,data,resit_hash:hash(resit)})});
  return {ok:true,mesej:"Akuan diterima. Simpan pautan resit untuk cetakan semula.",resit};
 } catch(e) {
  const mesej=e instanceof Error?e.message:"Gagal menghantar.";
  return {ok:false,mesej:/23505|duplicate key/.test(mesej)?"Akuan bagi peserta ini sudah diterima. Hubungi pengurus untuk pindaan.":mesej.startsWith("[supabase]")?"Borang tidak dapat disimpan. Cuba lagi atau hubungi pengurus.":mesej};
 }
}
export async function resitAkuan(token:string) {
 if(!/^[a-f0-9]{64}$/.test(token)) return null;
 const rows=await klienTulis().minta(`borang_jawapan?select=id,aktiviti_id,data,dicipta&resit_hash=eq.${hash(token)}&limit=1`) as JawapanAktiviti[];
 const r=rows[0]; if(!r || Date.now()-new Date(r.dicipta).getTime()>90*86400000) return null;
 const aktiviti=await klienTulis().minta(`borang_aktiviti?select=id,nama,tarikh,masa,tempat,anjuran,tutup&id=eq.${r.aktiviti_id}&limit=1`) as AktivitiBorang[];
 return aktiviti[0]?{jawapan:r,aktiviti:aktiviti[0]}:null;
}
