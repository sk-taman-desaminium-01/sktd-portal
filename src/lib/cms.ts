"use server";

import { pastikanAdmin } from "./akses";
import { revalidatePath } from "next/cache";
import { klienTulis } from "./supabase-pelayan";
import { binaSemulaLamanAwam } from "./bina-semula";

export type Keutamaan = "segera" | "utama" | "biasa";
export type Status = "draf" | "terbit";

export interface PosCms {
  id: string;
  jenis: "pengumuman" | "aktiviti";
  tajuk: string;
  slug: string;
  kategori: string | null;
  ringkasan: string | null;
  keutamaan: Keutamaan;
  status: Status;
  tarikh_terbit: string | null;
  updated_at: string;
}

const LAJUR = "id,jenis,tajuk,slug,kategori,ringkasan,keutamaan,status,tarikh_terbit,updated_at";

/**
 * Setiap tindakan CMS bermula di sini.
 *
 * Log masuk SAHAJA tidak memadai — mana-mana guru boleh log masuk. Menulis
 * kandungan laman awam ialah kuasa admin, jadi ia disemak terhadap
 * ADMIN_EMAILS di pelayan.
 */
async function pastikanMasuk() {
  return pastikanAdmin();
}

export async function senaraiPos(): Promise<PosCms[]> {
  await pastikanMasuk();
  const db = klienTulis();
  return (await db.minta(
    `web_pos?select=${LAJUR}&order=updated_at.desc`,
  )) as PosCms[];
}

function jadikanSlug(t: string) {
  return t
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export type HasilSimpan = {
  ok: boolean;
  mesej: string;
  /** Benar bila pos terbit tetapi laman awam belum dikemas kini. */
  amaranBina?: string;
};

export async function simpanPos(data: FormData): Promise<HasilSimpan> {
  await pastikanMasuk();

  const id = String(data.get("id") ?? "").trim();
  const tajuk = String(data.get("tajuk") ?? "").trim();
  const status = String(data.get("status") ?? "draf") as Status;

  if (!tajuk) return { ok: false, mesej: "Tajuk tidak boleh kosong." };

  // Peraturan keras #2: MEDAN KOSONG ≠ PADAM. Medan kosong disimpan sebagai
  // null (tiada nilai), dan kita TIDAK pernah memadam baris kerana borang
  // dihantar dengan medan kosong.
  const badan: Record<string, unknown> = {
    jenis: String(data.get("jenis") ?? "pengumuman"),
    tajuk,
    slug: String(data.get("slug") ?? "").trim() || jadikanSlug(tajuk),
    kategori: String(data.get("kategori") ?? "").trim() || null,
    ringkasan: String(data.get("ringkasan") ?? "").trim() || null,
    kandungan: String(data.get("kandungan") ?? "").trim() || null,
    keutamaan: String(data.get("keutamaan") ?? "biasa"),
    status,
    updated_at: new Date().toISOString(),
  };

  // Tarikh terbit ditetapkan SEKALI, pada penerbitan pertama.
  if (status === "terbit" && !data.get("tarikh_terbit")) {
    badan.tarikh_terbit = new Date().toISOString();
  }

  const db = klienTulis();
  try {
    if (id) {
      await db.minta(`web_pos?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify(badan),
      });
    } else {
      await db.minta("web_pos", { method: "POST", body: JSON.stringify(badan) });
    }
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." };
  }

  revalidatePath("/admin");

  // Hanya pos TERBIT mengubah laman awam, jadi hanya itu mencetuskan binaan.
  // Draf tidak membazirkan kuota binaan.
  if (status === "terbit") {
    const bina = await binaSemulaLamanAwam();
    if (!bina.ok) {
      return {
        ok: true,
        mesej: "Pos disimpan dan diterbitkan.",
        amaranBina: bina.sebab,
      };
    }
    return {
      ok: true,
      mesej: "Pos diterbitkan. Laman awam sedang dikemas kini — pos akan muncul dalam 1–2 minit.",
    };
  }

  return { ok: true, mesej: "Draf disimpan. Ia TIDAK kelihatan di laman awam." };
}
