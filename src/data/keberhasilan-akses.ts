import type { PerananEkb, Tindakan } from "./keberhasilan.ts";

export interface IdentitiKeberhasilan {
  id: string | null;
  peranan: string | null;
  mutlak: boolean;
}

/** Bukti mutlak datang daripada sesi pelayan, bukan label peranan dalam DB. */
export const urusSemuaKeberhasilan = (saya: IdentitiKeberhasilan) =>
  saya.mutlak === true && saya.peranan === "admin_mutlak";

export function perananBorangKeberhasilan(
  saya: IdentitiKeberhasilan, pydId: string,
  penilai: { pp1_id: string | null; pp2_id: string | null } | null,
): PerananEkb | null {
  if (!saya.peranan) return null;
  if (saya.id && saya.id === pydId) return "PYD";
  if (urusSemuaKeberhasilan(saya)) return "PP1";
  if (saya.id && penilai?.pp1_id === saya.id) return "PP1";
  if (saya.id && penilai?.pp2_id === saya.id) return "PP2";
  return null;
}

/** Admin mutlak boleh bertindak pada kedua-dua peringkat, termasuk borang sendiri. */
export function perananTindakanKeberhasilan(
  peranan: PerananEkb, tindakan: Tindakan, mutlak: boolean,
): PerananEkb {
  if (mutlak && tindakan === "perakui") return "PP2";
  if (mutlak && (tindakan === "sahkan" || tindakan === "pulang")) return "PP1";
  return peranan;
}
