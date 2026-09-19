"use server";

import { bacaSemua } from "./baca-semua";
import { tahunSesiAktif } from "./sesi-aktif";
import { revalidatePath } from "next/cache";
import { pengguna, bolehBuat } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { sayaBertugas } from "./tugasan";
import { belumDipasang } from "./db-belum-sedia";
import { bacaSenaraiMurid } from "./kenal-murid";

/**
 * Rancangan Makanan Tambahan (RMT) — permintaan pengguna E.
 *
 * E.2: Guru RMT muat naik senarai murid RMT — DIBACA guna `kenal-murid.ts`
 * yang SAMA dengan import Buku Pengurusan (satu penghurai, bukan dua kali
 * kerja). Nama dipadankan dengan `pbd_murid` melalui No. KP supaya nama
 * murid ini SAMA rujukan seperti PBD, kad Guru Kelas, dsb. (permintaan J).
 *
 * E.3: Kehadiran RMT direkod secara PUKAL untuk satu tarikh, dan dibuka
 * kepada SEMUA guru log masuk — permintaan pengguna eksplisit "buat saja
 * umum untuk pengisian para guru", bukan dikunci kepada guru bertugas
 * mingguan (kad guru bertugas mingguan sengaja TIDAK dibina — sudah ada
 * di takwim).
 */

export interface MuridRmt {
  id: string;
  tahun: number;
  kelas: string;
  nama: string;
  no_kp: string | null;
  aktif: boolean;
}

export type HasilRmt = { ok: boolean; mesej: string; diproses?: number; ditolak?: string[]; semakan?: { nama: string; no_kp: string | null }[] };

async function bolehUrusRoster(): Promise<boolean> {
  return (await sayaBertugas("guru_rmt")) || (await bolehBuat("urus_guru_kelas"));
}

/**
 * Muat naik senarai murid RMT bagi satu kelas — TAMBAH sahaja, tidak
 * memadam senarai sedia ada (guru RMT muat naik kelas demi kelas).
 */
export async function naikRosterRmt(
  tahun_sesi: number, tahun: number, kelas: string, teks: string, simpan = false,
): Promise<HasilRmt> {
  if (!(await bolehUrusRoster())) return { ok: false, mesej: "Tiada kebenaran." };
  const { murid, ditolak } = bacaSenaraiMurid(teks);
  if (murid.length === 0) return { ok: false, mesej: "Tiada nama dikesan dalam teks ini.", ditolak };

  const db = klienTulis();
  const kpSah = murid.map((m) => m.no_kp).filter((k): k is string => !!k);
  const sepadan = new Map<string, string>();
  try {
    if (kpSah.length > 0) {
      const senarai = kpSah.map((k) => `"${k}"`).join(",");
      const baris = (await db.minta(`pbd_murid?select=id,no_kp&no_kp=in.(${senarai})`)) as
        { id: string; no_kp: string }[];
      for (const b of baris) sepadan.set(b.no_kp, b.id);
    }

    if (tahun_sesi !== await tahunSesiAktif()) return { ok: false, mesej: "Pilih sesi aktif." };
    if (!Number.isInteger(tahun) || tahun < 0 || tahun > 6 || !kelas.trim()) return { ok: false, mesej: "Kelas tidak sah." };
    const hilang = murid.filter((m) => !m.no_kp || !sepadan.has(m.no_kp));
    if (hilang.length) return { ok: false, mesej: `${hilang.length} murid belum dipadankan dengan daftar ePBD. Lengkapkan No. KP dan daftar murid dahulu.`, semakan: murid };
    if (!simpan) return { ok: true, mesej: `${murid.length} murid dipadankan. Semak sebelum simpan; tiada data ditulis.`, semakan: murid };
    await db.minta("pbd_rmt_murid?on_conflict=tahun_sesi,murid_id", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(murid.map((m) => ({ tahun_sesi, tahun, kelas,
        nama: m.nama, no_kp: m.no_kp, murid_id: sepadan.get(m.no_kp!), aktif: true }))),
    });
  } catch (e) {
    if (belumDipasang(e, "pbd_rmt_murid")) {
      return { ok: false, mesej: "Ciri ini belum dipasang — admin perlu jalankan SQL RMT dahulu." };
    }
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." };
  }

  revalidatePath("/rmt");
  return { ok: true, mesej: `${murid.length} murid ditambah ke senarai RMT.`, diproses: murid.length, ditolak };
}

export async function senaraiRosterRmt(
  tahun_sesi: number,
): Promise<{ belumSedia: boolean; boleh: boolean; senarai: MuridRmt[] }> {
  const boleh = (await bolehUrusRoster()) || Boolean((await pengguna())?.peranan);
  if (!boleh) return { belumSedia: false, boleh: false, senarai: [] };

  const db = klienTulis();
  try {
    const senarai = (await bacaSemua<MuridRmt>(
      `pbd_rmt_murid?select=id,tahun,kelas,nama,no_kp,aktif&tahun_sesi=eq.${tahun_sesi}` +
        `&aktif=eq.true&order=tahun.asc,kelas.asc,nama.asc,id.asc`,
    )) as MuridRmt[];
    return { belumSedia: false, boleh: true, senarai };
  } catch (e) {
    if (belumDipasang(e, "pbd_rmt_murid")) return { belumSedia: true, boleh: true, senarai: [] };
    throw e;
  }
}

export async function buangRosterRmt(id: string): Promise<HasilRmt> {
  if (!(await bolehUrusRoster())) return { ok: false, mesej: "Tiada kebenaran." };
  const db = klienTulis();
  try {
    await db.minta(`pbd_rmt_murid?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ aktif: false }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal membuang." };
  }
  revalidatePath("/rmt");
  return { ok: true, mesej: "Dibuang dari senarai." };
}

/** Kehadiran RMT sedia ada bagi SATU tarikh — untuk borang tanda pukal. */
export async function hadirRmtTarikh(
  tahun_sesi: number, tarikh: string,
): Promise<{ belumSedia: boolean; hadir: Record<string, boolean> }> {
  const saya = await pengguna();
  if (!saya?.peranan) throw new Error("Tiada kebenaran.");
  if (!Number.isInteger(tahun_sesi) || !/^\d{4}-\d{2}-\d{2}$/.test(tarikh)) {
    throw new Error("Tarikh atau sesi tidak sah.");
  }
  const db = klienTulis();
  try {
    const baris = (await bacaSemua<{ rmt_murid_id: string; hadir: boolean }>(
      `pbd_rmt_kehadiran?select=rmt_murid_id,hadir&tahun_sesi=eq.${tahun_sesi}&tarikh=eq.${tarikh}&order=rmt_murid_id.asc`,
    )) as { rmt_murid_id: string; hadir: boolean }[];
    const hadir: Record<string, boolean> = {};
    for (const b of baris) hadir[b.rmt_murid_id] = b.hadir;
    return { belumSedia: false, hadir };
  } catch (e) {
    if (belumDipasang(e, "pbd_rmt_kehadiran")) return { belumSedia: true, hadir: {} };
    throw e;
  }
}

/**
 * Simpan kehadiran RMT PUKAL bagi satu tarikh — dibuka kepada SEMUA guru
 * log masuk (permintaan E.3).
 */
export async function simpanHadirRmt(
  tahun_sesi: number, tarikh: string, hadir: Record<string, boolean>,
): Promise<HasilRmt> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarikh)) return { ok: false, mesej: "Tarikh tidak sah." };

  const db = klienTulis();
  try {
    if (tahun_sesi !== await tahunSesiAktif()) return { ok: false, mesej: "Pilih sesi aktif." };
    const items = Object.entries(hadir);
    if (!items.length || items.length > 3000 || items.some(([id, ada]) => !/^[0-9a-f-]{36}$/i.test(id) || typeof ada !== "boolean"))
      return { ok: false, mesej: "Senarai kehadiran tidak sah." };
    const roster = new Set((await senaraiRosterRmt(tahun_sesi)).senarai.map((m) => m.id));
    if (items.some(([id]) => !roster.has(id))) return { ok: false, mesej: "Senarai murid berubah. Muat semula sebelum menyimpan." };
    await db.minta("pbd_rmt_kehadiran?on_conflict=tarikh,rmt_murid_id", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(items.map(([rmt_murid_id, ada]) => ({ tahun_sesi, tarikh, rmt_murid_id, hadir: ada, guru_id: saya.id }))),
    });
  } catch (e) {
    if (belumDipasang(e, "pbd_rmt_kehadiran")) {
      return { ok: false, mesej: "Ciri ini belum dipasang — admin perlu jalankan SQL RMT dahulu." };
    }
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/rmt");
  return { ok: true, mesej: "Kehadiran RMT disimpan." };
}
