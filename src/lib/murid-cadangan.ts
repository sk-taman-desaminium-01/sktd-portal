"use server";

import { pengguna } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { sahInt } from "./sah";

/**
 * Cadangan nama murid untuk medan "taip nama" di skrin kakitangan — Disiplin,
 * Kawalan Kelas, RMT, dan Borang Waris (permintaan pengguna J).
 *
 * "Bila guru type, keluar suggestions nama-nama yang ada, jika tiada, guru
 * boleh type sendiri." Ini SATU senarai ringkas (nama + kelas) — bukan
 * rekod penuh murid — kerana skrin ini hanya perlu memadankan ejaan, bukan
 * membaca data sensitif seperti No. KP.
 *
 * "Kelebihan nama suggestions ini hanya untuk guru atau pengguna portal
 * sahaja" — fungsi ini menuntut log masuk (mana-mana peranan), TIDAK pernah
 * dipanggil dari borang awam ibu bapa (Kebenaran Gambar/Waris tetap
 * menuntut ibu bapa menaip sendiri, demi privasi murid lain).
 */
export interface CadanganMurid {
  id: string;
  nama: string;
  kelas: string;
}

export async function senaraiMuridCadangan(tahun_sesi: number): Promise<CadanganMurid[]> {
  sahInt(tahun_sesi, "sesi", 2000, 2100);
  const saya = await pengguna();
  if (!saya?.peranan) return [];

  const db = klienTulis();
  const KEPING = 1000;
  const keluar: CadanganMurid[] = [];
  for (let mula = 0; ; mula += KEPING) {
    const keping = (await db.minta(
      `pbd_pendaftaran?select=murid_id,tahun,kelas,pbd_murid(nama)&tahun_sesi=eq.${tahun_sesi}` +
        `&status=in.(aktif,pindah_masuk,ulang)&order=id.asc&offset=${mula}&limit=${KEPING}`,
    )) as { murid_id: string; tahun: number; kelas: string; pbd_murid: { nama: string } | null }[];

    for (const b of keping) {
      if (b.pbd_murid?.nama) keluar.push({ id: b.murid_id, nama: b.pbd_murid.nama, kelas: b.tahun === 0 ? b.kelas : `${b.tahun} ${b.kelas}` });
    }
    if (keping.length < KEPING) break;
  }
  return keluar.sort((a, b) => a.nama.localeCompare(b.nama, "ms"));
}
