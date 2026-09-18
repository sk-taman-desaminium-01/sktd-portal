"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh, pengguna } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { boleh } from "./peranan";

/**
 * Siapa guru kelas bagi kelas mana.
 *
 * Menggunakan jadual `pbd_guru_kelas` yang SUDAH wujud (lihat
 * supabase/migrasi-sktd.sql) dengan peranan `guru_kelas` — bukan stor
 * baharu. Jadual itu memang direka untuk ini, dan ePBD akan membaca
 * tugasan yang sama kemudian; dua sumber kebenaran untuk fakta yang sama
 * ialah cara paling pasti untuk ia menjadi tidak sepadan.
 *
 * Kunci kelas di sana ialah (tahun, kelas) — contoh (4, "NILAM") — manakala
 * jadual waktu menggunakan satu rentetan "4 NILAM". Penukaran berlaku di
 * sini sahaja supaya tiada kod lain perlu tahu tentang kedua-dua bentuk.
 */

const SESI = 2026;

export interface TugasanKelas {
  guru_id: string;
  nama: string;
  emel: string | null;
  tahun: number;
  kelas: string;
  /** Kunci yang digunakan jadual waktu: "4 NILAM". */
  label: string;
}

export type HasilTugasan = { ok: boolean; mesej: string };

/** Label paparan bagi (tahun, kelas). PPKI (tahun 0) sudah membawa nama
 *  penuhnya dalam `kelas`, jadi tiada awalan "0 " yang tidak bermakna. */
function labelKelas(tahun: number, kelas: string): string {
  return tahun === 0 ? kelas : `${tahun} ${kelas}`;
}

function pecahLabel(label: string): { tahun: number; kelas: string } | null {
  // PPKI: label "PPKI SUNFLOWER" → tahun 0 (sentinel bukan-kelas-perdana),
  // kelas "PPKI SUNFLOWER" penuh. Lihat `semuaKelasPPKI()` dalam data/kelas.ts.
  if (/^PPKI\s+/i.test(label.trim())) {
    return { tahun: 0, kelas: label.trim().toUpperCase() };
  }
  const m = /^([1-6])\s+(.+)$/.exec(label.trim());
  if (!m) return null;
  return { tahun: Number(m[1]), kelas: m[2].trim().toUpperCase() };
}

export async function senaraiGuruKelas(): Promise<TugasanKelas[]> {
  await pastikanBoleh("terbit_kandungan");
  const db = klienTulis();
  const baris = (await db.minta(
    `pbd_guru_kelas?select=guru_id,tahun,kelas,pbd_guru(nama,email)` +
      `&tahun_sesi=eq.${SESI}&peranan=eq.guru_kelas&order=tahun.asc,kelas.asc`,
  )) as {
    guru_id: string; tahun: number; kelas: string;
    pbd_guru: { nama: string; email: string | null } | null;
  }[];

  return baris.map((b) => ({
    guru_id: b.guru_id,
    nama: b.pbd_guru?.nama ?? "(nama tiada)",
    emel: b.pbd_guru?.email ?? null,
    tahun: b.tahun,
    kelas: b.kelas,
    label: labelKelas(b.tahun, b.kelas),
  }));
}

/**
 * Kelas yang pengguna semasa boleh SUNTING jadualnya.
 *
 * `null` bermakna SEMUA kelas — pentadbir dan admin. Senarai bermakna guru
 * kelas: hanya kelas yang ditugaskan kepada mereka.
 *
 * Fungsi ini ialah satu-satunya tempat keputusan itu dibuat, dan ia dipanggil
 * semula di PELAYAN pada setiap simpanan. Menapis senarai di skrin sahaja
 * bukan kawalan — sesiapa boleh menghantar nama kelas lain.
 */
export async function kelasBolehSunting(): Promise<string[] | null> {
  const saya = await pengguna();
  if (!saya?.peranan) return [];
  if (boleh(saya.peranan, "urus_guru_kelas")) return null; // semua kelas
  if (!saya.id) return [];

  const db = klienTulis();
  const baris = (await db.minta(
    `pbd_guru_kelas?select=tahun,kelas&tahun_sesi=eq.${SESI}` +
      `&peranan=eq.guru_kelas&guru_id=eq.${saya.id}`,
  )) as { tahun: number; kelas: string }[];
  return baris.map((b) => labelKelas(b.tahun, b.kelas));
}

export async function tetapGuruKelas(guruId: string, label: string): Promise<HasilTugasan> {
  await pastikanBoleh("urus_guru_kelas");

  const pecah = pecahLabel(label);
  if (!pecah) return { ok: false, mesej: `Nama kelas tidak sah: ${label}` };

  try {
    const db = klienTulis();
    // Satu kelas, satu guru kelas. Tugasan lama dibuang dahulu supaya tiada
    // dua orang memegang kelas yang sama tanpa sesiapa perasan.
    await db.minta(
      `pbd_guru_kelas?tahun_sesi=eq.${SESI}&peranan=eq.guru_kelas` +
        `&tahun=eq.${pecah.tahun}&kelas=eq.${encodeURIComponent(pecah.kelas)}`,
      { method: "DELETE" },
    );
    await db.minta("pbd_guru_kelas", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        guru_id: guruId, tahun_sesi: SESI,
        tahun: pecah.tahun, kelas: pecah.kelas,
        subjek: "", peranan: "guru_kelas",
      }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menetapkan guru kelas." };
  }

  revalidatePath("/admin/guru-kelas");
  revalidatePath("/admin/jadual");
  return { ok: true, mesej: `Guru kelas ${label} dikemas kini.` };
}

export async function buangGuruKelas(label: string): Promise<HasilTugasan> {
  await pastikanBoleh("urus_guru_kelas");
  const pecah = pecahLabel(label);
  if (!pecah) return { ok: false, mesej: `Nama kelas tidak sah: ${label}` };

  try {
    const db = klienTulis();
    await db.minta(
      `pbd_guru_kelas?tahun_sesi=eq.${SESI}&peranan=eq.guru_kelas` +
        `&tahun=eq.${pecah.tahun}&kelas=eq.${encodeURIComponent(pecah.kelas)}`,
      { method: "DELETE" },
    );
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal membuang tugasan." };
  }
  revalidatePath("/admin/guru-kelas");
  revalidatePath("/admin/jadual");
  return { ok: true, mesej: `Tugasan guru kelas ${label} dibuang.` };
}
