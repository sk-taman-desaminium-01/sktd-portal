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
import { semakAkuan, namaHampir, type AktivitiBorang, type AkuanAktiviti, type JawapanAktiviti } from "@/data/borang-aktiviti";
import { hantar } from "./notifikasi";
import { padatkanTandatangan } from "./padat-tandatangan";
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

/**
 * `tarikh_tamat` ditambah 22 Sep 2026. Sehingga SQL dijalankan, lajur itu
 * tiada: bacaan/tulisan dicuba semula TANPA lajur itu, supaya borang yang
 * sedang dibuka kepada ibu bapa tidak tiba-tiba hilang.
 */
function tiadaLajurTamat(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /tarikh_tamat/.test(m) && /42703|PGRST204|column|schema cache/i.test(m);
}
const LAJUR_AWAM = "id,nama,tarikh,tarikh_tamat,masa,tempat,anjuran,tutup";
async function denganTamat<T>(cuba: (lajur: string) => Promise<T>): Promise<T> {
  try { return await cuba(LAJUR_AWAM); }
  catch (e) { if (tiadaLajurTamat(e)) return cuba(LAJUR_AWAM.replace(",tarikh_tamat", "")); throw e; }
}
function sahTamat(mula: string, tamat: string | null | undefined): string | null {
  if (!tamat) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tamat)) throw new Error("Tarikh tamat tidak sah.");
  if (tamat < mula) throw new Error("Tarikh tamat mesti sama atau selepas tarikh mula.");
  return tamat === mula ? null : tamat;
}
async function tulisDenganTamat(laluan: string, kaedah: "POST" | "PATCH", data: Record<string, unknown>) {
  const db = klienTulis();
  try {
    return await db.minta(laluan, { method: kaedah, body: JSON.stringify(data) });
  } catch (e) {
    if (!tiadaLajurTamat(e)) throw e;
    const { tarikh_tamat: _abai, ...tanpa } = data;
    void _abai;
    return db.minta(laluan, { method: kaedah, body: JSON.stringify(tanpa) });
  }
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
  const rows = await tulisDenganTamat("borang_aktiviti", "POST", {nama:input.nama.trim(),tarikh:input.tarikh,tarikh_tamat:sahTamat(input.tarikh,input.tarikh_tamat),masa:input.masa.trim(),tempat:input.tempat.trim(),anjuran:input.anjuran.trim(),skop:input.skop,pengurus_emel:saya.emel,tutup:input.tutup}) as AktivitiBorang[];
  segarAktiviti(); return {ok:true,mesej:"Aktiviti dicipta. Tambah peserta sebelum berkongsi pautan.",rekod:rows[0]};
 } catch(e) {return {ok:false,mesej:e instanceof Error?e.message:"Gagal menyimpan."};}
}
export async function pesertaAktiviti(id: string) {
 await urus(id);
 return bacaSemua<{murid_id:string;nama:string;no_kp:string;kelas:string}>(`borang_peserta?select=murid_id,nama,no_kp,kelas&aktiviti_id=eq.${id}&order=nama.asc,murid_id.asc`);
}
const KP_DALAM = /\d{6}\s*-?\s*\d{2}\s*-?\s*\d{4}/;
const KEPALA = /^(bil\.?|no\.?|nama|kp|ic|kad pengenalan|jantina|kelas)\b/i;
/**
 * Tampalan sebenar dari WhatsApp/PDF/Word sering MEMECAHKAN satu murid kepada
 * beberapa baris ("NUR AIMY BINTI MOHD AL-" ↵ "AMIN 160101101234", atau nama
 * sebaris dan No. KP baris berikutnya). Baris tanpa No. KP disambung kepada
 * baris seterusnya sehingga No. KP ditemui — satu murid = satu No. KP.
 */
function gabungBarisPukal(teks: string): string {
  const keluar: string[] = []; let tampung = "";
  for (const mentah of teks.split(/\r?\n/)) {
    const b = mentah.trim();
    if (!b || (KEPALA.test(b) && b.length < 40 && !KP_DALAM.test(b))) continue;
    tampung = tampung ? (tampung.endsWith("-") ? tampung + b : `${tampung} ${b}`) : b;
    if (KP_DALAM.test(b)) { keluar.push(tampung); tampung = ""; }
  }
  if (tampung) keluar.push(tampung);
  return keluar.join("\n");
}

/**
 * Tampal pukal (nama + No. KP). Setiap baris dikesan sendiri:
 *  1. ada dalam daftar ePBD aktif → nama & kelas RASMI daftar;
 *  2. ada dalam `pbd_murid` tetapi tiada pendaftaran sesi ini → rekod itu
 *     diguna semula dengan nama yang ditampal;
 *  3. tiada langsung (murid baharu / import belum masuk) → rekod `pbd_murid`
 *     minimum dicipta (TANPA pendaftaran kelas, jadi senarai kelas, ePBD dan
 *     statistik tidak berubah). Bila Guru Kelas mendaftarkannya kemudian,
 *     import padan ikut No. KP (`on_conflict=no_kp`) — tiada pendua.
 * Peserta & akuan sedia ada tidak disentuh (merge-duplicates).
 */
export async function tambahPesertaAktiviti(id: string, teks: string, simpan=false) {
 try {
  await urus(id);
  const dibaca = bacaSenaraiMurid(gabungBarisPukal(teks));
  // No. KP sama ditampal dua kali (salin-tampal berganda) — simpan sekali, bukan tolak seluruh senarai.
  const dilihat = new Set<string>(); const murid = dibaca.murid.filter((m) => !m.no_kp || (dilihat.has(m.no_kp) ? false : (dilihat.add(m.no_kp), true)));
  const ditolak = [...dibaca.ditolak, ...murid.filter((m)=>!m.no_kp || !/^\d{12}$/.test(m.no_kp)).map((m)=>m.asal)];
  const sah = murid.filter((m)=>m.no_kp && /^\d{12}$/.test(m.no_kp) && m.nama.trim().length>=2);
  if (!sah.length) throw new Error(`Tiada murid dikesan. Setiap murid perlukan nama dan No. KP 12 digit (cth. AHMAD BIN ALI 160101101234).${ditolak.length?` Tidak dibaca: ${ditolak.slice(0,3).join(" | ")}`:""}`);
  if (sah.length>200) throw new Error("Maksimum 200 murid sekali tampal.");
  const db=klienTulis(); const sesi=await tahunSesiAktif();
  const kps=sah.map((m)=>m.no_kp!);
  const daftar=await db.minta(`pbd_pendaftaran?select=murid_id,tahun,kelas,pbd_murid!inner(nama,no_kp)&tahun_sesi=eq.${sesi}&status=in.(aktif,pindah_masuk,ulang)&pbd_murid.no_kp=in.(${kps.join(",")})`) as {murid_id:string;tahun:number;kelas:string;pbd_murid:{nama:string;no_kp:string}}[];
  const ikutKp=new Map(daftar.map((r)=>[r.pbd_murid.no_kp,r]));
  const luar=sah.filter((m)=>!ikutKp.has(m.no_kp!));
  const idLuar=new Map<string,string>();
  if (luar.length) {
   const wujud=await db.minta(`pbd_murid?select=id,no_kp&no_kp=in.(${luar.map((m)=>`"${m.no_kp}"`).join(",")})`) as {id:string;no_kp:string}[];
   for (const w of wujud) idLuar.set(w.no_kp,w.id);
   const baharu=luar.filter((m)=>!idLuar.has(m.no_kp!));
   if (simpan && baharu.length) {
    const cipta=await db.minta("pbd_murid?on_conflict=no_kp",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=representation"},body:JSON.stringify(baharu.map((m)=>({no_kp:m.no_kp,nama:m.nama.toUpperCase(),jantina:m.jantina})))}) as {id:string;no_kp:string}[];
    for (const c of cipta) idLuar.set(c.no_kp,c.id);
    const belum=baharu.filter((m)=>!idLuar.has(m.no_kp!));
    if (belum.length) {
     const lagi=await db.minta(`pbd_murid?select=id,no_kp&no_kp=in.(${belum.map((m)=>`"${m.no_kp}"`).join(",")})`) as {id:string;no_kp:string}[];
     for (const w of lagi) idLuar.set(w.no_kp,w.id);
    }
   }
  }
  const peserta=sah.map((m)=>{
   const r=ikutKp.get(m.no_kp!);
   if (r) return {aktiviti_id:id,murid_id:r.murid_id,nama:r.pbd_murid.nama,no_kp:r.pbd_murid.no_kp,kelas:r.tahun?`${r.tahun} ${r.kelas}`:r.kelas,baharu:false};
   return {aktiviti_id:id,murid_id:idLuar.get(m.no_kp!) ?? `baharu-${m.no_kp}`,nama:m.nama.toUpperCase(),no_kp:m.no_kp!,kelas:"MURID BAHARU",baharu:true};
  });
  if (simpan) {
   if (peserta.some((p)=>!uuid(p.murid_id))) throw new Error("Rekod murid baharu tidak dapat dicipta. Cuba lagi.");
   await db.minta("borang_peserta?on_conflict=aktiviti_id,murid_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(peserta.map(({baharu:_b,...p})=>{void _b;return p;}))});
  }
  const nBaharu=peserta.filter((p)=>p.baharu).length;
  const abai=ditolak.length?` ⚠️ ${ditolak.length} baris TIDAK dibaca (tiada No. KP 12 digit): ${ditolak.slice(0,5).join(" | ")}.`:"";
  return {ok:true,mesej:`${peserta.length} peserta ${simpan?"disimpan":"dikesan"}${nBaharu?` — ${nBaharu} tiada dalam daftar ePBD, ${simpan?"ditambah":"akan ditambah"} sebagai MURID BAHARU (kelas boleh dibetulkan melalui ⋯ › Sunting)`:""}.${abai}`,peserta};
 } catch(e) {return {ok:false,mesej:e instanceof Error?e.message:"Gagal membaca peserta."};}
}
export async function jawapanAktiviti(id:string):Promise<JawapanAktiviti[]> {
 await urus(id); return bacaSemua<JawapanAktiviti>(`borang_jawapan?select=id,aktiviti_id,murid_id,data,dicipta&aktiviti_id=eq.${id}&order=dicipta.asc,id.asc`);
}
export async function tutupAktiviti(id:string) {
 await urus(id); await klienTulis().minta(`borang_aktiviti?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({aktif:false})}); segarAktiviti();
}
export async function suntingAktiviti(id: string, input: Pick<AktivitiBorang,"nama"|"tarikh"|"tarikh_tamat"|"masa"|"tempat"|"anjuran"|"tutup">) {
 try {
  const asal = await urus(id);
  for (const k of ["nama","masa","tempat","anjuran"] as const) if (!input[k]?.trim() || input[k].length > 500) throw new Error("Lengkapkan butiran aktiviti.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarikh) || !/^\d{4}-\d{2}-\d{2}$/.test(input.tutup) || input.tutup > input.tarikh) throw new Error("Tarikh aktiviti atau tarikh tutup tidak sah.");
  const data = { nama: input.nama.trim(), tarikh: input.tarikh, tarikh_tamat: sahTamat(input.tarikh, input.tarikh_tamat), masa: input.masa.trim(), tempat: input.tempat.trim(), anjuran: input.anjuran.trim(), tutup: input.tutup };
  await tulisDenganTamat(`borang_aktiviti?id=eq.${asal.id}`, "PATCH", data);
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
   return await denganTamat((lajur) => bacaSemua<Pick<AktivitiBorang,"id"|"nama"|"tarikh"|"tarikh_tamat"|"masa"|"tempat"|"anjuran"|"tutup">>(`borang_aktiviti?select=${lajur}&aktif=eq.true&tutup=gte.${hariIniMY()}&order=tarikh.asc,id.asc${id?`&id=eq.${id}`:""}`));
 } catch {
   // Laluan ini awam. Tiada skema DB atau ralat dalaman boleh dipaparkan
   // kepada penjaga; mereka hanya melihat tiada borang dibuka.
   return [];
 }
}
export async function hantarAkuan(id:string, data: AkuanAktiviti, lamanPerangkap="") {
 try {
  if(lamanPerangkap || !uuid(id) || !semakAkuan(data)) throw new Error("Lengkapkan semua medan dan jawapan kesihatan.");
  // Dipadatkan SEBELUM giliran diambil: tandatangan yang tidak boleh dibaca
  // tidak patut memakan satu cubaan harian penjaga.
  const tandatangan = data.tandatangan ? padatkanTandatangan(data.tandatangan) : undefined;
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
  // Padanan ikut senarai PESERTA aktiviti ini (yang boleh disunting
  // jurulatih), BUKAN daftar ePBD — ejaan yang sudah dibetulkan jurulatih
  // ialah yang dipakai. MyKid penentu; nama dimaafkan (lihat namaHampir).
  if(!p[0]) {
    // Aktiviti berganda (nama sama dicipta dua kali) — penjaga mungkin membuka
    // salinan yang tiada peserta. Tunjukkan jalan ke borang yang betul.
    const lain=await db.minta(`borang_peserta?select=aktiviti_id,borang_aktiviti!inner(nama,aktif,tutup)&no_kp=eq.${data.muridKp}&aktiviti_id=neq.${id}&borang_aktiviti.aktif=eq.true&borang_aktiviti.tutup=gte.${hariIniMY()}&limit=1`).catch(()=>[]) as {aktiviti_id:string}[];
    if(lain[0]) throw new Error("Anak anda tersenarai dalam borang aktiviti LAIN yang sedang dibuka (mungkin aktiviti bernama sama). Kembali ke senarai aktiviti dan pilih borang yang satu lagi.");
  }
  if(!p[0]) throw new Error("No. MyKid ini tiada dalam senarai peserta aktiviti ini. Semak semula nombor MyKid anak (12 digit), atau hubungi jurulatih/pengurus pasukan supaya anak ditambah atau MyKid dibetulkan.");
  if(!namaHampir(p[0].nama, data.muridNama)) throw new Error("No. MyKid dijumpai, tetapi nama murid tidak sepadan dengan senarai peserta. Taip nama penuh anak seperti dalam MyKid, atau hubungi jurulatih/pengurus pasukan supaya ejaan nama dibetulkan.");
  // Nama dan kelas rasmi daripada daftar ePBD — bukan taipan penjaga.
  // `pindaan` hanya ditulis pengurus — buang apa-apa yang datang dari pelayar.
  const { pindaan: _abaiPindaan, ...isian } = data; void _abaiPindaan;
  const rekod: AkuanAktiviti = { ...isian, muridNama: p[0].nama, kelas: p[0].kelas, tandatangan };
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
   const aktiviti=await denganTamat((lajur)=>klienTulis().minta(`borang_aktiviti?select=${lajur}&id=eq.${r.aktiviti_id}&limit=1`)) as AktivitiBorang[];
   // Jejak pindaan (emel kakitangan) tidak dipaparkan pada resit awam.
   const { pindaan: _p, ...dataAwam } = r.data; void _p;
   return aktiviti[0]?{jawapan:{...r,data:dataAwam},aktiviti:aktiviti[0]}:null;
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

/**
 * Betulkan NAMA / KELAS / No. MyKid seorang murid dalam aktiviti — sebelum
 * ATAU selepas ibu bapa menghantar akuan (aduan ejaan daripada ibu bapa).
 *
 * Yang berubah HANYA tiga medan itu, di DUA tempat yang mesti seiring:
 *  - `borang_peserta` (senarai padanan semasa ibu bapa mengisi), dan
 *  - `borang_jawapan.data` → `muridNama`, `kelas`, `muridKp` sahaja.
 * Semua yang ibu bapa isi — butiran penjaga, alamat, telefon, persetujuan,
 * jawapan kesihatan, tandatangan — dibaca semula dan ditulis kembali SEBIJIK.
 * Ibu bapa TIDAK perlu mengisi semula.
 *
 * Nilai lama disimpan dalam `data.pindaan` (siapa, bila, dari apa) supaya
 * pindaan boleh dijejak. Daftar ePBD (`pbd_murid`) tidak disentuh.
 * Kuasa: pengurus aktiviti itu atau admin (lihat `urus`).
 *
 * Tertib selamat: peserta dahulu (MyKid berulang ditolak di sini oleh
 * kekangan unik, sebelum akuan disentuh); jika akuan gagal ditulis, peserta
 * dipulihkan kepada nilai asal supaya kedua-dua tempat tidak bercanggah.
 */
export async function suntingPesertaAktiviti(id: string, muridId: string, input: { nama: string; no_kp: string; kelas: string }) {
 try {
  await urus(id);
  const { saya } = await akses();
  if (!uuid(muridId)) throw new Error("Murid tidak sah.");
  const nama = input.nama.trim().replace(/\s+/g, " ").toUpperCase();
  const no_kp = input.no_kp.replace(/[- ]/g, "");
  const kelas = input.kelas.trim().replace(/\s+/g, " ").toUpperCase();
  if (nama.length < 2 || nama.length > 200) throw new Error("Nama murid mesti 2–200 aksara.");
  if (!/^\d{12}$/.test(no_kp)) throw new Error("No. MyKid mesti 12 digit.");
  if (!kelas || kelas.length > 100) throw new Error("Kelas tidak sah.");
  const db = klienTulis();
  const [pesertaAsal, jawapanAsal] = await Promise.all([
   db.minta(`borang_peserta?select=nama,no_kp,kelas&aktiviti_id=eq.${id}&murid_id=eq.${muridId}&limit=1`) as Promise<{ nama: string; no_kp: string; kelas: string }[]>,
   db.minta(`borang_jawapan?select=id,data&aktiviti_id=eq.${id}&murid_id=eq.${muridId}&limit=1`) as Promise<{ id: string; data: AkuanAktiviti }[]>,
  ]);
  const p0 = pesertaAsal[0], j0 = jawapanAsal[0];
  if (!p0 && !j0) throw new Error("Murid ini tiada dalam senarai peserta atau akuan aktiviti ini.");

  if (p0) await db.minta(`borang_peserta?aktiviti_id=eq.${id}&murid_id=eq.${muridId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ nama, no_kp, kelas }) });

  let akuanDikemas = false;
  if (j0) {
   const d = j0.data;
   const berubah = d.muridNama !== nama || d.kelas !== kelas || d.muridKp !== no_kp;
   if (berubah) {
    const data: AkuanAktiviti = {
     ...d, muridNama: nama, kelas, muridKp: no_kp,
     pindaan: [...(d.pindaan ?? []).slice(-9), { masa: new Date().toISOString(), oleh: saya.emel, dari: { muridNama: d.muridNama, kelas: d.kelas, muridKp: d.muridKp } }],
    };
    try {
     // Ditapis juga pada id jawapan: jika akuan itu dipadam/diganti serentak, tiada apa ditulis ganti.
     await db.minta(`borang_jawapan?id=eq.${j0.id}&aktiviti_id=eq.${id}&murid_id=eq.${muridId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ data }) });
     akuanDikemas = true;
    } catch (e) {
     if (p0) await db.minta(`borang_peserta?aktiviti_id=eq.${id}&murid_id=eq.${muridId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(p0) }).catch(() => undefined);
     throw e;
    }
   }
  }
  return {
   ok: true,
   mesej: `Butiran ${nama} dikemas kini${akuanDikemas ? " — termasuk dalam akuan yang sudah dihantar (jawapan ibu bapa yang lain kekal)" : ""}.`,
   peserta: { murid_id: muridId, nama, no_kp, kelas },
   akuanDikemas,
  };
 } catch (e) {
  const m = e instanceof Error ? e.message : "Gagal mengemas kini murid.";
  return { ok: false, mesej: /23505|duplicate key/.test(m) ? "No. MyKid itu sudah digunakan oleh peserta lain dalam aktiviti ini." : m };
 }
}
