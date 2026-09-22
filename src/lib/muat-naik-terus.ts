"use server";

import { randomUUID } from "node:crypto";
import { pengguna } from "./akses";
import { HAD_BAIT } from "@/data/had-fail";
import { BUCKET, tetapan, cap, pastikanBucket } from "./fail-sementara";

/** Lihat `fail-sementara.ts` untuk sebab muat naik terus wujud. */
export interface SlotMuatNaik { ok: boolean; mesej: string; urlMuatNaik?: string; laluan?: string }

export async function mintaSlotMuatNaik(nama: string, saiz: number): Promise<SlotMuatNaik> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  if (!Number.isFinite(saiz) || saiz <= 0) return { ok: false, mesej: "Fail kosong." };
  if (saiz > HAD_BAIT) return { ok: false, mesej: `Fail ${(saiz / 1048576).toFixed(1)} MB melebihi had ${HAD_BAIT / 1048576} MB.` };
  try {
    await pastikanBucket();
    const { url, kepala } = tetapan();
    const sambungan = (/\.([a-z0-9]{1,5})$/i.exec(nama)?.[1] ?? "bin").toLowerCase();
    const laluan = `${cap(saya.emel)}/${randomUUID()}.${sambungan}`;
    const res = await fetch(`${url}/storage/v1/object/upload/sign/${BUCKET}/${laluan}`, {
      method: "POST", headers: { ...kepala, "Content-Type": "application/json" }, body: "{}",
    });
    if (!res.ok) return { ok: false, mesej: `Storan menolak muat naik (${res.status}).` };
    const j = (await res.json()) as { url?: string };
    if (!j.url) return { ok: false, mesej: "Storan tidak memberi URL muat naik." };
    return { ok: true, mesej: "", urlMuatNaik: `${url}/storage/v1${j.url}`, laluan };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyediakan muat naik." };
  }
}

