import "server-only";
import { klienTulis } from "./supabase-pelayan";
import { penerimaBersih, type JenisNotifikasi, type Notifikasi } from "@/data/notifikasi";

export type { Notifikasi, JenisNotifikasi };

/**
 * Lapisan pangkalan data notifikasi.
 *
 * MENGHANTAR TIDAK PERNAH MENGGAGALKAN KERJA SEBENAR. Setiap panggilan
 * `hantar()` menelan kegagalannya sendiri dan melaporkannya sebagai `false`.
 * Tempahan bilik yang berjaya tetapi gagal memberitahu unit ICT ialah
 * tempahan yang BERJAYA — membatalkannya kerana loceng tidak berbunyi
 * adalah lebih teruk daripada loceng yang senyap.
 */

export interface Hantaran {
  penerima: string[];
  jenis: JenisNotifikasi;
  tajuk: string;
  teks: string;
  pautan?: string | null;
  oleh?: string | null;
}

export async function hantar(h: Hantaran): Promise<boolean> {
  const untuk = penerimaBersih(h.penerima, h.oleh ?? null);
  if (untuk.length === 0) return true;

  try {
    const db = klienTulis();
    const muatan = untuk.map((e) => ({
      untuk: e,
      jenis: h.jenis,
      tajuk: h.tajuk.slice(0, 200),
      teks: h.teks.slice(0, 1000),
      pautan: h.pautan ?? null,
      oleh: h.oleh ?? null,
      dibaca: false,
    }));
    await db.minta("notifikasi", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(muatan),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Notifikasi seseorang.
 *
 * HAD 100. Loceng memapar apa yang BARU berlaku; sesiapa yang perlu menggali
 * lebih dalam daripada seratus notifikasi sedang mencari sesuatu yang
 * sepatutnya dicari di skrin modulnya sendiri.
 */
export async function untukSaya(emel: string, had = 100): Promise<Notifikasi[]> {
  if (!emel) return [];
  const db = klienTulis();
  return (await db.minta(
    `notifikasi?select=*&untuk=eq.${encodeURIComponent(emel.toLowerCase())}` +
      `&order=dicipta.desc&limit=${had}`,
  )) as Notifikasi[];
}

export async function bilangBelumBaca(emel: string): Promise<number> {
  if (!emel) return 0;
  const db = klienTulis();
  const baris = (await db.minta(
    `notifikasi?select=id&untuk=eq.${encodeURIComponent(emel.toLowerCase())}` +
      `&dibaca=eq.false&limit=100`,
  )) as { id: string }[];
  return baris.length;
}

export async function tandaDibaca(emel: string, id?: string): Promise<void> {
  const db = klienTulis();
  const tapis = id
    ? `id=eq.${encodeURIComponent(id)}&untuk=eq.${encodeURIComponent(emel.toLowerCase())}`
    : `untuk=eq.${encodeURIComponent(emel.toLowerCase())}&dibaca=eq.false`;
  await db.minta(`notifikasi?${tapis}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ dibaca: true }),
  });
}

export async function padamNotifikasi(emel: string, id: string): Promise<void> {
  const db = klienTulis();
  await db.minta(
    `notifikasi?id=eq.${encodeURIComponent(id)}&untuk=eq.${encodeURIComponent(emel.toLowerCase())}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
}

/** Buang semua notifikasi yang SUDAH DIBACA milik seseorang. */
export async function kosongkan(emel: string): Promise<void> {
  const db = klienTulis();
  await db.minta(
    `notifikasi?untuk=eq.${encodeURIComponent(emel.toLowerCase())}&dibaca=eq.true`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
}

/* --------------------------------------------------------- siapa penerima */

/**
 * Emel setiap orang yang memegang peranan tertentu.
 *
 * Digunakan untuk menghantar kepada "semua pentadbir" tanpa menyimpan
 * senarai emel kedua di mana-mana — senarai kedua ialah senarai yang
 * menjadi lapuk.
 */
/**
 * Emel SETIAP warga yang dibenarkan masuk portal.
 *
 * Untuk pengumuman yang memang ditujukan kepada semua — pos yang
 * diterbitkan, makluman sekolah. Dibaca berkeping-keping: peraturan keras #1
 * bukan tentang saiz data hari ini, ia tentang saiz data pada tahun kelima.
 */
export async function emelSemuaWarga(): Promise<string[]> {
  const db = klienTulis();
  const KEPING = 500;
  const keluar: string[] = [];
  for (let mula = 0; ; mula += KEPING) {
    const keping = (await db.minta(
      `pbd_guru?select=email&dibenarkan=eq.true&offset=${mula}&limit=${KEPING}`,
    )) as { email: string | null }[];
    keluar.push(...keping.map((b) => b.email ?? "").filter((e) => e !== ""));
    if (keping.length < KEPING) return keluar;
  }
}

export async function emelIkutPeranan(peranan: string[]): Promise<string[]> {
  if (peranan.length === 0) return [];
  const db = klienTulis();
  const baris = (await db.minta(
    `pbd_guru?select=email&dibenarkan=eq.true&peranan=in.(${peranan.join(",")})`,
  )) as { email: string | null }[];
  return baris.map((b) => b.email ?? "").filter((e) => e !== "");
}
