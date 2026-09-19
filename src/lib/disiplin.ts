"use server";

import { bacaSemua } from "./baca-semua";
import { senaraiMuridCadangan } from "./murid-cadangan";
import { tahunSesiAktif } from "./sesi-aktif";
import { revalidatePath } from "next/cache";
import { pengguna, bolehBuat } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { sayaBertugas } from "./tugasan";
import { belumDipasang } from "./db-belum-sedia";

/**
 * Disiplin & Sahsiah (permintaan pengguna F).
 *
 * AKSES TERHAD — permintaan F.2/F.3, bukan andaian kami: SEMUA guru boleh
 * MEREKOD (kad kekal kelihatan di hab supaya guru tidak keliru kenapa "kad
 * hilang"), tetapi hanya Guru Disiplin (`tugasan.ts`, jenis "guru_disiplin"),
 * pentadbir & admin boleh MEMBACA senarai. Guru biasa yang menghantar rekod
 * TIDAK dapat menyemak senarai selepas itu — itu bukan pepijat, itu dasar
 * capaian F.3 secara literal ("bukan semua guru boleh membaca semua rekod").
 *
 * "PEMANTAUAN KES BERULANG" (F.4) dikira dari jadual yang sama — tiada
 * jadual berasingan, kerana ia hanya kiraan baris sedia ada ikut nama murid.
 */

export interface BarisDisiplin {
  id: string;
  tahun_sesi: number;
  tarikh: string;
  murid_id?: string | null;
  murid_nama: string;
  kelas: string;
  kesalahan: string;
  tindakan: string;
  saksi: string | null;
  guru_nama: string;
  laporan_lembaga: boolean;
  rujukan_kami: string | null;
  dicipta: string;
}

export type HasilDisiplin = { ok: boolean; mesej: string };

async function bolehBaca(): Promise<boolean> {
  return (await bolehBuat("urus_disiplin")) || (await sayaBertugas("guru_disiplin"));
}

export async function hantarDisiplin(input: {
  tahun_sesi: number; tarikh: string; murid_nama: string; kelas: string;
  kesalahan: string; tindakan: string; saksi?: string;
}): Promise<HasilDisiplin> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };

  const murid_nama = input.murid_nama.trim();
  const kelas = input.kelas.trim();
  const kesalahan = input.kesalahan.trim();
  const tindakan = input.tindakan.trim();
  if (!murid_nama) return { ok: false, mesej: "Nama murid diperlukan." };
  if (!kelas) return { ok: false, mesej: "Kelas diperlukan." };
  if (!kesalahan) return { ok: false, mesej: "Butiran salah laku diperlukan." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarikh)) return { ok: false, mesej: "Tarikh tidak sah." };

  const db = klienTulis();
  try {
    if (input.tahun_sesi !== await tahunSesiAktif()) return { ok: false, mesej: "Pilih sesi aktif." };
    const padan = (await senaraiMuridCadangan(input.tahun_sesi)).filter((m) => m.nama.toUpperCase() === murid_nama.toUpperCase() && m.kelas === kelas);
    if (padan.length > 1) return { ok: false, mesej: "Nama sama dalam kelas ini. Semak identiti murid dengan pentadbir dahulu." };
    await db.minta("pbd_disiplin", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        tahun_sesi: input.tahun_sesi,
        tarikh: input.tarikh,
        murid_id: padan[0]?.id ?? null, murid_nama, kelas, kesalahan, tindakan,
        saksi: input.saksi?.trim() || null,
        guru_id: saya.id,
        guru_nama: saya.nama ?? saya.emel,
      }),
    });
  } catch (e) {
    if (belumDipasang(e, "pbd_disiplin")) {
      return { ok: false, mesej: "Ciri ini belum dipasang — admin perlu jalankan SQL Disiplin dahulu." };
    }
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal merekod." };
  }

  revalidatePath("/disiplin");
  return { ok: true, mesej: "Rekod disimpan." };
}

/** Senarai penuh — HANYA Guru Disiplin, pentadbir & admin (lihat nota fail). */
export async function senaraiDisiplin(
  tahun_sesi: number,
): Promise<{ belumSedia: boolean; boleh: boolean; senarai: BarisDisiplin[]; berulang: string[] }> {
  if (!(await bolehBaca())) return { belumSedia: false, boleh: false, senarai: [], berulang: [] };

  const db = klienTulis();
  try {
    const senarai = (await bacaSemua<BarisDisiplin>(
      `pbd_disiplin?select=id,murid_id,tahun_sesi,tarikh,murid_nama,kelas,kesalahan,tindakan,saksi,guru_nama,` +
        `laporan_lembaga,rujukan_kami,dicipta&tahun_sesi=eq.${tahun_sesi}&order=tarikh.desc,id.asc`,
    )) as BarisDisiplin[];

    // Kes berulang: nama murid yang muncul >= 2 kali TAHUN INI.
    const kira = new Map<string, number>();
    const kunci = (b: BarisDisiplin) => b.murid_id ?? `${b.kelas}:${b.murid_nama.toUpperCase()}`;
    for (const b of senarai) kira.set(kunci(b), (kira.get(kunci(b)) ?? 0) + 1);
    const berulang = [...new Set(senarai.filter((b) => (kira.get(kunci(b)) ?? 0) >= 2).map((b) => `${b.murid_nama} (${b.kelas})`))];

    return { belumSedia: false, boleh: true, senarai, berulang };
  } catch (e) {
    if (belumDipasang(e, "pbd_disiplin")) return { belumSedia: true, boleh: true, senarai: [], berulang: [] };
    throw e;
  }
}

/**
 * Tandakan rekod untuk Laporan Lembaga Disiplin (format A/2, permintaan F.4).
 *
 * Nombor rujukan kami ialah PILIHAN ("tick sahaja") — F.4 sengaja
 * melangkau kerani; hanya diisi bila pihak disiplin/pentadbir rasa perlu.
 */
export async function tandaLaporanLembaga(
  id: string, laporan_lembaga: boolean, rujukan_kami?: string,
): Promise<HasilDisiplin> {
  if (!(await bolehBaca())) return { ok: false, mesej: "Tiada kebenaran." };

  const db = klienTulis();
  try {
    const badan: Record<string, unknown> = { laporan_lembaga };
    if (rujukan_kami !== undefined) badan.rujukan_kami = rujukan_kami.trim() || null;
    await db.minta(`pbd_disiplin?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(badan),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/disiplin");
  return { ok: true, mesej: "Dikemas kini." };
}
