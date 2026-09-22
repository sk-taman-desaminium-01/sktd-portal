import "server-only";
import webpush from "web-push";
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
  emel?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface MuatanPush {
  tajuk: string;
  teks: string;
  pautan?: string | null;
}

export interface HasilPush {
  dikonfigur: boolean;
  berjaya: number;
  gagal: number;
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
    `push_langganan?select=emel,endpoint,p256dh,auth&emel=in.(${senarai})`,
  )) as Langganan[];
}

export function pushDikonfigur(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY
  );
}

function pautanPortal(pautan?: string | null): string {
  if (!pautan) return "/portal/notifikasi";
  if (/^https?:\/\//i.test(pautan) || pautan.startsWith("/portal/")) return pautan;
  return `/portal${pautan.startsWith("/") ? pautan : `/${pautan}`}`;
}

async function buangLanggananTamat(endpoint: string): Promise<void> {
  await klienTulis().minta(`push_langganan?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE", headers: { Prefer: "return=minimal" },
  });
}

/**
 * Hantar pemberitahuan sistem operasi kepada setiap peranti yang dilanggan.
 * Dipanggil dari `after()` bersama notifikasi loceng, jadi rangkaian Google,
 * Apple atau Mozilla tidak menahan respons butang pengguna.
 */
export async function hantarPush(emel: string[], muatan: MuatanPush): Promise<HasilPush> {
  const awam = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const rahsia = process.env.VAPID_PRIVATE_KEY;
  if (!awam || !rahsia) return { dikonfigur: false, berjaya: 0, gagal: 0 };
  if (emel.length === 0) return { dikonfigur: true, berjaya: 0, gagal: 0 };

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@sktd.edu.my",
    awam,
    rahsia,
  );
  const langganan = await langgananUntuk(emel);
  const payload = JSON.stringify({
    tajuk: muatan.tajuk.slice(0, 120),
    teks: muatan.teks.slice(0, 240),
    pautan: pautanPortal(muatan.pautan),
  });

  const keputusan = await Promise.all(langganan.map(async (l) => {
    try {
      await webpush.sendNotification({
        endpoint: l.endpoint,
        keys: { p256dh: l.p256dh, auth: l.auth },
      }, payload, {
        // 24 jam, bukan 5 minit. Telefon Android dalam mod tidur (Doze) atau
        // tanpa talian lebih 5 minit menyebabkan push dengan TTL 300 dibuang
        // oleh pelayan push sebelum sempat dihantar — itulah "notifikasi
        // tak naik". "high" membangunkan peranti; "normal" boleh ditangguh.
        TTL: 86400, urgency: "high",
      });
      return true;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await buangLanggananTamat(l.endpoint).catch(() => {});
        return false;
      }
      console.error("[push] penghantaran gagal", status ?? "tanpa-status");
      return false;
    }
  }));
  const berjaya = keputusan.filter(Boolean).length;
  return { dikonfigur: true, berjaya, gagal: keputusan.length - berjaya };
}
