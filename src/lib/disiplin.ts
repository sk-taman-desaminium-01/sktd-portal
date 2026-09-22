"use server";

import { bacaSemua } from "./baca-semua";
import { senaraiMuridCadangan } from "./murid-cadangan";
import { tahunSesiAktif } from "./sesi-aktif";
import { revalidatePath } from "next/cache";
import { pengguna, bolehBuat } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { sayaBertugas } from "./tugasan";
import { belumDipasang } from "./db-belum-sedia";
import { hantar } from "./notifikasi";
import { kelasBolehSunting } from "./guru-kelas";
import { sahInt } from "./sah";

/**
 * Disiplin & Sahsiah (permintaan pengguna F).
 *
 * AKSES TERHAD — permintaan F.2/F.3, bukan andaian kami: SEMUA guru boleh
 * MEREKOD (kad kekal kelihatan di hab supaya guru tidak keliru kenapa "kad
 * hilang"), tetapi hanya Guru Disiplin (`tugasan.ts`, jenis "guru_disiplin"),
 * pentadbir & admin boleh MEMBACA semua rekod. Guru biasa boleh menyemak,
 * menyunting dan memadam rekod yang mereka sendiri hantar sahaja. Guru kelas
 * mendapat paparan baca sahaja untuk murid kelasnya pada kad Guru Kelas.
 *
 * "PEMANTAUAN KES BERULANG" (F.4) dikira dari jadual yang sama — tiada
 * jadual berasingan, kerana ia hanya kiraan baris sedia ada ikut nama murid.
 */

export interface BarisDisiplin {
  id: string;
  guru_id?: string | null;
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

async function bolehBacaSemua(): Promise<boolean> {
  return (await bolehBuat("urus_disiplin")) || (await sayaBertugas("guru_disiplin"));
}

const LAJUR_DISIPLIN = "id,guru_id,murid_id,tahun_sesi,tarikh,murid_nama,kelas,kesalahan,tindakan,saksi,guru_nama,laporan_lembaga,rujukan_kami,dicipta";

function ringkasBerulang(senarai: BarisDisiplin[]): string[] {
  const kira = new Map<string, number>();
  const kunci = (b: BarisDisiplin) => b.murid_id ?? `${b.kelas}:${b.murid_nama.toUpperCase()}`;
  for (const b of senarai) kira.set(kunci(b), (kira.get(kunci(b)) ?? 0) + 1);
  return [...new Set(senarai
    .filter((b) => (kira.get(kunci(b)) ?? 0) >= 2)
    .map((b) => `${b.murid_nama} (${b.kelas})`))];
}

async function bolehUbahRekod(id: string): Promise<boolean> {
  const saya = await pengguna();
  if (!saya?.peranan || !/^[0-9a-f-]{36}$/i.test(id)) return false;
  if (await bolehBacaSemua()) return true;
  if (!saya.id) return false;
  const rows = (await klienTulis().minta(
    `pbd_disiplin?select=guru_id&id=eq.${encodeURIComponent(id)}&limit=1`,
  )) as { guru_id: string | null }[];
  return rows[0]?.guru_id === saya.id;
}

/**
 * Skema awal yang disalin ke Supabase pernah mencipta `pbd_disiplin` tanpa
 * `murid_id`, sedangkan modul ini menggunakannya untuk mengira kes berulang
 * dengan tepat. PostgREST membalas PGRST204 (atau 42703 pada versi tertentu),
 * bukannya 404; oleh itu ia perlu dikesan berasingan daripada jadual tiada.
 */
function skemaDisiplinBelumLengkap(e: unknown): boolean {
  if (belumDipasang(e, "pbd_disiplin")) return true;
  const teks = e instanceof Error ? e.message : String(e);
  return /(?:PGRST204|42703).*(?:murid_id|pbd_disiplin)|(?:murid_id).*pbd_disiplin/i.test(teks);
}

const MESEJ_SKEMA = "Modul Disiplin belum lengkap — admin perlu jalankan patch SQL Disiplin (murid_id dan tugasan) di hujung laporan ini.";

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
    if (skemaDisiplinBelumLengkap(e)) {
      return { ok: false, mesej: MESEJ_SKEMA };
    }
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal merekod." };
  }

  await hantar({
    penerima: [],
    tugasan: [{ peranan: "guru_disiplin" }, { peranan: "guru_kelas", skop: kelas }],
    jenis: "pbd",
    tajuk: `Rekod disiplin · ${kelas}`,
    teks: `${saya.nama ?? saya.emel} merekod kes ${murid_nama}: ${kesalahan}.`,
    pautan: "/disiplin", oleh: saya.emel,
  });
  revalidatePath("/disiplin");
  return { ok: true, mesej: "Rekod disimpan." };
}

/** Senarai penuh untuk pihak berkuasa; pelapor biasa menerima rekod sendiri sahaja. */
export async function senaraiDisiplin(
  tahun_sesi: number,
): Promise<{ belumSedia: boolean; boleh: boolean; urusSemua: boolean; senarai: BarisDisiplin[]; berulang: string[] }> {
  sahInt(tahun_sesi, "sesi", 2000, 2100);
  const saya = await pengguna();
  if (!saya?.peranan) return { belumSedia: false, boleh: false, urusSemua: false, senarai: [], berulang: [] };
  const urusSemua = await bolehBacaSemua();
  if (!urusSemua && !saya.id) return { belumSedia: false, boleh: true, urusSemua: false, senarai: [], berulang: [] };

  try {
    const senarai = (await bacaSemua<BarisDisiplin>(
      `pbd_disiplin?select=${LAJUR_DISIPLIN}&tahun_sesi=eq.${tahun_sesi}` +
        `${urusSemua ? "" : `&guru_id=eq.${saya.id}`}&order=tarikh.desc,id.asc`,
    )) as BarisDisiplin[];
    return { belumSedia: false, boleh: true, urusSemua, senarai, berulang: ringkasBerulang(senarai) };
  } catch (e) {
    if (skemaDisiplinBelumLengkap(e)) return { belumSedia: true, boleh: true, urusSemua, senarai: [], berulang: [] };
    throw e;
  }
}

/** Paparan baca sahaja pada kad Guru Kelas: kelas sendiri sahaja; pentadbir melihat semua. */
export async function senaraiDisiplinKelas(
  tahun_sesi: number, kelasDiminta: string[],
): Promise<{ belumSedia: boolean; senarai: BarisDisiplin[] }> {
  sahInt(tahun_sesi, "sesi", 2000, 2100);
  const skop = await kelasBolehSunting();
  const diminta = new Set(kelasDiminta.map((k) => k.trim().toUpperCase()).filter(Boolean));
  const kelas = skop === null
    ? null
    : skop.map((k) => k.toUpperCase()).filter((k) => diminta.has(k));
  if (kelas?.length === 0) return { belumSedia: false, senarai: [] };
  try {
    const asas = `pbd_disiplin?select=${LAJUR_DISIPLIN}&tahun_sesi=eq.${tahun_sesi}`;
    const senarai = kelas === null
      ? await bacaSemua<BarisDisiplin>(`${asas}&order=tarikh.desc,id.asc`)
      : (await Promise.all(kelas.map((k) =>
          bacaSemua<BarisDisiplin>(`${asas}&kelas=eq.${encodeURIComponent(k)}&order=tarikh.desc,id.asc`),
        ))).flat();
    return { belumSedia: false, senarai: senarai.sort((a, b) => b.tarikh.localeCompare(a.tarikh)) };
  } catch (e) {
    if (skemaDisiplinBelumLengkap(e)) return { belumSedia: true, senarai: [] };
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
  if (!(await bolehBacaSemua())) return { ok: false, mesej: "Tiada kebenaran." };

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
    if (skemaDisiplinBelumLengkap(e)) return { ok: false, mesej: MESEJ_SKEMA };
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/disiplin");
  return { ok: true, mesej: "Dikemas kini." };
}

/** Pelapor membetulkan rekod sendiri; Guru Disiplin/pentadbir/admin boleh membetulkan semua. */
export async function suntingDisiplin(id: string, input: {
  tahun_sesi: number; tarikh: string; murid_nama: string; kelas: string;
  kesalahan: string; tindakan: string; saksi?: string;
}): Promise<HasilDisiplin> {
  if (!(await bolehUbahRekod(id))) return { ok: false, mesej: "Rekod ini tidak boleh disunting." };
  const murid_nama = input.murid_nama.trim();
  const kelas = input.kelas.trim();
  const kesalahan = input.kesalahan.trim();
  const tindakan = input.tindakan.trim();
  if (!murid_nama || !kelas || !kesalahan || !/^\d{4}-\d{2}-\d{2}$/.test(input.tarikh)) {
    return { ok: false, mesej: "Lengkapkan tarikh, nama murid, kelas dan butiran salah laku." };
  }
  if (input.tahun_sesi !== await tahunSesiAktif()) return { ok: false, mesej: "Pilih sesi aktif." };

  try {
    const padan = (await senaraiMuridCadangan(input.tahun_sesi))
      .filter((m) => m.nama.toUpperCase() === murid_nama.toUpperCase() && m.kelas === kelas);
    if (padan.length > 1) return { ok: false, mesej: "Nama sama dalam kelas ini. Semak identiti murid dahulu." };
    await klienTulis().minta(`pbd_disiplin?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        tarikh: input.tarikh, murid_id: padan[0]?.id ?? null, murid_nama, kelas,
        kesalahan, tindakan, saksi: input.saksi?.trim() || null,
      }),
    });
  } catch (e) {
    if (skemaDisiplinBelumLengkap(e)) return { ok: false, mesej: MESEJ_SKEMA };
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyunting." };
  }
  revalidatePath("/disiplin");
  return { ok: true, mesej: "Rekod disiplin dikemas kini." };
}

/** Pelapor boleh memadam rekod sendiri; pihak disiplin/pentadbir boleh memadam semua. */
export async function padamDisiplin(id: string): Promise<HasilDisiplin> {
  if (!(await bolehUbahRekod(id))) return { ok: false, mesej: "Rekod ini tidak boleh dipadam." };
  try {
    await klienTulis().minta(`pbd_disiplin?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE", headers: { Prefer: "return=minimal" },
    });
  } catch (e) {
    if (skemaDisiplinBelumLengkap(e)) return { ok: false, mesej: MESEJ_SKEMA };
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal memadam." };
  }
  revalidatePath("/disiplin");
  return { ok: true, mesej: "Rekod disiplin dipadam." };
}
