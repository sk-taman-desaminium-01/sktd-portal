import "server-only";
import { muatanKeFail, type MuatanFail } from "@/data/fail-base64";
import { ambilFailSementara } from "./fail-sementara";

/** Fail daripada muatan: base64 (kecil) atau laluan storan sementara (besar). */
export async function bacaMuatan(m: MuatanFail): Promise<File> {
  if (m?.laluan) return ambilFailSementara(m.laluan, m.nama, m.jenis);
  return muatanKeFail(m);
}

export function adaMuatan(m: MuatanFail | null | undefined): boolean {
  return !!(m && (m.data || m.laluan));
}
