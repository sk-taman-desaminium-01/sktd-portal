import { unzipSync } from "fflate";
import { HAD_BAIT } from "./had-fail.ts";

/** Semak metadata sebelum penyahmampatan supaya ZIP tidak memenuhi memori. */
export function bukaZip(bait: Uint8Array): Record<string, Uint8Array> {
  if (bait.length > 50 * 1024 * 1024) throw new Error("Had ZIP ialah 50 MB. Pecahkan kepada beberapa ZIP.");
  let jumlah = 0;
  let bil = 0;
  return unzipSync(bait, { filter: (f) => {
    if (f.name.endsWith("/") || f.name.includes("__MACOSX") || f.name.split("/").some((p) => p.startsWith("."))) return false;
    if (!/\.(pdf|docx|xlsx|csv|txt)$/i.test(f.name)) return false;
    jumlah += f.originalSize; bil++;
    if (f.originalSize > HAD_BAIT || jumlah > 100 * 1024 * 1024 || bil > 200)
      throw new Error("ZIP melebihi had: 200 fail, 10 MB setiap fail dan 100 MB selepas dibuka.");
    return true;
  } });
}
