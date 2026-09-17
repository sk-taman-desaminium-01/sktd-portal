import "server-only";
import { klienTulis } from "./supabase-pelayan";

/**
 * PEMBERITAHUAN TOLAK (Web Push) — pemberitahuan yang naik di skrin telefon
 * walaupun portal ditutup.
 *
 * KEBENARAN DIMINTA, TIDAK PERNAH DIANDAIKAN. Pelayar hanya membenarkan
 * permintaan kebenaran selepas satu ketukan manusia, dan itu peraturan yang
 * betul walaupun pelayar tidak menguatkuasakannya: pemberitahuan yang tidak
 * diminta ialah gangguan, dan orang yang terganggu mematikannya untuk
 * selama-lamanya.
 *
 * KUNCI VAPID. Menghantar push memerlukan sepasang kunci: awam (dalam
 * pelayar) dan rahsia (dalam env pelayan). Tanpa kedua-duanya, modul ini
 * menyimpan langganan tetapi tidak menghantar apa-apa — loceng dalam portal
 * tetap berfungsi sepenuhnya. Itu kemerosotan yang disengajakan: separuh
 * sistem yang berfungsi lebih baik daripada skrin yang menghempas.
 */

export interface Langganan {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function simpanLanggananPush(emel: string, l: Langganan): Promise<void> {
  const db = klienTulis();
  await db.minta("push_langganan?on_conflict=endpoint", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      emel: emel.toLowerCase(),
      endpoint: l.endpoint,
      p256dh: l.p256dh,
      auth: l.auth,
    }),
  });
}

export async function buangLanggananPush(emel: string, endpoint: string): Promise<void> {
  const db = klienTulis();
  await db.minta(
    `push_langganan?endpoint=eq.${encodeURIComponent(endpoint)}` +
      `&emel=eq.${encodeURIComponent(emel.toLowerCase())}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
}

export async function langgananUntuk(emel: string[]): Promise<Langganan[]> {
  if (emel.length === 0) return [];
  const db = klienTulis();
  const senarai = emel.map((e) => `"${e.toLowerCase()}"`).join(",");
  return (await db.minta(
    `push_langganan?select=endpoint,p256dh,auth&emel=in.(${senarai})`,
  )) as Langganan[];
}

export function pushDikonfigur(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY
  );
}
