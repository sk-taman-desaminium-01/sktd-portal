"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { barisIkutKod } from "./pengurusan";
import { leraiTakwim } from "./takwim";
import { janaDraf, ikutMasa, type DrafUmum, type KumpulanMasa } from "@/data/umum-takwim";

/**
 * Draf pengumuman daripada takwim — jana, semak, simpan.
 *
 * TIADA APA YANG DITERBITKAN DI SINI. Semua yang disimpan berstatus `draf`,
 * dan draf tidak menyentuh laman awam langsung. Pengumuman kepada ibu bapa
 * keluar atas nama sekolah; sistem yang menghantarnya tanpa seorang manusia
 * membacanya akan, pada suatu hari, memberitahu seluruh sekolah tentang
 * mesyuarat yang dibatalkan.
 */

/** Tarikh hari ini di Malaysia. Pelayan Vercel berjalan pada UTC. */
function hariIniMY(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export interface HasilDraf {
  ok: boolean;
  mesej: string;
  kumpulan?: KumpulanMasa[];
  hariIni?: string;
  /** Kunci acara yang SUDAH ada sebagai pos — supaya ia tidak dicipta dua kali. */
  sudahAda?: string[];
}

export async function janaDrafTakwim(): Promise<HasilDraf> {
  try {
    await pastikanBoleh("terbit_kandungan");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  try {
    const [program, mesyuarat] = await Promise.all([
      barisIkutKod("takwim"),
      barisIkutKod("mesyuarat"),
    ]);
    const acara = [
      ...(program ? leraiTakwim(program.lajur, program.baris) : []),
      ...(mesyuarat ? leraiTakwim(mesyuarat.lajur, mesyuarat.baris) : []),
    ];
    if (acara.length === 0) {
      return {
        ok: false,
        mesej:
          "Takwim belum ada. Muat naik Buku Pengurusan dan sahkan seksyen takwim dahulu.",
      };
    }

    const hariIni = hariIniMY();
    const draf = janaDraf(acara, hariIni);

    // Pos yang sudah wujud dikesan melalui slugnya, supaya menekan "Jana"
    // dua kali tidak mencipta dua pengumuman untuk cuti yang sama.
    const db = klienTulis();
    const sedia = (await db.minta(
      "web_pos?select=slug&jenis=eq.pengumuman",
    )) as { slug: string }[];
    const slugSedia = new Set(sedia.map((s) => s.slug));

    return {
      ok: true,
      hariIni,
      kumpulan: ikutMasa(draf, hariIni),
      sudahAda: draf.filter((d) => slugSedia.has(slugDraf(d))).map((d) => d.kunci),
      mesej:
        `${draf.length} acara dibaca · ` +
        `${draf.filter((d) => d.disyorkan).length} disyorkan untuk ibu bapa.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/**
 * Slug yang STABIL bagi satu draf.
 *
 * Ia mesti sama setiap kali acara yang sama dijana semula — itulah cara
 * sistem tahu pengumuman itu sudah wujud tanpa menyimpan jadual pemetaan
 * yang tersendiri.
 */
function slugDraf(d: DrafUmum): string {
  return `takwim-${(d.acara.tarikh ?? d.acara.tarikhTeks)}-${d.tajuk}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export interface HasilSimpanDraf {
  ok: boolean;
  mesej: string;
  dicipta?: number;
  dilangkau?: number;
}

/**
 * Simpan draf yang dipilih sebagai pos berstatus `draf`.
 *
 * Kunci acara dihantar, bukan teks ayat. Ayat dibina semula di pelayan dari
 * takwim yang sama — teks yang datang dari pelayar ialah teks yang boleh
 * diubah dalam pelayar, dan pengumuman rasmi sekolah bukan tempat untuk itu.
 */
export async function simpanDrafTakwim(kunci: string[]): Promise<HasilSimpanDraf> {
  try {
    await pastikanBoleh("terbit_kandungan");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  if (kunci.length === 0) return { ok: false, mesej: "Tiada acara dipilih." };

  try {
    const [program, mesyuarat] = await Promise.all([
      barisIkutKod("takwim"),
      barisIkutKod("mesyuarat"),
    ]);
    const acara = [
      ...(program ? leraiTakwim(program.lajur, program.baris) : []),
      ...(mesyuarat ? leraiTakwim(mesyuarat.lajur, mesyuarat.baris) : []),
    ];
    const pilih = new Set(kunci);
    const draf = janaDraf(acara, hariIniMY()).filter((d) => pilih.has(d.kunci));
    if (draf.length === 0) {
      return { ok: false, mesej: "Acara yang dipilih tidak ditemui dalam takwim." };
    }

    const db = klienTulis();
    const sedia = (await db.minta(
      "web_pos?select=slug&jenis=eq.pengumuman",
    )) as { slug: string }[];
    const slugSedia = new Set(sedia.map((s) => s.slug));

    const baharu = draf.filter((d) => !slugSedia.has(slugDraf(d)));
    const dilangkau = draf.length - baharu.length;

    // Satu sisipan setiap 50, dan `ignore-duplicates` pada slug: dua admin
    // yang menekan serentak tidak boleh mencipta pengumuman berkembar.
    for (let i = 0; i < baharu.length; i += 50) {
      const muatan = baharu.slice(i, i + 50).map((d) => ({
        jenis: "pengumuman",
        tajuk: d.tajuk,
        slug: slugDraf(d),
        kategori: d.kategori,
        ringkasan: d.ayat,
        kandungan: d.ayat,
        keutamaan: d.kategori === "cuti" || d.kategori === "ibubapa" ? "utama" : "biasa",
        status: "draf",
        updated_at: new Date().toISOString(),
      }));
      if (muatan.length === 0) continue;
      await db.minta("web_pos?on_conflict=slug", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(muatan),
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/pos");
    return {
      ok: true,
      dicipta: baharu.length,
      dilangkau,
      mesej:
        `${baharu.length} draf pengumuman dicipta` +
        (dilangkau > 0 ? `, ${dilangkau} dilangkau kerana sudah wujud` : "") +
        ". Semuanya berstatus DRAF — buka Urus Pos untuk menyunting dan menerbitkan.",
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

function ralat(e: unknown): string {
  return (
    "Sistem gagal. Tunjukkan mesej ini kepada admin: " +
    (e instanceof Error ? `${e.name}: ${e.message}` : String(e))
  );
}
