import "server-only";
import { klienTulis } from "./supabase-pelayan";
/** Laluan dalaman mesti mempunyai susunan stabil termasuk id. */
export async function bacaSemua<T>(laluan: string): Promise<T[]> {
  const db = klienTulis(); const semua: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const rows = await db.minta(`${laluan}&limit=500&offset=${offset}`) as T[];
    semua.push(...rows);
    if (rows.length < 500) return semua;
  }
}
