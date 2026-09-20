"use server";

import { bacaSemua } from "./baca-semua";
import { tahunSesiAktif } from "./sesi-aktif";
import { revalidatePath } from "next/cache";
import { pengguna, bolehBuat } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { belumDipasang } from "./db-belum-sedia";
import { hantar } from "./notifikasi";

/**
 * Rekod Kawalan Kelas & Kehadiran (permintaan pengguna G) — kad baharu.
 *
 * G.1: guru merekod SIAPA masuk kelas, subjek, relief/ganti, masalah
 * disiplin dalam kelas, masa masuk.
 * G.2: nama kelas, tarikh, nama guru kelas SEMASA (`emelGuruKelas`/
 * `senaraiGuruKelas` dari `guru-kelas.ts` — bukan diulang di sini).
 * G.3: carta kehadiran harian ikut kelas — dikira dari `bil_hadir`/
 * `bil_murid` yang guru isi sendiri pada setiap rekod, BUKAN senarai
 * kehadiran satu-satu setiap murid setiap hari. Laporan & Amaran PK HEM
 * sengaja TIDAK dibina — permintaan pengguna eksplisit: "ia dah ada di
 * DELIMa, tak perlu buat 2 kali kerja".
 *
 * BACAAN DIBUKA kepada semua guru log masuk — ini log BERSAMA
 * ("kebersamaan dengan para guru"), bukan rekod sulit seperti Disiplin.
 */

export interface BarisKawalanKelas {
  id: string;
  guru_id: string | null;
  tahun_sesi: number;
  tarikh: string;
  kelas: string;
  guru_nama: string;
  subjek: string;
  masa_masuk: string | null;
  relief: boolean;
  guru_relief_untuk: string | null;
  masalah_disiplin: string | null;
  bil_hadir: number | null;
  bil_murid: number | null;
  dicipta: string;
  boleh_urus?: boolean;
}

export type HasilKawalanKelas = { ok: boolean; mesej: string };

export async function hantarKawalanKelas(input: {
  tahun_sesi: number; tarikh: string; kelas: string; subjek: string;
  masa_masuk?: string; relief?: boolean; guru_relief_untuk?: string;
  masalah_disiplin?: string; bil_hadir?: number; bil_murid?: number;
}): Promise<HasilKawalanKelas> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };

  const kelas = input.kelas.trim();
  const subjek = input.subjek.trim();
  if (!kelas) return { ok: false, mesej: "Kelas diperlukan." };
  if (!subjek) return { ok: false, mesej: "Subjek diperlukan." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarikh)) return { ok: false, mesej: "Tarikh tidak sah." };

  const db = klienTulis();
  try {
    if (input.tahun_sesi !== await tahunSesiAktif()) return { ok: false, mesej: "Pilih sesi aktif." };
    if (input.bil_hadir != null && (!Number.isInteger(input.bil_hadir) || input.bil_hadir < 0 || input.bil_murid == null || input.bil_hadir > input.bil_murid))
      return { ok: false, mesej: "Bilangan hadir mesti antara sifar dan jumlah murid." };
    if (input.bil_murid != null && (!Number.isInteger(input.bil_murid) || input.bil_murid < 1 || input.bil_murid > 200))
      return { ok: false, mesej: "Jumlah murid tidak sah." };
    await db.minta("pbd_kawalan_kelas", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        tahun_sesi: input.tahun_sesi, tarikh: input.tarikh, kelas, subjek,
        guru_id: saya.id, guru_nama: saya.nama ?? saya.emel,
        masa_masuk: input.masa_masuk?.trim() || null,
        relief: input.relief ?? false,
        guru_relief_untuk: input.relief ? (input.guru_relief_untuk?.trim() || null) : null,
        masalah_disiplin: input.masalah_disiplin?.trim() || null,
        bil_hadir: input.bil_hadir ?? null,
        bil_murid: input.bil_murid ?? null,
      }),
    });
  } catch (e) {
    if (belumDipasang(e, "pbd_kawalan_kelas")) {
      return { ok: false, mesej: "Ciri ini belum dipasang — admin perlu jalankan SQL Kawalan Kelas dahulu." };
    }
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal merekod." };
  }

  await hantar({
    penerima: [],
    tugasan: [
      { peranan: "guru_kelas", skop: kelas },
      ...(input.masalah_disiplin?.trim() ? [{ peranan: "guru_disiplin" as const }] : []),
    ],
    jenis: "pbd",
    tajuk: `Kawalan kelas · ${kelas}`,
    teks: `${saya.nama ?? saya.emel} merekod ${subjek} pada ${input.tarikh}` +
      (input.masalah_disiplin?.trim() ? " · ada catatan disiplin." : "."),
    pautan: "/kawalan-kelas", oleh: saya.emel,
  });
  revalidatePath("/kawalan-kelas");
  return { ok: true, mesej: "Rekod disimpan." };
}

export async function senaraiKawalanKelas(
  tahun_sesi: number, hari: number = 30,
): Promise<{ belumSedia: boolean; senarai: BarisKawalanKelas[] }> {
  const saya = await pengguna();
  if (!saya?.peranan) return { belumSedia: false, senarai: [] };

  const sejak = new Date();
  sejak.setDate(sejak.getDate() - hari);
  const sejakIso = sejak.toISOString().slice(0, 10);

  try {
    const senarai = (await bacaSemua<BarisKawalanKelas>(
      `pbd_kawalan_kelas?select=id,guru_id,tahun_sesi,tarikh,kelas,guru_nama,subjek,masa_masuk,relief,` +
        `guru_relief_untuk,masalah_disiplin,bil_hadir,bil_murid,dicipta` +
        `&tahun_sesi=eq.${tahun_sesi}&tarikh=gte.${sejakIso}&order=tarikh.desc,dicipta.desc,id.asc`,
    )) as BarisKawalanKelas[];
    const urusSemua = await bolehBuat("urus_guru_kelas");
    return { belumSedia: false, senarai: senarai.map((b) => ({ ...b, boleh_urus: urusSemua || b.guru_id === saya.id })) };
  } catch (e) {
    if (belumDipasang(e, "pbd_kawalan_kelas")) return { belumSedia: true, senarai: [] };
    throw e;
  }
}

async function bolehUrusRekod(id: string) {
  const saya = await pengguna();
  if (!saya?.peranan || !/^[0-9a-f-]{36}$/i.test(id)) return false;
  if (await bolehBuat("urus_guru_kelas")) return true;
  if (!saya.id) return false;
  const baris = (await klienTulis().minta(
    `pbd_kawalan_kelas?select=guru_id&id=eq.${encodeURIComponent(id)}&limit=1`,
  )) as { guru_id: string | null }[];
  return baris[0]?.guru_id === saya.id;
}

export async function suntingKawalanKelas(id: string, input: {
  tahun_sesi: number; tarikh: string; kelas: string; subjek: string;
  masa_masuk?: string; relief?: boolean; guru_relief_untuk?: string;
  masalah_disiplin?: string; bil_hadir?: number; bil_murid?: number;
}): Promise<HasilKawalanKelas> {
  if (!(await bolehUrusRekod(id))) return { ok: false, mesej: "Rekod ini tidak boleh disunting." };
  const kelas = input.kelas.trim();
  const subjek = input.subjek.trim();
  if (!kelas || !subjek || !/^\d{4}-\d{2}-\d{2}$/.test(input.tarikh)) return { ok: false, mesej: "Lengkapkan tarikh, kelas dan subjek." };
  if (input.tahun_sesi !== await tahunSesiAktif()) return { ok: false, mesej: "Pilih sesi aktif." };
  if (input.bil_murid != null && (!Number.isInteger(input.bil_murid) || input.bil_murid < 1 || input.bil_murid > 200)) return { ok: false, mesej: "Jumlah murid tidak sah." };
  if (input.bil_hadir != null && (!Number.isInteger(input.bil_hadir) || input.bil_hadir < 0 || input.bil_murid == null || input.bil_hadir > input.bil_murid)) return { ok: false, mesej: "Bilangan hadir mesti antara sifar dan jumlah murid." };
  try {
    await klienTulis().minta(`pbd_kawalan_kelas?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        tarikh: input.tarikh, kelas, subjek, masa_masuk: input.masa_masuk?.trim() || null,
        relief: input.relief ?? false, guru_relief_untuk: input.relief ? input.guru_relief_untuk?.trim() || null : null,
        masalah_disiplin: input.masalah_disiplin?.trim() || null,
        bil_hadir: input.bil_hadir ?? null, bil_murid: input.bil_murid ?? null,
      }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyunting." };
  }
  revalidatePath("/kawalan-kelas");
  return { ok: true, mesej: "Rekod dikemas kini." };
}

export async function padamKawalanKelas(id: string): Promise<HasilKawalanKelas> {
  if (!(await bolehUrusRekod(id))) return { ok: false, mesej: "Rekod ini tidak boleh dipadam." };
  try {
    await klienTulis().minta(`pbd_kawalan_kelas?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal memadam." };
  }
  revalidatePath("/kawalan-kelas");
  return { ok: true, mesej: "Rekod dipadam." };
}
