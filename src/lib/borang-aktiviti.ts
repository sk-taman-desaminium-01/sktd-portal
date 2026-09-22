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
import { semakAkuan, namaSepadan, type AktivitiBorang, type AkuanAktiviti, type JawapanAktiviti } from "@/data/borang-aktiviti";
import { hantar } from "./notifikasi";
const uuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s);
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

function segarAktiviti() {
 revalidatePath("/borang/aktiviti");
 revalidatePath("/borang/aktiviti/urus");
}

function mesejRalatModul(e: unknown) {
 const mesej = e instanceof Error ? e.message : "Gagal menghantar.";
 // Jangan beritahu ibu bapa butiran pangkalan data, tetapi jangan jadikan
 // pemasangan yang tertinggal kelihatan seperti mereka tersalah isi borang.
 if (/\bborang_(aktiviti|peserta|jawapan|had_akuan|ambil_giliran)\b/i.test(mesej))
   return "Modul borang aktiviti belum lengkap di pangkalan data. Pengurus perlu menjalankan SQL Borang Aktiviti sekali sahaja.";
 return mesej.startsWith("[supabase]") ? "Borang tidak dapat disimpan buat masa ini. Cuba lagi atau hubungi pengurus." : mesej;
}

/** Semakan ringan untuk mengelakkan skrin pengurus gagal putih jika SQL belum dipasang. */
export async function modulAktivitiSedia() {
 try {
   await klienTulis().minta("borang_aktiviti?select=id&limit=1");
   return true;
 } catch {
   return false;
 }
}
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
  segarAktiviti(); return {ok:true,mesej:"Aktiviti dicipta. Tambah peserta sebelum berkongsi pautan.",rekod:rows[0]};
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
 await urus(id); await klienTulis().minta(`borang_aktiviti?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({aktif:false})}); segarAktiviti();
}
export async function suntingAktiviti(id: string, input: Pick<AktivitiBorang,"nama"|"tarikh"|"masa"|"tempat"|"anjuran"|"tutup">) {
 try {
  const asal = await urus(id);
  for (const k of ["nama","masa","tempat","anjuran"] as const) if (!input[k]?.trim() || input[k].length > 500) throw new Error("Lengkapkan butiran aktiviti.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarikh) || !/^\d{4}-\d{2}-\d{2}$/.test(input.tutup) || input.tutup > input.tarikh) throw new Error("Tarikh aktiviti atau tarikh tutup tidak sah.");
  const data = { nama: input.nama.trim(), tarikh: input.tarikh, masa: input.masa.trim(), tempat: input.tempat.trim(), anjuran: input.anjuran.trim(), tutup: input.tutup };
  await klienTulis().minta(`borang_aktiviti?id=eq.${asal.id}`, { method: "PATCH", body: JSON.stringify(data) });
  segarAktiviti(); return { ok: true, mesej: "Butiran aktiviti dikemas kini.", rekod: { ...asal, ...data } };
 } catch (e) { return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyunting aktiviti." }; }
}
export async function padamAktiviti(id: string) {
 await urus(id);
 await klienTulis().minta(`borang_aktiviti?id=eq.${id}`, { method: "DELETE" });
 segarAktiviti();
}
export async function padamJawapanAktiviti(aktivitiId: string, jawapanId: string) {
 await urus(aktivitiId);
 if (!uuid(jawapanId)) throw new Error("Jawapan tidak sah.");
 await klienTulis().minta(`borang_jawapan?id=eq.${jawapanId}&aktiviti_id=eq.${aktivitiId}`, { method: "DELETE" });
 segarAktiviti();
}
/** Hanya butiran program awam; tiada senarai peserta atau maklumat penjaga. */
export async function aktivitiAwam(id?:string) {
 if(id && !uuid(id)) return [];
 try {
   return await bacaSemua<Pick<AktivitiBorang,"id"|"nama"|"tarikh"|"masa"|"tempat"|"anjuran"|"tutup">>(`borang_aktiviti?select=id,nama,tarikh,masa,tempat,anjuran,tutup&aktif=eq.true&tutup=gte.${hariIniMY()}&order=tarikh.asc,id.asc${id?`&id=eq.${id}`:""}`);
 } catch {
   // Laluan ini awam. Tiada skema DB atau ralat dalaman boleh dipaparkan
   // kepada penjaga; mereka hanya melihat tiada borang dibuka.
   return [];
 }
}
export async function hantarAkuan(id:string, data: AkuanAktiviti, lamanPerangkap="") {
 try {
  if(lamanPerangkap || !uuid(id) || !semakAkuan(data)) throw new Error("Lengkapkan semua medan dan jawapan kesihatan.");
  const h=await headers();
  // Header platform dipercayai; jangan menerima IP daripada badan borang.
  const ip=h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "tidak-diketahui";
  const db=klienTulis();
  const dibenar=await db.minta("rpc/borang_ambil_giliran",{method:"POST",body:JSON.stringify({p_kunci:hash(`${ip}:${id}:${data.muridKp}`)})});
  if(!dibenar) throw new Error("Had cubaan hari ini dicapai. Hubungi pengurus aktiviti.");
  const aktiviti = await db.minta(
    `borang_aktiviti?select=id,nama,pengurus_emel&aktif=eq.true&tutup=gte.${hariIniMY()}&id=eq.${id}&limit=1`,
  ) as { id: string; nama: string; pengurus_emel: string }[];
  if(!aktiviti[0]) throw new Error("Borang telah ditutup atau tidak ditemui.");
  const p=await db.minta(`borang_peserta?select=murid_id,nama,kelas&aktiviti_id=eq.${id}&no_kp=eq.${data.muridKp}&limit=1`) as {murid_id:string;nama:string;kelas:string}[];
  // Hanya murid yang DIPILIH pengurus boleh diisi. No. MyKid mesti tepat;
  // nama diterima dengan ejaan biasa ibu bapa (BT/BINTI, huruf kecil, nama
  // pendek) supaya salah taip kecil tidak menolak penjaga yang sah.
  if(!p[0] || !namaSepadan(p[0].nama, data.muridNama)) throw new Error("Murid ini tiada dalam senarai peserta yang dipilih jurulatih/pengurus, atau nama dan No. MyKid tidak sepadan. Semak dengan pengurus pasukan.");
  // Nama dan kelas rasmi daripada daftar ePBD — bukan taipan penjaga.
  const rekod: AkuanAktiviti = { ...data, muridNama: p[0].nama, kelas: p[0].kelas };
  const resit=randomBytes(32).toString("hex");
  await db.minta("borang_jawapan",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({aktiviti_id:id,murid_id:p[0].murid_id,data:rekod,resit_hash:hash(resit)})});
  await hantar({
    penerima: [aktiviti[0].pengurus_emel], jenis: "borang",
    tajuk: `Akuan penyertaan diterima · ${aktiviti[0].nama}`,
    teks: `${p[0].nama} (${p[0].kelas}) menghantar Surat Akuan Penyertaan Aktiviti.`,
    pautan: "/borang/aktiviti/urus",
  });
  return {ok:true,mesej:"Akuan diterima. Simpan pautan resit untuk cetakan semula.",resit};
 } catch(e) {
  const mesej=e instanceof Error?e.message:"Gagal menghantar.";
  return {ok:false,mesej:/23505|duplicate key/.test(mesej)?"Akuan bagi peserta ini sudah diterima. Hubungi pengurus untuk pindaan.":mesejRalatModul(e)};
 }
}
export async function resitAkuan(token:string) {
 if(!/^[a-f0-9]{64}$/.test(token)) return null;
 try {
   const rows=await klienTulis().minta(`borang_jawapan?select=id,aktiviti_id,data,dicipta&resit_hash=eq.${hash(token)}&limit=1`) as JawapanAktiviti[];
   const r=rows[0]; if(!r || Date.now()-new Date(r.dicipta).getTime()>90*86400000) return null;
   const aktiviti=await klienTulis().minta(`borang_aktiviti?select=id,nama,tarikh,masa,tempat,anjuran,tutup&id=eq.${r.aktiviti_id}&limit=1`) as AktivitiBorang[];
   return aktiviti[0]?{jawapan:r,aktiviti:aktiviti[0]}:null;
 } catch {
   return null;
 }
}

/**
 * CARIAN MURID untuk pengurus/jurulatih — pilih peserta tanpa menaip.
 *
 * Carian di PELAYAN (bukan senarai 2,000 murid dihantar ke pelayar): hanya
 * 20 padanan teratas bagi huruf yang ditaip sampai ke skrin, dan hanya
 * kepada orang yang memang mengurus aktiviti ini. No. MyKid disertakan
 * kerana ia diisi automatik ke dalam senarai peserta.
 */
export async function cariMuridAktiviti(id: string, q: string): Promise<{ ok: boolean; mesej: string; murid: { murid_id: string; nama: string; no_kp: string; kelas: string }[] }> {
 try {
  await urus(id);
  const t = q.trim().replace(/[%*,()"\\]/g, " ").replace(/\s+/g, " ");
  if (t.length < 2) return { ok: true, mesej: "", murid: [] };
  const sesi = await tahunSesiAktif();
  const kp = /^\d{4,12}$/.test(t.replace(/[- ]/g, ""));
  const kelas = /^([1-6])\s*([A-Za-z][A-Za-z ]*)?$/.exec(t);
  const tapis = kp
    ? `&pbd_murid.no_kp=like.${encodeURIComponent(t.replace(/[- ]/g, ""))}*`
    : kelas
    ? `&tahun=eq.${kelas[1]}${kelas[2] ? `&kelas=ilike.${encodeURIComponent(kelas[2].trim())}*` : ""}`
    : t.split(" ").map((w) => `&pbd_murid.nama=ilike.*${encodeURIComponent(w)}*`).join("");
  const rows = await klienTulis().minta(
   `pbd_pendaftaran?select=murid_id,tahun,kelas,pbd_murid!inner(nama,no_kp)&tahun_sesi=eq.${sesi}` +
   `&status=in.(aktif,pindah_masuk,ulang)${tapis}&order=tahun.asc,kelas.asc&limit=${kelas ? 60 : 20}`,
  ) as { murid_id: string; tahun: number; kelas: string; pbd_murid: { nama: string; no_kp: string | null } }[];
  return { ok: true, mesej: "", murid: rows.map((r) => ({
   murid_id: r.murid_id, nama: r.pbd_murid.nama, no_kp: r.pbd_murid.no_kp ?? "",
   kelas: r.tahun ? `${r.tahun} ${r.kelas}` : r.kelas,
  })) };
 } catch (e) { return { ok: false, mesej: e instanceof Error ? e.message : "Carian gagal.", murid: [] }; }
}

/** Tambah murid yang dipilih daripada carian. Nama/KP/kelas dibaca semula dari daftar — bukan dipercayai dari pelayar. */
export async function tambahPesertaPilih(id: string, muridIds: string[]) {
 try {
  await urus(id);
  const ids = [...new Set(muridIds)].filter(uuid);
  if (ids.length === 0 || ids.length > 200) throw new Error("Pilih 1–200 murid.");
  const sesi = await tahunSesiAktif();
  const db = klienTulis();
  const rows = await db.minta(`pbd_pendaftaran?select=murid_id,tahun,kelas,pbd_murid!inner(nama,no_kp)&tahun_sesi=eq.${sesi}&status=in.(aktif,pindah_masuk,ulang)&murid_id=in.(${ids.join(",")})`) as {murid_id:string;tahun:number;kelas:string;pbd_murid:{nama:string;no_kp:string|null}}[];
  const tanpaKp = rows.filter((r) => !/^\d{12}$/.test(r.pbd_murid.no_kp ?? ""));
  if (tanpaKp.length) throw new Error(`No. MyKid belum ada dalam daftar untuk: ${tanpaKp.map((r) => r.pbd_murid.nama).join(", ")}. Lengkapkan di kad Guru Kelas dahulu.`);
  if (rows.length !== ids.length) throw new Error("Sebahagian murid tiada dalam daftar aktif sesi ini.");
  const peserta = rows.map((r) => ({ aktiviti_id: id, murid_id: r.murid_id, nama: r.pbd_murid.nama, no_kp: r.pbd_murid.no_kp!, kelas: r.tahun ? `${r.tahun} ${r.kelas}` : r.kelas }));
  await db.minta("borang_peserta?on_conflict=aktiviti_id,murid_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(peserta) });
  return { ok: true, mesej: `${peserta.length} peserta ditambah.` };
 } catch (e) { return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menambah peserta." }; }
}

/** Buang seorang peserta. Jawapan yang sudah dihantar kekal (tidak dipadam senyap). */
export async function buangPesertaAktiviti(id: string, muridId: string) {
 try {
  await urus(id);
  if (!uuid(muridId)) throw new Error("Murid tidak sah.");
  await klienTulis().minta(`borang_peserta?aktiviti_id=eq.${id}&murid_id=eq.${muridId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  return { ok: true, mesej: "Peserta dibuang daripada senarai." };
 } catch (e) { return { ok: false, mesej: e instanceof Error ? e.message : "Gagal membuang peserta." }; }
}
