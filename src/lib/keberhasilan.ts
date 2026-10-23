"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { pengguna } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { bacaSemua } from "./baca-semua";
import { belumDipasang } from "./db-belum-sedia";
import { hantar } from "./notifikasi";
import { sahInt, sahUuid } from "./sah";
import { tetapan } from "./fail-sementara";
import { hariIniMY } from "@/data/tarikh-my";
import { namaBersih } from "./nama";
import { HAD_BAIT } from "@/data/had-fail";
import {
  PERINGKAT, HAD_ULASAN, LOG_TINDAKAN, gabungIkutKuasa, kuasa, peralihan, peringkatKosong,
  ringkasan, semuaSasaran, susunBidangTetap,
  type Bidang, type Borang, type MaklumatPyd, type PerananEkb, type RingkasanPyd, type Tindakan,
} from "@/data/keberhasilan";

/**
 * e-Keberhasilan — pelayan. SATU-SATUNYA pintu baca/tulis jadual `ekb_*`.
 *
 * PERANAN DITENTUKAN PER BORANG, bukan per akaun: seorang guru ialah PYD
 * pada borangnya sendiri, dan mungkin PP1 pada borang orang lain. Peranan
 * datang daripada `ekb_penilai` (ditetapkan pentadbir), tidak pernah
 * daripada pelayar.
 *
 * SULIT. Penilaian prestasi bukan urusan seluruh pentadbiran: notifikasi
 * dihantar `peribadi`, dan No. K/P hanya dihantar kepada PYD sendiri
 * (peraturan keras #12 — apa yang sampai ke pelayar = awam).
 *
 * SIAPA NAMPAK APA (keputusan pengguna 23 Okt 2026):
 *  · Guru, kerani & AKP biasa — borang SENDIRI sahaja.
 *  · PP yang dilantik — borang sendiri + PYD yang dinilainya.
 *  · Pentadbir & Admin Mutlak (`lihatSemua`) — SEMUA borang, baca sahaja
 *    (PEMERHATI), kecuali yang mereka nilai sebagai PP.
 *  · Hanya Pentadbir & Admin Mutlak menetapkan PP (Tetapan penilai). Admin
 *    biasa TIADA akses — keputusan pengguna 23 Okt 2026. Pentadbir menjadi
 *    calon PP secara automatik; kerani/AKP perlu dilantik.
 */

const BUCKET = "ekb-bukti";
const TEMPAT = "SK TAMAN DESAMINIUM";
const SAMBUNGAN = /\.(pdf|png|jpe?g|webp|heic|docx?|xlsx?|pptx?|csv|txt)$/i;
const MESEJ_BELUM = "Modul e-Keberhasilan belum dipasang — admin perlu jalankan SQL `20261023_keberhasilan.sql` sekali.";

export type PerananLihat = PerananEkb | "PEMERHATI";

/** Pentadbir & Admin Mutlak sahaja: membaca borang semua orang DAN menetapkan PP. */
const lihatSemua = (p: string | null | undefined) => p === "pentadbir" || p === "admin_mutlak";
/** `konflik: true` = versi borang berubah sejak dibaca; pelayar perlu muat semula. */
export type Hasil<T = object> = ({ ok: true } & T) | { ok: false; mesej: string; konflik?: boolean };

export interface Ulasan { id: string; sasaran_id: string; oleh_nama: string; oleh_peranan: PerananEkb; teks: string; dicipta: string }
export interface Bukti { id: string; sasaran_id: string; peringkat: "p1" | "akhir"; nama: string; saiz: number; dicipta: string }
export interface Log { oleh_nama: string; oleh_peranan: string; teks: string; dicipta: string }
export interface Orang { id: string; nama: string }

export interface BorangPenuh {
  borang: Borang;
  peranan: PerananLihat;
  pp1: Orang | null;
  pp2: Orang | null;
  ulasan: Ulasan[];
  bukti: Bukti[];
  log: Log[];
}

export interface BarisPantau {
  borang_id: string;
  pyd: Orang;
  /** Peranan SAYA terhadap PYD ini. */
  peranan: PerananLihat;
  pp1: Orang | null;
  pp2: Orang | null;
  r: RingkasanPyd;
  bilBukti: number;
  /** Bilangan sasaran yang ulasan terakhirnya daripada PYD (menunggu balasan PP). */
  balasPyd: number;
}

export interface DataHalaman {
  tahun: number;
  hariIni: string;
  belumSedia: boolean;
  mesej?: string;
  /** Null hanya bila pengguna tiada baris pbd_guru (maka tiada borang sendiri). */
  borangSaya: BorangPenuh | null;
  pantau: BarisPantau[];
  /** Boleh menetapkan PP (tab Tetapan penilai) — Pentadbir & Admin Mutlak sahaja. */
  pemerhati: boolean;
  /** Penetapan PP semasa bagi setiap PYD — untuk tab Tetapan penilai sahaja. */
  penilai: { pyd_id: string; pp1: Orang | null; pp2: Orang | null }[];
  /** Diisi untuk pemerhati sahaja — senarai PYD dalam Tetapan penilai. */
  guru: OrangPeranan[];
  /** Diisi untuk pemerhati sahaja — siapa BOLEH dipilih sebagai PP. */
  calon: CalonPP | null;
}

export interface OrangPeranan extends Orang { peranan: string }

/**
 * Siapa boleh menjadi PP (keputusan pengguna 23 Okt 2026):
 *  · `pentadbir` — Pentadbir + Admin Mutlak (GB, PK). PP bagi SEMUA PYD.
 *  · `ppAkp` — kerani/AKP yang dilantik (cth. Ketua Kerani). PP bagi PYD
 *    yang juga kerani/AKP SAHAJA.
 *  · `akp` — semua kerani/AKP; calon untuk dilantik ke `ppAkp`.
 * Pelayan menguatkuasakan senarai ini dalam `tetapPenilai`; dropdown hanya cermin.
 */
export interface CalonPP {
  pentadbir: Orang[];
  ppAkp: Orang[];
  akp: Orang[];
  /** Admin Mutlak (env) yang tiada baris dalam Senarai Akses — tidak boleh dipilih. */
  mutlakTiadaRekod: number;
  /** Jadual `ekb_pp_akp` belum dipasang. */
  ppAkpBelumSedia: boolean;
}

interface BarisBorang { id: string; tahun: number; pyd_id: string; versi: number; pyd: MaklumatPyd; bidang: Bidang[]; peringkat: Borang["peringkat"] }
interface BarisPenilai { tahun: number; pyd_id: string; pp1_id: string | null; pp2_id: string | null }

const tahunIni = () => Number(hariIniMY().slice(0, 4));

/** Peranan AKP (Anggota Kumpulan Pelaksana) dalam portal. */
const PERANAN_AKP = ["kerani", "kakitangan"];

/** Ralat yang kita lontar sendiri dipapar; ralat PostgREST mentah tidak (nama jadual/kekangan). */
function mesej(e: unknown, lalai: string): string {
  const t = e instanceof Error ? e.message : "";
  if (!t || t.startsWith("[supabase]") || t.startsWith("[storan]")) {
    console.error("[keberhasilan]", e);
    return lalai;
  }
  return t;
}

/**
 * Langkah susulan SELEPAS tulisan berjaya (log, notifikasi). Kegagalannya
 * dilaporkan ke log pelayan tetapi TIDAK menukar jawapan kepada "gagal" —
 * data sudah tersimpan, dan cubaan semula akan berlanggar versi atau
 * menggandakan ulasan (sama keluarga dengan peraturan keras #16).
 */
async function susulan(kerja: () => Promise<unknown>) {
  try { await kerja(); } catch (e) { console.error("[keberhasilan] susulan gagal", e); }
}

function keBorang(r: BarisBorang, peranan: PerananLihat): Borang {
  const pyd: MaklumatPyd = Object.assign({ nama: "", kp: "", gred: "", jawatan: "", tempat: TEMPAT }, r.pyd ?? {});
  // Nama akaun Google KPM membawa "KPM-Guru" — bukan sebahagian nama rasmi.
  pyd.nama = namaBersih(pyd.nama).toUpperCase();
  if (peranan !== "PYD") pyd.kp = "";
  const peringkat = { ...peringkatKosong(), ...(r.peringkat ?? {}) };
  return { id: r.id, tahun: r.tahun, pyd_id: r.pyd_id, versi: r.versi, pyd, bidang: susunBidangTetap(r.bidang ?? []), peringkat };
}

async function namaGuru(ids: (string | null)[]): Promise<Map<string, { nama: string; email: string | null }>> {
  const u = [...new Set(ids.filter((x): x is string => !!x))];
  const m = new Map<string, { nama: string; email: string | null }>();
  if (!u.length) return m;
  const rows = (await klienTulis().minta(`pbd_guru?select=id,nama,email&id=in.(${u.join(",")})`)) as { id: string; nama: string; email: string | null }[];
  for (const r of rows) m.set(r.id, { nama: namaBersih(r.nama), email: r.email });
  return m;
}

/** Konteks satu borang: barisnya, penilainya, dan peranan SAYA terhadapnya. */
async function konteks(borangId: string, pemerhatiDibenarkan = false) {
  sahUuid(borangId, "Borang");
  const saya = await pengguna();
  if (!saya?.peranan) throw new Error("Tiada kebenaran.");
  const db = klienTulis();
  const [b] = (await db.minta(`ekb_borang?select=*&id=eq.${borangId}&limit=1`)) as BarisBorang[];
  if (!b) throw new Error("Borang tidak dijumpai.");
  const [p] = (await db.minta(`ekb_penilai?select=*&tahun=eq.${b.tahun}&pyd_id=eq.${b.pyd_id}&limit=1`)) as BarisPenilai[];
  let peranan: PerananLihat | null = null;
  if (saya.id && saya.id === b.pyd_id) peranan = "PYD";
  else if (saya.id && p?.pp1_id === saya.id) peranan = "PP1";
  else if (saya.id && p?.pp2_id === saya.id) peranan = "PP2";
  else if (pemerhatiDibenarkan && lihatSemua(saya.peranan)) peranan = "PEMERHATI";
  if (!peranan) throw new Error("Anda bukan PYD atau penilai bagi borang ini.");
  return { saya, b, p: p ?? null, peranan };
}

async function tulisLog(borang_id: string, oleh: { id: string | null; nama: string | null; emel: string }, peranan: string, teks: string[]) {
  if (!teks.length) return;
  await klienTulis().minta("ekb_log", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify(teks.map((t) => ({ borang_id, oleh_id: oleh.id, oleh_nama: oleh.nama ?? oleh.emel, oleh_peranan: peranan, teks: t.slice(0, 300) }))),
  });
}

async function beritahu(ids: (string | null)[], tajuk: string, teks: string, oleh: string) {
  const m = await namaGuru(ids);
  const penerima = [...m.values()].map((x) => x.email).filter((e): e is string => !!e);
  if (!penerima.length) return;
  await hantar({ penerima, peribadi: true, jenis: "umum", tajuk, teks, pautan: "/keberhasilan", oleh });
}

async function borangPenuh(b: BarisBorang, p: BarisPenilai | null, peranan: PerananLihat): Promise<BorangPenuh> {
  const db = klienTulis();
  const [ulasan, bukti, log, nama] = await Promise.all([
    bacaSemua<Ulasan>(`ekb_ulasan?select=id,sasaran_id,oleh_nama,oleh_peranan,teks,dicipta&borang_id=eq.${b.id}&order=dicipta.asc,id.asc`),
    bacaSemua<Bukti>(`ekb_bukti?select=id,sasaran_id,peringkat,nama,saiz,dicipta&borang_id=eq.${b.id}&order=dicipta.asc,id.asc`),
    db.minta(`ekb_log?select=oleh_nama,oleh_peranan,teks,dicipta&borang_id=eq.${b.id}&order=dicipta.desc,id.desc&limit=100`) as Promise<Log[]>,
    namaGuru([p?.pp1_id ?? null, p?.pp2_id ?? null]),
  ]);
  const orang = (id: string | null | undefined): Orang | null => (id && nama.get(id) ? { id, nama: nama.get(id)!.nama } : null);
  return { borang: keBorang(b, peranan), peranan, pp1: orang(p?.pp1_id), pp2: orang(p?.pp2_id), ulasan, bukti, log };
}

/* ------------------------------------------------------------- baca ---- */

/** Data halaman /keberhasilan: borang saya + senarai PYD yang saya nilai. */
export async function dataKeberhasilan(): Promise<DataHalaman> {
  const tahun = tahunIni(), hariIni = hariIniMY();
  const kosong: DataHalaman = { tahun, hariIni, belumSedia: false, borangSaya: null, pantau: [], pemerhati: false, penilai: [], guru: [], calon: null };
  const saya = await pengguna();
  if (!saya?.peranan) return kosong;
  const pemerhati = lihatSemua(saya.peranan);
  const db = klienTulis();
  try {
    // Borang sendiri dicipta pada lawatan pertama — tiada butang "mula".
    let borangSaya: BorangPenuh | null = null;
    if (saya.id) {
      await db.minta("ekb_borang?on_conflict=tahun,pyd_id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({
          tahun, pyd_id: saya.id,
          pyd: { nama: namaBersih(saya.nama ?? "").toUpperCase(), kp: "", gred: "", jawatan: "", tempat: TEMPAT },
          bidang: susunBidangTetap([]),
          peringkat: peringkatKosong(),
        }),
      });
      const [b] = (await db.minta(`ekb_borang?select=*&tahun=eq.${tahun}&pyd_id=eq.${saya.id}&limit=1`)) as BarisBorang[];
      const [p] = (await db.minta(`ekb_penilai?select=*&tahun=eq.${tahun}&pyd_id=eq.${saya.id}&limit=1`)) as BarisPenilai[];
      if (b) borangSaya = await borangPenuh(b, p ?? null, "PYD");
    }

    // Penetapan PP: semua (untuk lihatSemua/Tetapan) atau yang saya nilai sahaja.
    const semua = lihatSemua(saya.peranan);
    const penilai = semua || pemerhati
      ? await bacaSemua<BarisPenilai>(`ekb_penilai?select=*&tahun=eq.${tahun}&order=pyd_id.asc`)
      : saya.id
        ? await bacaSemua<BarisPenilai>(`ekb_penilai?select=*&tahun=eq.${tahun}&or=(pp1_id.eq.${saya.id},pp2_id.eq.${saya.id})&order=pyd_id.asc`)
        : [];
    // Borang yang muncul di Pantau: semua (Pentadbir/Admin Mutlak) atau yang saya nilai.
    const pydIds = penilai.filter((p) => p.pp1_id === saya.id || p.pp2_id === saya.id).map((p) => p.pyd_id).filter((id) => id !== saya.id);
    const borang = semua
      ? (await bacaSemua<BarisBorang>(`ekb_borang?select=id,tahun,pyd_id,versi,bidang,peringkat&tahun=eq.${tahun}&order=id.asc`)).filter((b) => b.pyd_id !== saya.id)
      : pydIds.length
        ? await bacaSemua<BarisBorang>(`ekb_borang?select=id,tahun,pyd_id,versi,bidang,peringkat&tahun=eq.${tahun}&pyd_id=in.(${pydIds.join(",")})&order=id.asc`)
        : [];
    const ids = borang.map((b) => b.id);
    const [ulasan, bukti, nama] = await Promise.all([
      ids.length ? bacaSemua<{ borang_id: string; sasaran_id: string; oleh_peranan: string }>(`ekb_ulasan?select=borang_id,sasaran_id,oleh_peranan&borang_id=in.(${ids.join(",")})&order=dicipta.asc,id.asc`) : [],
      ids.length ? bacaSemua<{ borang_id: string }>(`ekb_bukti?select=borang_id&borang_id=in.(${ids.join(",")})&order=id.asc`) : [],
      namaGuru([...borang.map((b) => b.pyd_id), ...penilai.flatMap((p) => [p.pyd_id, p.pp1_id, p.pp2_id])]),
    ]);
    const akhir = new Map<string, string>();
    for (const u of ulasan) akhir.set(`${u.borang_id}:${u.sasaran_id}`, u.oleh_peranan);
    const orang = (id: string | null): Orang | null => (id && nama.get(id) ? { id, nama: nama.get(id)!.nama } : null);

    const pantau: BarisPantau[] = borang.map((b) => {
      const p = penilai.find((x) => x.pyd_id === b.pyd_id) ?? { tahun, pyd_id: b.pyd_id, pp1_id: null, pp2_id: null };
      const peranan: PerananLihat = p.pp1_id === saya.id ? "PP1" : p.pp2_id === saya.id ? "PP2" : "PEMERHATI";
      const bf = keBorang(b as BarisBorang, peranan);
      return {
        borang_id: b.id, pyd: orang(b.pyd_id) ?? { id: b.pyd_id, nama: "?" }, peranan,
        pp1: orang(p.pp1_id), pp2: orang(p.pp2_id),
        r: ringkasan(bf, hariIni),
        bilBukti: bukti.filter((x) => x.borang_id === b.id).length,
        balasPyd: semuaSasaran(bf).filter((s) => akhir.get(`${b.id}:${s.id}`) === "PYD").length,
      };
    }).sort((a, c) => a.pyd.nama.localeCompare(c.pyd.nama));

    const [guru, calon] = pemerhati
      ? await Promise.all([
        bacaSemua<OrangPeranan>(`pbd_guru?select=id,nama,peranan&dibenarkan=eq.true&order=nama.asc,id.asc`)
          // Lapisan admin dirahsiakan (sama seperti `sembunyiBaris`): pelayar
          // hanya menerima kumpulan, dan "admin" dipapar sebagai pentadbir.
          .then((g) => g.map((o) => ({ ...o, nama: namaBersih(o.nama), peranan: o.peranan === "admin" ? "pentadbir" : o.peranan }))),
        calonPP().then((c) => (saya.peranan === "admin_mutlak" ? c : { ...c, mutlakTiadaRekod: 0 })),
      ])
      : [[], null];
    const tetapan = pemerhati ? penilai.map((p) => ({ pyd_id: p.pyd_id, pp1: orang(p.pp1_id), pp2: orang(p.pp2_id) })) : [];
    return { tahun, hariIni, belumSedia: false, borangSaya, pantau, pemerhati, penilai: tetapan, guru, calon };
  } catch (e) {
    if (belumDipasang(e, "ekb_borang", "ekb_penilai", "ekb_ulasan", "ekb_bukti", "ekb_log")) return { ...kosong, belumSedia: true, mesej: MESEJ_BELUM };
    throw e;
  }
}

/** Buka borang orang lain (PP1/PP2/pemerhati) — atau borang sendiri. */
export async function bukaBorang(borangId: string): Promise<Hasil<{ data: BorangPenuh }>> {
  try {
    const { b, p, peranan } = await konteks(borangId, true);
    return { ok: true, data: await borangPenuh(b, p, peranan) };
  } catch (e) {
    return { ok: false, mesej: mesej(e, "Gagal membuka borang.") };
  }
}

/* ------------------------------------------------------------ tulis ---- */

const KONFLIK = "Borang ini baru dikemas kini oleh orang lain. Muat semula halaman untuk melihat versi terkini — perubahan anda belum disimpan.";

async function tampal(b: BarisBorang, versi: number, isi: Partial<BarisBorang>): Promise<BarisBorang | null> {
  const rows = (await klienTulis().minta(`ekb_borang?id=eq.${b.id}&versi=eq.${versi}`, {
    method: "PATCH",
    body: JSON.stringify({ ...isi, versi: versi + 1, dikemas: new Date().toISOString() }),
  })) as BarisBorang[];
  return rows[0] ?? null;
}

/**
 * Simpan maklumat PYD + bidang/sasaran. Pelayan hanya menyalin medan yang
 * peranan ini boleh ubah pada peringkat semasa (`gabungIkutKuasa`).
 */
export async function simpanBorang(input: {
  borangId: string; versi: number; pyd?: Partial<MaklumatPyd>; bidang: Bidang[];
}): Promise<Hasil<{ data: BorangPenuh }>> {
  try {
    const versi = sahInt(input.versi, "versi", 1, 1_000_000);
    const { saya, b, p, peranan } = await konteks(input.borangId);
    if (peranan !== "PYD" && peranan !== "PP1") return { ok: false, mesej: "Anda hanya boleh membaca borang ini." };
    if (b.versi !== versi) return { ok: false, mesej: KONFLIK, konflik: true };
    if (!Array.isArray(input.bidang)) return { ok: false, mesej: "Data borang tidak sah." };

    const asal = keBorang(b, peranan);
    const k = kuasa(asal, peranan);
    const { bidang, perubahan } = gabungIkutKuasa(asal.bidang, input.bidang, k, peranan, () => randomUUID().slice(0, 8));
    const isi: Partial<BarisBorang> = { bidang };
    if (peranan === "PYD" && k.penetapan && input.pyd) {
      const potong = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
      isi.pyd = {
        nama: potong(input.pyd.nama, 120).toUpperCase() || b.pyd.nama,
        kp: potong(input.pyd.kp, 14).replace(/[^\d-]/g, ""),
        gred: potong(input.pyd.gred, 20).toUpperCase(),
        jawatan: potong(input.pyd.jawatan, 120).toUpperCase(),
        tempat: potong(input.pyd.tempat, 120).toUpperCase() || TEMPAT,
      };
    }
    const baru = await tampal(b, versi, isi);
    if (!baru) return { ok: false, mesej: KONFLIK, konflik: true };
    await susulan(() => tulisLog(b.id, saya, peranan, perubahan));
    return { ok: true, data: await borangPenuh(baru, p, peranan) };
  } catch (e) {
    return { ok: false, mesej: mesej(e, "Gagal menyimpan.") };
  }
}

/** Hantar / tarik balik / sahkan / pulangkan / perakui satu peringkat. */
export async function tindakanPeringkat(input: {
  borangId: string; versi: number; i: number; tindakan: Tindakan; sebab?: string;
}): Promise<Hasil<{ data: BorangPenuh }>> {
  try {
    const versi = sahInt(input.versi, "versi", 1, 1_000_000);
    const i = sahInt(input.i, "peringkat", 0, 3);
    if (!(input.tindakan in LOG_TINDAKAN)) return { ok: false, mesej: "Tindakan tidak sah." };
    const { saya, b, p, peranan } = await konteks(input.borangId);
    if (peranan === "PEMERHATI") return { ok: false, mesej: "Hanya PYD dan penilai yang dilantik boleh bertindak." };
    if (b.versi !== versi) return { ok: false, mesej: KONFLIK, konflik: true };
    if (input.tindakan === "hantar" && !p?.pp1_id) return { ok: false, mesej: "PP1 anda belum ditetapkan. Minta pentadbir menetapkan penilai dahulu." };

    const hasil = peralihan(keBorang(b, peranan), i, input.tindakan, peranan, hariIniMY(), input.sebab ?? "");
    if (!hasil.ok) return hasil;
    const kod = PERINGKAT[i].k, tajuk = PERINGKAT[i].t;
    const baru = await tampal(b, versi, { peringkat: { ...peringkatKosong(), ...b.peringkat, [kod]: hasil.peringkat } });
    if (!baru) return { ok: false, mesej: KONFLIK, konflik: true };
    await susulan(() => tulisLog(b.id, saya, peranan, [LOG_TINDAKAN[input.tindakan](tajuk)]));

    const pyd = b.pyd?.nama || "PYD";
    const oleh = saya.emel;
    await susulan(async () => { switch (input.tindakan) {
      case "hantar": await beritahu([p!.pp1_id], `e-Keberhasilan · ${tajuk}`, `${pyd} menghantar ${tajuk} untuk disahkan.`, oleh); break;
      case "tarik": await beritahu([p?.pp1_id ?? null], `e-Keberhasilan · ditarik balik`, `${pyd} menarik balik ${tajuk}.`, oleh); break;
      case "sahkan":
        await beritahu([b.pyd_id], `e-Keberhasilan · ${tajuk} disahkan`, `PP1 mengesahkan ${tajuk} anda.`, oleh);
        await beritahu([p?.pp2_id ?? null], `e-Keberhasilan · perlu perakuan`, `${tajuk} ${pyd} telah disahkan PP1 dan menunggu perakuan anda.`, oleh);
        break;
      case "pulang": await beritahu([b.pyd_id], `e-Keberhasilan · dipulangkan`, `${tajuk} dipulangkan untuk pindaan: ${(input.sebab ?? "").slice(0, 200)}`, oleh); break;
      case "perakui": await beritahu([b.pyd_id, p?.pp1_id ?? null], `e-Keberhasilan · ${tajuk} diperakui`, `PP2 memperakui ${tajuk} ${pyd}.`, oleh); break;
    } });
    revalidatePath("/keberhasilan");
    return { ok: true, data: await borangPenuh(baru, p, peranan) };
  } catch (e) {
    return { ok: false, mesej: mesej(e, "Gagal.") };
  }
}

/** Ulasan pada satu sasaran — PYD, PP1 dan PP2 sahaja (dua hala). */
export async function tambahUlasan(input: { borangId: string; sasaranId: string; teks: string }): Promise<Hasil<{ ulasan: Ulasan }>> {
  try {
    const { saya, b, p, peranan } = await konteks(input.borangId);
    if (peranan === "PEMERHATI") return { ok: false, mesej: "Hanya PYD dan penilai yang dilantik boleh mengulas." };
    const teks = String(input.teks ?? "").trim().slice(0, HAD_ULASAN);
    if (!teks) return { ok: false, mesej: "Tulis ulasan dahulu." };
    const s = semuaSasaran({ bidang: b.bidang ?? [] }).find((x) => x.id === input.sasaranId);
    if (!s) return { ok: false, mesej: "Sasaran tidak dijumpai." };
    const [u] = (await klienTulis().minta("ekb_ulasan?select=id,sasaran_id,oleh_nama,oleh_peranan,teks,dicipta", {
      method: "POST",
      body: JSON.stringify({ borang_id: b.id, sasaran_id: s.id, oleh_id: saya.id, oleh_nama: saya.nama ?? saya.emel, oleh_peranan: peranan, teks }),
    })) as Ulasan[];
    const kepada = peranan === "PYD" ? [p?.pp1_id ?? null, p?.pp2_id ?? null] : [b.pyd_id, peranan === "PP1" ? p?.pp2_id ?? null : p?.pp1_id ?? null];
    await susulan(() => beritahu(kepada, "e-Keberhasilan · ulasan baharu", `${saya.nama ?? saya.emel} (${peranan}): ${teks.slice(0, 160)}`, saya.emel));
    return { ok: true, ulasan: u };
  } catch (e) {
    return { ok: false, mesej: mesej(e, "Gagal menghantar ulasan.") };
  }
}

/* ------------------------------------------------------------ bukti ---- */

async function pastikanBaldi() {
  const { url, kepala } = tetapan();
  const semak = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers: kepala, cache: "no-store" });
  if (semak.ok) return;
  const cipta = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST", headers: { ...kepala, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: HAD_BAIT }),
  });
  if (!cipta.ok && cipta.status !== 409) throw new Error(`Storan bukti tidak dapat disediakan (${cipta.status}).`);
}

async function bolehBukti(borangId: string, sasaranId: string, peringkat: unknown) {
  if (peringkat !== "p1" && peringkat !== "akhir") throw new Error("Peringkat bukti tidak sah.");
  const c = await konteks(borangId);
  if (c.peranan !== "PYD") throw new Error("Hanya PYD boleh memuat naik bukti.");
  if (!kuasa(keBorang(c.b, "PYD"), "PYD").bukti[peringkat]) throw new Error("Peringkat ini tidak terbuka untuk bukti.");
  if (!semuaSasaran({ bidang: c.b.bidang ?? [] }).some((s) => s.id === sasaranId)) throw new Error("Sasaran tidak dijumpai.");
  return c;
}

/** Langkah 1: URL muat naik terus (fail tidak melalui Vercel — had 4.5 MB). */
export async function mintaSlotBukti(input: { borangId: string; sasaranId: string; peringkat: "p1" | "akhir"; nama: string; saiz: number }): Promise<Hasil<{ urlMuatNaik: string; laluan: string }>> {
  try {
    await bolehBukti(input.borangId, input.sasaranId, input.peringkat);
    if (!Number.isFinite(input.saiz) || input.saiz <= 0) return { ok: false, mesej: "Fail kosong." };
    if (input.saiz > HAD_BAIT) return { ok: false, mesej: `Fail melebihi had ${HAD_BAIT / 1048576} MB.` };
    const ext = SAMBUNGAN.exec(String(input.nama ?? ""))?.[1]?.toLowerCase();
    if (!ext) return { ok: false, mesej: "Jenis fail tidak disokong. Guna PDF, gambar, Word, Excel, PowerPoint, CSV atau TXT." };
    await pastikanBaldi();
    const { url, kepala } = tetapan();
    const laluan = `${input.borangId}/${randomUUID()}.${ext}`;
    const res = await fetch(`${url}/storage/v1/object/upload/sign/${BUCKET}/${laluan}`, {
      method: "POST", headers: { ...kepala, "Content-Type": "application/json" }, body: "{}",
    });
    if (!res.ok) return { ok: false, mesej: `Storan menolak muat naik (${res.status}).` };
    const j = (await res.json()) as { url?: string };
    if (!j.url) return { ok: false, mesej: "Storan tidak memberi URL muat naik." };
    return { ok: true, urlMuatNaik: `${url}/storage/v1${j.url}`, laluan };
  } catch (e) {
    return { ok: false, mesej: mesej(e, "Gagal menyediakan muat naik.") };
  }
}

/** Langkah 2: selepas PUT berjaya, daftarkan bukti. */
export async function daftarBukti(input: { borangId: string; sasaranId: string; peringkat: "p1" | "akhir"; laluan: string; nama: string }): Promise<Hasil<{ bukti: Bukti; versi: number }>> {
  try {
    const { saya, b } = await bolehBukti(input.borangId, input.sasaranId, input.peringkat);
    if (!new RegExp(`^${b.id}/[0-9a-f-]{36}\\.[a-z]{2,4}$`).test(String(input.laluan)) || !SAMBUNGAN.test(String(input.laluan))) return { ok: false, mesej: "Laluan fail tidak sah." };
    const { url, kepala } = tetapan();
    const ada = await fetch(`${url}/storage/v1/object/info/${BUCKET}/${input.laluan}`, { headers: kepala, cache: "no-store" });
    if (!ada.ok) return { ok: false, mesej: "Fail belum sampai ke storan. Cuba muat naik semula." };
    const info = (await ada.json().catch(() => ({}))) as { size?: number; metadata?: { size?: number } };
    const saiz = Number(info.size ?? info.metadata?.size ?? 0) || 1;
    const nama = String(input.nama ?? "bukti").replace(/[\\/\u0000-\u001f]/g, "").slice(0, 160) || "bukti";
    const [r] = (await klienTulis().minta("ekb_bukti?select=id,sasaran_id,peringkat,nama,saiz,dicipta", {
      method: "POST",
      body: JSON.stringify({ borang_id: b.id, sasaran_id: input.sasaranId, peringkat: input.peringkat, nama, saiz, laluan: input.laluan, oleh_id: saya.id }),
    })) as Bukti[];
    // KUNCI VERSI SELEPAS sisip: kalau peringkat dihantar/disahkan semasa fail
    // dimuat naik, versi sudah berubah — batalkan sisipan itu. Setiap
    // peralihan peringkat menaikkan versi, jadi versi yang sama bermakna
    // peringkat masih terbuka ketika bukti didaftarkan.
    const baru = await tampal(b, b.versi, {});
    if (!baru) {
      await klienTulis().minta(`ekb_bukti?id=eq.${r.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      return { ok: false, mesej: KONFLIK, konflik: true };
    }
    await susulan(() => tulisLog(b.id, saya, "PYD", [`Memuat naik bukti "${nama}"`]));
    return { ok: true, bukti: r, versi: baru.versi };
  } catch (e) {
    return { ok: false, mesej: mesej(e, "Gagal mendaftar bukti.") };
  }
}

async function barisBukti(buktiId: string) {
  sahUuid(buktiId, "Bukti");
  const [r] = (await klienTulis().minta(`ekb_bukti?select=id,borang_id,sasaran_id,peringkat,nama,laluan&id=eq.${buktiId}&limit=1`)) as
    { id: string; borang_id: string; sasaran_id: string; peringkat: "p1" | "akhir"; nama: string; laluan: string }[];
  if (!r) throw new Error("Bukti tidak dijumpai.");
  return r;
}

/** Memulangkan `versi` baharu — pelayar mesti menggunakannya untuk simpanan seterusnya. */
export async function buangBukti(buktiId: string): Promise<Hasil<{ versi: number }>> {
  try {
    const r = await barisBukti(buktiId);
    const { saya, b } = await bolehBukti(r.borang_id, r.sasaran_id, r.peringkat);
    // Naikkan versi DAHULU: jika peringkat berubah sejak dibaca, berhenti.
    const baru = await tampal(b, b.versi, {});
    if (!baru) return { ok: false, mesej: KONFLIK, konflik: true };
    await klienTulis().minta(`ekb_bukti?id=eq.${r.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const { url, kepala } = tetapan();
    await susulan(async () => {
      const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${r.laluan}`, { method: "DELETE", headers: kepala });
      if (!res.ok && res.status !== 404) throw new Error(`fail bukti ${r.laluan} tidak terpadam (${res.status})`);
    });
    await susulan(() => tulisLog(b.id, saya, "PYD", [`Membuang bukti "${r.nama}"`]));
    return { ok: true, versi: baru.versi };
  } catch (e) {
    return { ok: false, mesej: mesej(e, "Gagal membuang bukti.") };
  }
}

/** Pautan baca bertandatangan, sah 10 minit. Bukti tidak pernah awam. */
export async function pautanBukti(buktiId: string): Promise<Hasil<{ url: string }>> {
  try {
    const r = await barisBukti(buktiId);
    await konteks(r.borang_id, true); // PYD, PP1, PP2, atau Pentadbir/Admin Mutlak (baca sahaja)
    const { url, kepala } = tetapan();
    const res = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${r.laluan}`, {
      method: "POST", headers: { ...kepala, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (!res.ok) return { ok: false, mesej: `Fail tidak dapat dibuka (${res.status}).` };
    const j = (await res.json()) as { signedURL?: string };
    if (!j.signedURL) return { ok: false, mesej: "Storan tidak memberi pautan." };
    return { ok: true, url: `${url}/storage/v1${j.signedURL}` };
  } catch (e) {
    return { ok: false, mesej: mesej(e, "Gagal membuka bukti.") };
  }
}

/* -------------------------------------------------------- tetapan PP --- */

async function calonPP(): Promise<CalonPP> {
  // Admin Mutlak hidup dalam env, bukan dalam DB — padankan ikut emel.
  const emel = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s",()]+@[^\s",()]+$/.test(e));
  const [pentadbir, mutlak, akp] = await Promise.all([
    bacaSemua<Orang>(`pbd_guru?select=id,nama&dibenarkan=eq.true&peranan=eq.pentadbir&order=nama.asc,id.asc`),
    emel.length
      ? bacaSemua<Orang & { email: string }>(`pbd_guru?select=id,nama,email&email=in.(${emel.map((e) => `"${encodeURIComponent(e)}"`).join(",")})&order=id.asc`)
      : Promise.resolve([] as (Orang & { email: string })[]),
    bacaSemua<Orang>(`pbd_guru?select=id,nama&dibenarkan=eq.true&peranan=in.(${PERANAN_AKP.join(",")})&order=nama.asc,id.asc`),
  ]);
  let ppAkp: Orang[] = [], ppAkpBelumSedia = false;
  try {
    const dilantik = new Set((await bacaSemua<{ guru_id: string }>("ekb_pp_akp?select=guru_id&order=guru_id.asc")).map((r) => r.guru_id));
    // Hanya yang MASIH kerani/AKP: orang yang bertukar peranan gugur sendiri.
    ppAkp = akp.filter((o) => dilantik.has(o.id));
  } catch (e) {
    if (!belumDipasang(e, "ekb_pp_akp")) throw e;
    ppAkpBelumSedia = true;
  }
  const semua = new Map<string, Orang>();
  for (const o of [...pentadbir, ...mutlak]) semua.set(o.id, { id: o.id, nama: namaBersih(o.nama) });
  return {
    pentadbir: [...semua.values()].sort((a, c) => a.nama.localeCompare(c.nama)),
    ppAkp: ppAkp.map((o) => ({ ...o, nama: namaBersih(o.nama) })),
    akp: akp.map((o) => ({ ...o, nama: namaBersih(o.nama) })), ppAkpBelumSedia,
    mutlakTiadaRekod: emel.filter((e) => !mutlak.some((m) => m.email?.toLowerCase() === e)).length,
  };
}

/** Lantik / gugurkan kerani atau AKP sebagai PP bagi rakan AKP (admin & pentadbir). */
export async function tetapPpAkp(input: { guruId: string; aktif: boolean }): Promise<Hasil> {
  try {
    const saya = await pengguna();
    if (!saya?.peranan || !lihatSemua(saya.peranan)) return { ok: false, mesej: "Hanya Pentadbir dan Admin Mutlak boleh menetapkan PP." };
    const guruId = sahUuid(input.guruId, "Kakitangan");
    const db = klienTulis();
    if (input.aktif) {
      const [g] = (await db.minta(`pbd_guru?select=peranan&id=eq.${guruId}&limit=1`)) as { peranan: string }[];
      if (!g || !PERANAN_AKP.includes(g.peranan)) return { ok: false, mesej: "Hanya kerani atau AKP boleh dilantik di sini. Pentadbir sudah menjadi PP secara automatik." };
      await db.minta("ekb_pp_akp?on_conflict=guru_id", {
        method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ guru_id: guruId }),
      });
    } else {
      await db.minta(`ekb_pp_akp?guru_id=eq.${guruId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      // Lata: orang yang digugurkan tidak kekal PP pada tahun semasa —
      // `konteks()` memberi kuasa ikut ekb_penilai, bukan ikut senarai ini.
      // Pentadbir/Admin Mutlak tidak terjejas kerana mereka tidak di sini.
      const tahun = tahunIni();
      for (const lajur of ["pp1_id", "pp2_id"]) {
        await db.minta(`ekb_penilai?tahun=eq.${tahun}&${lajur}=eq.${guruId}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ [lajur]: null, dikemas: new Date().toISOString() }),
        });
      }
    }
    revalidatePath("/keberhasilan");
    return { ok: true };
  } catch (e) {
    if (belumDipasang(e, "ekb_pp_akp")) return { ok: false, mesej: "Admin perlu jalankan SQL `20261023_keberhasilan_pp_akp.sql` sekali." };
    return { ok: false, mesej: mesej(e, "Gagal menyimpan.") };
  }
}

/** Tetapkan PP1/PP2 bagi seorang PYD (pentadbir & admin). Null = kosongkan. */
export async function tetapPenilai(input: { pydId: string; pp1Id: string | null; pp2Id: string | null }): Promise<Hasil> {
  try {
    const saya = await pengguna();
    if (!saya?.peranan || !lihatSemua(saya.peranan)) return { ok: false, mesej: "Hanya Pentadbir dan Admin Mutlak boleh menetapkan PP." };
    const pydId = sahUuid(input.pydId, "PYD");
    const pp1 = input.pp1Id ? sahUuid(input.pp1Id, "PP1") : null;
    const pp2 = input.pp2Id ? sahUuid(input.pp2Id, "PP2") : null;
    if (pp1 === pydId || pp2 === pydId) return { ok: false, mesej: "PYD tidak boleh menilai diri sendiri." };
    if (pp1 && pp1 === pp2) return { ok: false, mesej: "PP1 dan PP2 mestilah orang berbeza." };
    // PP mesti daripada senarai calon — dropdown hanya cermin, ini pagarnya.
    const [g0] = (await klienTulis().minta(`pbd_guru?select=nama,peranan&id=eq.${pydId}&limit=1`)) as { nama: string; peranan: string }[];
    if (!g0) return { ok: false, mesej: "PYD tidak dijumpai." };
    const pydAkp = PERANAN_AKP.includes(g0.peranan);
    const [calon, [kini]] = await Promise.all([
      calonPP(),
      klienTulis().minta(`ekb_penilai?select=pp1_id,pp2_id&tahun=eq.${tahunIni()}&pyd_id=eq.${pydId}&limit=1`) as Promise<{ pp1_id: string | null; pp2_id: string | null }[]>,
    ]);
    const sah = new Set([...calon.pentadbir, ...(pydAkp ? calon.ppAkp : [])].map((o) => o.id));
    // PP sedia ada yang TIDAK berubah dibenarkan kekal (cth. ditetapkan sebelum
    // kolam wujud) — admin tidak perlu mengosongkannya untuk menukar yang lain.
    const bolehPilih = (id: string | null, lama: string | null | undefined) => !id || sah.has(id) || id === lama;
    if (!bolehPilih(pp1, kini?.pp1_id) || !bolehPilih(pp2, kini?.pp2_id)) {
      return { ok: false, mesej: pydAkp ? "PP mesti Pentadbir, Admin Mutlak, atau kerani/AKP yang dilantik sebagai PP." : "PP mesti Pentadbir atau Admin Mutlak." };
    }
    const tahun = tahunIni();
    await klienTulis().minta("ekb_penilai?on_conflict=tahun,pyd_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ tahun, pyd_id: pydId, pp1_id: pp1, pp2_id: pp2, dikemas: new Date().toISOString() }),
    });
    // Borang PYD itu dicipta sekarang supaya ia muncul di Pantau PP walaupun
    // PYD belum pernah membuka modul ini.
    const g = g0;
    await klienTulis().minta("ekb_borang?on_conflict=tahun,pyd_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        tahun, pyd_id: pydId,
        pyd: { nama: namaBersih(g?.nama ?? "").toUpperCase(), kp: "", gred: "", jawatan: "", tempat: TEMPAT },
        bidang: susunBidangTetap([]),
        peringkat: peringkatKosong(),
      }),
    });
    revalidatePath("/keberhasilan");
    return { ok: true };
  } catch (e) {
    if (belumDipasang(e, "ekb_penilai", "ekb_borang")) return { ok: false, mesej: MESEJ_BELUM };
    return { ok: false, mesej: mesej(e, "Gagal menyimpan penilai.") };
  }
}

