"use server";

import { pastikanBoleh } from "./akses";
import { revalidatePath } from "next/cache";
import { klienTulis } from "./supabase-pelayan";
import { binaSemulaLamanAwam } from "./bina-semula";
import { hantar } from "./notifikasi";
import { sahUuid } from "./sah";

export type Keutamaan = "segera" | "utama" | "biasa";
export type Status = "draf" | "terbit";

export interface PosCms {
  id: string;
  jenis: "pengumuman" | "aktiviti";
  tajuk: string;
  slug: string;
  kategori: string | null;
  ringkasan: string | null;
  /**
   * Gambar utama pos. Untuk aktiviti ia yang muncul dalam marquee laman awam.
   *
   * Lajur ini sudah lama wujud dalam DB dan laman awam sudah memaparkannya,
   * tetapi CMS tidak pernah mendedahkannya — jadi admin memuat naik melalui
   * Pustaka Media, menyalin URL, dan menampalnya. Tiga langkah untuk satu
   * gambar. Sekarang ia dimuat naik terus dari borang pos.
   */
  gambar_utama: string | null;
  keutamaan: Keutamaan;
  status: Status;
  tarikh_terbit: string | null;
  updated_at: string;
}

const LAJUR = "id,jenis,tajuk,slug,kategori,ringkasan,gambar_utama,keutamaan,status,tarikh_terbit,updated_at";

/**
 * Setiap tindakan CMS bermula di sini.
 *
 * Log masuk SAHAJA tidak memadai — mana-mana guru boleh log masuk. Menulis
 * kandungan laman awam ialah kuasa admin, jadi ia disemak terhadap
 * ADMIN_EMAILS di pelayan.
 */
async function pastikanMasuk() {
  return pastikanBoleh("terbit_kandungan");
}

export async function senaraiPos(): Promise<PosCms[]> {
  await pastikanMasuk();
  const db = klienTulis();
  return (await db.minta(
    `web_pos?select=${LAJUR}&order=updated_at.desc`,
  )) as PosCms[];
}

/**
 * Satu pos untuk disunting. Termasuk `kandungan` (tiada dalam senarai) sebab
 * borang sunting perlukan teks penuh, bukan sekadar ringkasan.
 */
export async function ambilPos(id: string): Promise<(PosCms & { kandungan: string | null }) | null> {
  sahUuid(id);
  await pastikanMasuk();
  if (!id.trim()) return null;
  const db = klienTulis();
  const baris = (await db.minta(
    `web_pos?select=${LAJUR},kandungan&id=eq.${id.trim()}&limit=1`,
  )) as (PosCms & { kandungan: string | null })[];
  return baris[0] ?? null;
}

/** Ringkasan automatik daripada kandungan — potong pada 200 aksara (permintaan L). */
function auto200(kandungan: string | null): string | null {
  if (!kandungan) return null;
  const rata = kandungan.replace(/\s+/g, " ").trim();
  if (rata.length <= 200) return rata || null;
  return `${rata.slice(0, 199).trimEnd()}…`;
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

  const kandungan = String(data.get("kandungan") ?? "").trim() || null;

  // Ringkasan TIDAK ditaip oleh admin (permintaan L) — ia diarang automatik
  // daripada kandungan, dipotong pada 200 aksara. Admin masih boleh
  // menimpanya dengan menghantar `ringkasan` secara jelas (cth. sunting
  // draf takwim yang sudah punya ayat sendiri).
  const ringkasanDihantar = String(data.get("ringkasan") ?? "").trim();
  const ringkasan = ringkasanDihantar || auto200(kandungan);

  // Peraturan keras #2: MEDAN KOSONG ≠ PADAM. Medan kosong disimpan sebagai
  // null (tiada nilai), dan kita TIDAK pernah memadam baris kerana borang
  // dihantar dengan medan kosong.
  const badan: Record<string, unknown> = {
    jenis: String(data.get("jenis") ?? "pengumuman"),
    tajuk,
    slug: String(data.get("slug") ?? "").trim() || jadikanSlug(tajuk),
    kategori: String(data.get("kategori") ?? "").trim() || null,
    ringkasan,
    kandungan,
    // MEDAN KOSONG BUKAN PADAM (peraturan keras #2) — kecuali apabila
    // pengguna benar-benar menekan "Buang gambar", yang menghantar nilai
    // khas ini. Tanpa pembezaan itu, menyimpan pos tanpa menyentuh gambar
    // akan memadamkan gambar yang sudah ada.
    ...(data.has("gambar_utama")
      ? { gambar_utama: String(data.get("gambar_utama")).trim() === "__buang__"
            ? null
            : String(data.get("gambar_utama")).trim() || null }
      : {}),
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

  // PENGUMUMAN YANG DITERBITKAN SAMPAI KEPADA GURU.
  //
  // Sebelum ini pos yang diterbitkan hanya muncul di laman awam, dan guru
  // mengetahuinya apabila seseorang memberitahu mereka. Notifikasi ialah
  // sebab modul itu dibina — dan ia tidak sepatutnya terhad kepada tempahan
  // bilik, seperti yang pengguna sebut: "bukan sekadar untuk bilik khas
  // sahaja, tetapi ia juga perlu untuk semua yang melibatkan pengumuman
  // kepada guru."
  //
  // Hanya pada penerbitan PERTAMA: menyunting pos yang sudah terbit tidak
  // sepatutnya membunyikan loceng seluruh sekolah sekali lagi.
  const kaliPertama = status === "terbit" && !data.get("tarikh_terbit");
  if (kaliPertama) {
    await hantar({
      penerima: [],
      semuaWarga: true,
      jenis: "umum",
      tajuk,
      teks:
        String(data.get("ringkasan") ?? "").trim() ||
        `${String(data.get("jenis") ?? "pengumuman")} baharu diterbitkan di laman sekolah.`,
      pautan: "/",
      oleh: null,
    });
  }

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

/** Padam pos secara nyata, hanya untuk pemegang kuasa penerbitan kandungan. */
export async function padamPos(id: string): Promise<{ ok: boolean; mesej: string }> {
  sahUuid(id);
  await pastikanMasuk();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, mesej: "Pos tidak sah." };
  try {
    await klienTulis().minta(`web_pos?id=eq.${id}`, { method: "DELETE" });
    revalidatePath("/admin");
    return { ok: true, mesej: "Pos dipadam." };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal memadam pos." };
  }
}
