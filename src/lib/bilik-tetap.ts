import "server-only";
import { klienTulis } from "./supabase-pelayan";
import { ambilJadual } from "./jadual";
import { daripadaJadual, type Tetap, type TetapDijana } from "@/data/bilik-tetap";

export type { Tetap, TetapDijana };

export async function senaraiTetap(): Promise<Tetap[]> {
  const db = klienTulis();
  return (await db.minta(
    "bilik_tetap?select=*&aktif=eq.true&order=hari.asc,mula.asc",
  )) as Tetap[];
}

export async function semuaTetap(): Promise<Tetap[]> {
  const db = klienTulis();
  return (await db.minta("bilik_tetap?select=*&order=hari.asc,mula.asc")) as Tetap[];
}

export async function tambahTetap(t: {
  bilik_id: string; hari: string; mula: string; tamat: string; sebab: string;
  sumber: string; subjek: string | null; kelas: string | null;
  dari_tarikh: string | null; hingga_tarikh: string | null;
}): Promise<void> {
  const db = klienTulis();
  await db.minta("bilik_tetap", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...t, aktif: true }),
  });
}

export async function tambahTetapPukal(
  senarai: Parameters<typeof tambahTetap>[0][],
): Promise<void> {
  if (senarai.length === 0) return;
  const db = klienTulis();
  await db.minta("bilik_tetap", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(senarai.map((t) => ({ ...t, aktif: true }))),
  });
}

export async function padamTetap(id: string): Promise<void> {
  const db = klienTulis();
  await db.minta(`bilik_tetap?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

/* --------------------------------------------------------- pemetaan subjek */

export async function petaSubjekBilik(): Promise<Record<string, string>> {
  const db = klienTulis();
  const baris = (await db.minta(
    "subjek_bilik?select=subjek,bilik_id",
  )) as { subjek: string; bilik_id: string }[];
  return Object.fromEntries(baris.map((b) => [b.subjek.toUpperCase(), b.bilik_id]));
}

export async function tetapSubjekBilik(subjek: string, bilikId: string | null): Promise<void> {
  const db = klienTulis();
  const kod = subjek.toUpperCase();
  if (!bilikId) {
    await db.minta(`subjek_bilik?subjek=eq.${encodeURIComponent(kod)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    return;
  }
  await db.minta("subjek_bilik?on_conflict=subjek", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ subjek: kod, bilik_id: bilikId }),
  });
}

/* ------------------------------------------------- penjanaan dari jadual */

/**
 * Jana semula sekatan yang datang dari JADUAL WAKTU.
 *
 * Yang lama dibuang dahulu, kemudian yang baharu ditulis. Menyatukan yang
 * lama dengan yang baharu bermakna slot yang DIBUANG dari jadual waktu
 * kekal menyekat bilik selamanya — dan tiada siapa akan tahu kenapa bilik
 * itu tertutup pada waktu yang jadualnya sudah kosong.
 *
 * Sekatan yang ditulis PENTADBIR tidak disentuh; ia bukan milik jadual.
 */
export async function janaSemulaDariJadual(): Promise<{ dijana: number; peta: number }> {
  const peta = await petaSubjekBilik();
  const db = klienTulis();

  await db.minta("bilik_tetap?sumber=eq.jadual", {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });

  if (Object.keys(peta).length === 0) return { dijana: 0, peta: 0 };

  const jadual = await ambilJadual();
  const dijana = daripadaJadual(jadual, peta);
  if (dijana.length === 0) return { dijana: 0, peta: Object.keys(peta).length };

  for (let i = 0; i < dijana.length; i += 200) {
    await tambahTetapPukal(
      dijana.slice(i, i + 200).map((d) => ({
        bilik_id: d.bilik_id, hari: d.hari, mula: d.mula, tamat: d.tamat,
        sebab: d.sebab, sumber: "jadual", subjek: d.subjek, kelas: d.kelas,
        dari_tarikh: null, hingga_tarikh: null,
      })),
    );
  }
  return { dijana: dijana.length, peta: Object.keys(peta).length };
}
