import "server-only";
import { cache } from "react";
import { klienTulis } from "./supabase-pelayan";

export const tahunSesiAktif = cache(async (): Promise<number> => {
  const rows = await klienTulis().minta("pbd_sesi?select=tahun_sesi&status=eq.aktif&order=tahun_sesi.desc&limit=1") as { tahun_sesi: number }[];
  if (!rows[0]) throw new Error("Tiada sesi persekolahan aktif.");
  return rows[0].tahun_sesi;
});
