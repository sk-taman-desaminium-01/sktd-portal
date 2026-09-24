import "server-only";

import { createHash } from "node:crypto";
import { pengguna } from "./akses";
import { HAD_BAIT } from "@/data/had-fail";

/**
 * MUAT NAIK TERUS KE STORAN — memintas had 4.5 MB Vercel.
 *
 * KENAPA. Fail dahulu dihantar sebagai base64 di dalam Server Action.
 * Vercel menolak badan permintaan melebihi 4.5 MB, dan base64 membesarkan
 * fail 33% — jadi apa-apa fail melebihi ±3.3 MB gagal SEBELUM kod kita
 * berjalan, walaupun skrin berkata had 10 MB. Foto dan imbasan telefon
 * lazimnya 3–6 MB: itulah sebab "upload guna phone tak dapat dibaca".
 *
 * CARA. Pelayan mencipta URL muat naik bertandatangan (sah 2 jam, satu
 * laluan, tanpa tulis-ganti) dalam baldi PERIBADI `sementara`. Pelayar
 * menghantar fail terus ke Supabase. Server Action kemudian hanya menerima
 * LALUAN, memuat turun fail dengan kunci rahsia, dan MEMADAMNYA serta-merta
 * — fail tidak kekal dan tidak memakan kuota 1 GB.
 *
 * KESELAMATAN. Laluan bermula dengan cap emel pemuat naik; pelayan menolak
 * laluan milik orang lain, jadi seseorang tidak boleh meminta pelayan
 * membaca fail yang dimuat naik oleh guru lain.
 */

export const BUCKET = "sementara";

export function tetapan() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rahsia = process.env.SUPABASE_SECRET_KEY;
  if (!url || !rahsia) throw new Error("[storan] tetapan Supabase tiada.");
  return { url, rahsia, kepala: { apikey: rahsia, Authorization: `Bearer ${rahsia}` } };
}

export const cap = (emel: string) => createHash("sha256").update(emel.toLowerCase()).digest("hex").slice(0, 20);

export async function pastikanBucket() {
  const { url, kepala } = tetapan();
  const semak = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers: kepala, cache: "no-store" });
  if (semak.ok) return;
  const cipta = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...kepala, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: HAD_BAIT }),
  });
  if (!cipta.ok && cipta.status !== 409) {
    throw new Error(`[storan] gagal cipta baldi sementara: ${cipta.status}`);
  }
}

/**
 * Ambil fail yang dimuat naik terus, kemudian PADAM. Hanya pelayan.
 * Melontar ralat jika laluan bukan milik pengguna semasa.
 */
export async function ambilFailSementara(laluan: string, nama: string, jenis: string): Promise<File> {
  const saya = await pengguna();
  if (!saya?.peranan) throw new Error("Tiada kebenaran.");
  if (!/^[0-9a-f]{20}\/[0-9a-f-]{36}\.[a-z0-9]{1,5}$/.test(laluan) || !laluan.startsWith(`${cap(saya.emel)}/`)) {
    throw new Error("Laluan fail tidak sah.");
  }
  const { url, kepala } = tetapan();
  const res = await fetch(`${url}/storage/v1/object/authenticated/${BUCKET}/${laluan}`, { headers: kepala, cache: "no-store" });
  if (!res.ok) throw new Error(`Fail tidak dapat diambil daripada storan (${res.status}). Muat naik semula.`);
  const bait = new Uint8Array(await res.arrayBuffer());
  // Padam segera — fail sementara tidak boleh kekal atau memakan kuota.
  void fetch(`${url}/storage/v1/object/${BUCKET}/${laluan}`, { method: "DELETE", headers: kepala }).catch(() => {});
  if (bait.length > HAD_BAIT) throw new Error("Fail melebihi had saiz.");
  return new File([bait], nama, { type: jenis });
}

/**
 * SAPU FAIL YATIM dalam baldi `sementara`.
 *
 * Fail dipadam sebaik dibaca, TETAPI muat naik yang ditinggalkan (talian
 * putus, pengguna tutup tab) tidak pernah dibaca — dan fail itu kekal
 * memakan kuota storan 1 GB selama-lamanya. Sapuan ini dipanggil secara
 * rawak (satu daripada sepuluh muat naik) supaya tiada kerja berkala
 * diperlukan, dan ia tidak pernah menggagalkan muat naik.
 */
export async function sapuFailYatim(maksUmurJam = 24): Promise<number> {
  try {
    const { url, kepala } = tetapan();
    const res = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { ...kepala, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 200, sortBy: { column: "created_at", order: "asc" } }),
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const senarai = (await res.json()) as { name: string; created_at?: string }[];
    const had = Date.now() - maksUmurJam * 3600_000;
    // Baldi ini berstruktur `<cap-emel>/<uuid>.<jenis>`; senarai akar
    // memulangkan folder, jadi setiap folder disemak isinya.
    const buang: string[] = [];
    for (const f of senarai) {
      if (f.name.includes(".")) {
        if (!f.created_at || Date.parse(f.created_at) < had) buang.push(f.name);
        continue;
      }
      const dalam = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
        method: "POST",
        headers: { ...kepala, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: f.name, limit: 200, sortBy: { column: "created_at", order: "asc" } }),
        cache: "no-store",
      });
      if (!dalam.ok) continue;
      for (const g of (await dalam.json()) as { name: string; created_at?: string }[]) {
        if (!g.created_at || Date.parse(g.created_at) < had) buang.push(`${f.name}/${g.name}`);
      }
    }
    if (buang.length === 0) return 0;
    await fetch(`${url}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { ...kepala, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: buang.slice(0, 100) }),
    });
    return Math.min(buang.length, 100);
  } catch {
    // Sapuan gagal tidak boleh menjejaskan muat naik yang sedang berjalan.
    return 0;
  }
}
