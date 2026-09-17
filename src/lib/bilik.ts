import "server-only";
import { klienTulis } from "./supabase-pelayan";
import { susunTempahan, type Bilik, type Tempahan } from "@/data/bilik";

export type { Bilik, Tempahan };

/** Tarikh hari ini di Malaysia. Pelayan Vercel berjalan pada UTC. */
export function hariIniMY(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export async function senaraiBilik(termasukTidakAktif = false): Promise<Bilik[]> {
  const db = klienTulis();
  const tapis = termasukTidakAktif ? "" : "&aktif=eq.true";
  return (await db.minta(
    `bilik_khas?select=id,nama,muatan,nota,aktif${tapis}&order=nama.asc`,
  )) as Bilik[];
}

/**
 * Tempahan dalam satu julat tarikh.
 *
 * Julat, bukan "semua": senarai tempahan tumbuh selama-lamanya dan skrin
 * hanya memapar minggu semasa. Peraturan keras #1 — jangan `.limit()` mentah
 * pada jadual yang membesar — diselesaikan di sini dengan menapis mengikut
 * tarikh, yang juga kebetulan apa yang pengguna mahu lihat.
 */
export async function tempahanJulat(dari: string, hingga: string): Promise<Tempahan[]> {
  const db = klienTulis();
  const senarai = (await db.minta(
    `tempahan_bilik?select=*&tarikh=gte.${dari}&tarikh=lte.${hingga}` +
      `&dibatalkan=eq.false&order=tarikh.asc,mula.asc`,
  )) as Tempahan[];
  return susunTempahan(senarai);
}

/** Tempahan sedia ada bagi satu bilik pada satu tarikh — untuk semakan pertindihan. */
export async function tempahanBilikTarikh(bilikId: string, tarikh: string): Promise<Tempahan[]> {
  const db = klienTulis();
  return (await db.minta(
    `tempahan_bilik?select=*&bilik_id=eq.${encodeURIComponent(bilikId)}` +
      `&tarikh=eq.${encodeURIComponent(tarikh)}&dibatalkan=eq.false`,
  )) as Tempahan[];
}

export async function simpanTempahan(t: {
  bilik_id: string; tarikh: string; mula: string; tamat: string;
  tujuan: string; oleh: string; nama: string;
}): Promise<Tempahan | null> {
  const db = klienTulis();
  // Rekod dipulangkan supaya permohonan peralatan boleh dipautkan kepadanya —
  // itu yang membolehkan unit ICT melihat tempahan mana yang memerlukan apa.
  const hasil = (await db.minta("tempahan_bilik", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...t, dibatalkan: false }),
  })) as Tempahan[];
  return hasil[0] ?? null;
}

/**
 * Batal — TANDA, bukan padam.
 *
 * Tempahan yang hilang tanpa jejak menghasilkan soalan "siapa batalkan ini?"
 * yang tiada siapa boleh jawab. Ia ditandakan, dan baris itu kekal.
 */
export async function batalTempahan(id: string): Promise<void> {
  const db = klienTulis();
  await db.minta(`tempahan_bilik?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ dibatalkan: true }),
  });
}

export async function satuTempahan(id: string): Promise<Tempahan | null> {
  const db = klienTulis();
  const r = (await db.minta(
    `tempahan_bilik?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
  )) as Tempahan[];
  return r[0] ?? null;
}

/* ------------------------------------------------------------ urus bilik */

/**
 * Padam bilik.
 *
 * Bilik yang PERNAH ditempah tidak dipadam — ia dinyahaktifkan. Memadamnya
 * memusnahkan setiap tempahan yang merujuknya (`on delete cascade`), dan
 * rekod "siapa guna dewan bulan lepas" hilang tanpa sesiapa memintanya.
 * Bilik tanpa sebarang tempahan boleh dipadam betul-betul — ia biasanya
 * tersalah taip semasa ditambah.
 */
export async function padamBilik(id: string): Promise<"dipadam" | "dinyahaktif"> {
  const db = klienTulis();
  const ada = (await db.minta(
    `tempahan_bilik?select=id&bilik_id=eq.${encodeURIComponent(id)}&limit=1`,
  )) as { id: string }[];

  if (ada.length > 0) {
    await db.minta(`bilik_khas?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ aktif: false }),
    });
    return "dinyahaktif";
  }

  await db.minta(`bilik_khas?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  return "dipadam";
}

export async function simpanBilik(b: {
  id?: string; nama: string; muatan: number | null; nota: string | null; aktif: boolean;
}): Promise<Bilik | null> {
  const db = klienTulis();
  const badan = { nama: b.nama, muatan: b.muatan, nota: b.nota, aktif: b.aktif };
  if (b.id) {
    await db.minta(`bilik_khas?id=eq.${encodeURIComponent(b.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(badan),
    });
    return null;
  }
  // Rekod dipulangkan supaya skrin memegang id SEBENAR dan bukan id rekaan —
  // id rekaan menjadikan baris itu mustahil disunting atau dipadam.
  const hasil = (await db.minta("bilik_khas", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(badan),
  })) as Bilik[];
  return hasil[0] ?? null;
}
