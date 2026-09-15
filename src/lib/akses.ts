import "server-only";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Siapa admin mutlak portal.
 *
 * ⚠️ EMEL TIDAK DITANAM DALAM KOD. Repo ini AWAM (Vercel Hobby menolak repo
 * persendirian milik org), dan emel `@moe-dl.edu.my` ialah maklumat peribadi
 * guru — pengimbas bocor kita menandakannya sebagai risiko TINGGI. Jadi ia
 * hidup dalam env `ADMIN_EMAILS` sahaja, dipisah koma.
 *
 * Lalai bila env tiada: SENARAI KOSONG, iaitu tiada sesiapa admin. Gagal
 * TERTUTUP, bukan terbuka — kalau env tersilap hilang, portal mengunci diri
 * dan bukannya membenarkan semua orang masuk.
 */
function senaraiAdmin(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Emel pengguna semasa, atau null. */
export async function emelSemasa(): Promise<string | null> {
  const u = await currentUser();
  return u?.emailAddresses[0]?.emailAddress?.toLowerCase() ?? null;
}

export async function adakahAdmin(): Promise<boolean> {
  const emel = await emelSemasa();
  if (!emel) return false;
  return senaraiAdmin().includes(emel);
}

/**
 * Pagar untuk laluan admin. Melontar jika bukan admin.
 *
 * Semakan ini di PELAYAN. Menyembunyikan pautan di UI bukan kawalan —
 * guru biasa yang menaip /admin terus mesti ditolak sebelum apa-apa dirender.
 */
export async function pastikanAdmin(): Promise<string> {
  const emel = await emelSemasa();
  if (!emel || !senaraiAdmin().includes(emel)) {
    throw new Error("Tidak dibenarkan — halaman ini untuk admin sahaja.");
  }
  return emel;
}
