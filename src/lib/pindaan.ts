/**
 * Lapisan pangkalan data bagi pembetulan kekal.
 *
 * Logik tulennya duduk dalam `@/data/pindaan` supaya ia boleh diuji tanpa
 * pangkalan data — `kenakanPindaan()` ialah bahagian yang paling mudah
 * merosakkan data, jadi ia mesti berada di tempat yang ujian boleh capai.
 */
import { klienTulis } from "@/lib/supabase-pelayan";
import type { JenisPindaan, Pindaan } from "@/data/pindaan";

export * from "@/data/pindaan";

export async function senaraiPindaan(): Promise<Pindaan[]> {
  const db = klienTulis();
  return (await db.minta(
    "pengurusan_pindaan?select=*&order=dicipta.desc",
  )) as Pindaan[];
}

export async function tambahPindaan(
  p: { jenis: JenisPindaan; dari: string; kepada: string | null; sebab: string | null; oleh: string | null },
): Promise<void> {
  const db = klienTulis();
  await db.minta("pengurusan_pindaan", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      jenis: p.jenis,
      dari: p.dari.trim(),
      kepada: p.kepada?.trim() || null,
      sebab: p.sebab?.trim() || null,
      aktif: true,
      oleh: p.oleh,
    }),
  });
}

export async function togolPindaan(id: string, aktif: boolean): Promise<void> {
  const db = klienTulis();
  await db.minta(`pengurusan_pindaan?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ aktif }),
  });
}

export async function padamPindaan(id: string): Promise<void> {
  const db = klienTulis();
  await db.minta(`pengurusan_pindaan?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
