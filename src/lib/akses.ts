import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { klienTulis } from "./supabase-pelayan";
import { boleh, type Keupayaan, type Peranan, type PerananBerkesan } from "./peranan";

/**
 * Siapa pengguna semasa, dan apa kuasanya.
 *
 * Urutan semakan sengaja: ENV DAHULU, baru pangkalan data.
 * Kalau DB tidak dapat dicapai, admin mutlak MASIH boleh masuk dan membaikinya.
 * Kalau susunannya terbalik, kegagalan DB mengunci semua orang keluar —
 * termasuk orang yang sepatutnya membetulkannya.
 */

/** Domain rasmi yang dibenarkan mendaftar. Clerk allowlist perlu naik taraf
 *  berbayar (disahkan 16 Sep 2026: API pulangkan
 *  `unsupported_subscription_plan_features`), jadi sekatan ini kita buat
 *  sendiri — corak sama seperti `requireAllowedUser()` dalam repo erpm. */
const DOMAIN_RASMI = ["@moe-dl.edu.my", "@moe.edu.my"];

export function domainRasmi(emel: string): boolean {
  return DOMAIN_RASMI.some((d) => emel.toLowerCase().endsWith(d));
}

export interface Pengguna {
  emel: string;
  nama: string | null;
  peranan: PerananBerkesan | null; // null = tiada dalam senarai akses
  mutlak: boolean;
  /** Emel dari domain rasmi sekolah? */
  rasmi: boolean;
}

function senaraiMutlak(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function pengguna(): Promise<Pengguna | null> {
  const u = await currentUser();
  const emel = u?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!emel) return null;

  const nama = u?.fullName ?? u?.firstName ?? null;

  if (senaraiMutlak().includes(emel)) {
    return { emel, nama, peranan: "admin_mutlak", mutlak: true, rasmi: true };
  }

  // Bukan mutlak → semak senarai akses dalam DB.
  try {
    const db = klienTulis();
    const baris = (await db.minta(
      `pbd_guru?select=peranan,dibenarkan,nama&email=eq.${encodeURIComponent(emel)}`,
    )) as { peranan: Peranan; dibenarkan: boolean; nama: string }[];

    const r = baris[0];

    // TIADA LANGSUNG dalam senarai → rekodkan permohonan.
    //
    // Sebelum ini kami tidak menulis apa-apa di sini, dan akibatnya guru yang
    // log masuk menjadi HALIMUNAN: mereka nampak skrin "akses belum
    // diberikan", tetapi admin tidak nampak mereka di mana-mana. Admin tidak
    // boleh meluluskan orang yang mereka tidak tahu wujud, jadi satu-satunya
    // jalan ialah guru menghubungi admin dan mengeja emel mereka.
    //
    // Sekarang log masuk pertama meninggalkan baris `dibenarkan = false`.
    // Itu memberi akses SIFAR — ia hanya meletakkan nama mereka di hadapan
    // admin. Kelulusan tetap tindakan manusia.
    if (!r) {
      if (domainRasmi(emel)) await rekodPermohonan(db, emel, nama, u!.id);
      return { emel, nama, peranan: null, mutlak: false, rasmi: domainRasmi(emel) };
    }

    // Ada tetapi belum dibenarkan → tiada peranan.
    if (!r.dibenarkan) return { emel, nama, peranan: null, mutlak: false, rasmi: domainRasmi(emel) };
    return { emel, nama: r.nama ?? nama, peranan: r.peranan, mutlak: false, rasmi: domainRasmi(emel) };
  } catch {
    // DB gagal: JANGAN beri kuasa secara senyap. Orang biasa dianggap tiada
    // peranan (gagal tertutup); admin mutlak sudah pulang di atas.
    return { emel, nama, peranan: null, mutlak: false, rasmi: domainRasmi(emel) };
  }
}

/**
 * Tulis baris "menunggu kelulusan" untuk orang yang baru log masuk.
 *
 * DUA HALANGAN SKEMA yang dikendalikan di sini (lihat supabase/migrasi-sktd.sql):
 *  · `nama` mempunyai indeks UNIK pada upper(nama). Dua orang bernama sama —
 *    atau seorang yang sudah dimasukkan admin secara manual — akan melanggar
 *    indeks itu. Maka kegagalan ditelan dengan SENGAJA di sini: gagal menulis
 *    baris menunggu tidak boleh menghalang sesiapa daripada log masuk.
 *  · `email` TIADA kekangan unik, jadi upsert atas emel mustahil. Kita hanya
 *    menulis apabila carian emel di atas tidak memulangkan apa-apa, jadi
 *    setiap orang menghasilkan paling banyak satu baris.
 */
async function rekodPermohonan(
  db: { minta: (l: string, i?: RequestInit) => Promise<unknown> },
  emel: string,
  nama: string | null,
  clerkId: string,
) {
  try {
    await db.minta("pbd_guru", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        clerk_user_id: clerkId,
        nama: nama?.trim() || emel.split("@")[0],
        email: emel,
        peranan: "guru",
        dibenarkan: false,   // SIFAR akses sehingga manusia meluluskannya
      }),
    });
  } catch (e) {
    // Jangan halang log masuk kerana catatan gagal — tetapi jangan senyap
    // sepenuhnya (peraturan #4): log supaya ia boleh dilihat.
    console.warn("[akses] gagal merekod permohonan untuk", emel, e);
  }
}

export async function bolehBuat(k: Keupayaan): Promise<boolean> {
  const p = await pengguna();
  return boleh(p?.peranan ?? null, k);
}

/** Pagar untuk laluan/tindakan. Melontar jika tiada keupayaan. */
export async function pastikanBoleh(k: Keupayaan): Promise<Pengguna> {
  const p = await pengguna();
  if (!p || !boleh(p.peranan, k)) {
    throw new Error("Tidak dibenarkan.");
  }
  return p;
}

/** Kekal untuk kod sedia ada. */
export async function adakahAdmin(): Promise<boolean> {
  return bolehBuat("terbit_kandungan");
}
