"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { SEKOLAH } from "@/data/sekolah";
import {
  dokumenTerkini, seksyenDokumen, barisSeksyen,
  tambahBaris, padamBaris,
} from "./pengurusan";
import { pindaBarisKekal } from "./pindaan";
import {
  binaCarta, kiraOrang, kiraPenempatan, type SeksyenCarta,
} from "./carta";
import { senaraiPentadbir } from "./pentadbir";
import type { NodCarta } from "@/data/carta";

/**
 * Carta organisasi — dibina dari Buku Pengurusan yang tersimpan.
 *
 * Seksyen DRAF turut digunakan, bukan yang disahkan sahaja. Sebabnya praktikal:
 * carta ialah cara paling cepat untuk MELIHAT sama ada bacaan itu betul.
 * Menuntut pengesahan dahulu bermakna admin mengesahkan 2,000 baris secara
 * buta sebelum melihat hasilnya. Carta menandakan sendiri bila sumbernya
 * masih draf.
 */

export interface HasilCarta {
  ok: boolean;
  mesej: string;
  punca?: NodCarta;
  bilOrang?: number;
  bilPenempatan?: number;
  tidakDitempatkan?: string[];
  semuaDisahkan?: boolean;
  tahun?: number;
}

export async function ambilCarta(): Promise<HasilCarta> {
  try {
    await pastikanBoleh("urus_pengurusan");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  try {
    const dok = await dokumenTerkini();
    if (!dok) {
      return {
        ok: false,
        mesej: "Belum ada Buku Pengurusan disimpan. Muat naik buku tahunan dahulu.",
      };
    }

    const seksyen = await seksyenDokumen(dok.id);
    if (seksyen.length === 0) return { ok: false, mesej: "Edisi itu tiada seksyen." };

    const untuk: SeksyenCarta[] = [];
    const penunjuk: Record<string, string> = {};

    for (const s of seksyen) {
      const baris = await barisSeksyen(s.id);
      if (s.tajuk.toUpperCase().includes("PENUNJUK KOD")) {
        for (const b of baris) {
          const [kod, nama] = b.sel;
          if (kod && nama) penunjuk[kod.trim().toUpperCase()] = nama.trim();
        }
        continue;
      }
      untuk.push({
        kod: s.kod, tajuk: s.tajuk, bentuk: bentukSeksyen(s.lajur ?? []),
        lajur: s.lajur ?? [],
        baris: baris.map((b) => ({ id: b.id, sel: b.sel })),
      });
    }

    // Barisan Pentadbir ialah yang TERKINI; buku ialah rekod bertarikh.
    // Guru Besar dan Penolong Kanan sudah bertukar sejak buku dicetak, jadi
    // carta mengikut senarai yang manusia jaga, bukan senarai yang dicetak.
    let terkini: { jawatan: string; nama: string }[] = [];
    try {
      terkini = (await senaraiPentadbir()).map((p) => ({ jawatan: p.jawatan, nama: p.nama }));
    } catch {
      // Tiada kebenaran atau tiada data — carta tetap dibina dari buku.
    }

    const { punca, tidakDitempatkan } = binaCarta(untuk, SEKOLAH.namaPenuh, penunjuk, terkini);
    const barisAsal = new Map(untuk.flatMap((s) => s.baris.map((b) => [b.id, b.sel] as const)));
    function isiSel(n: NodCarta) {
      if (n.barisId) n.selAsal = barisAsal.get(n.barisId);
      n.anak.forEach(isiSel);
    }
    isiSel(punca);
    return {
      ok: true,
      punca,
      bilOrang: kiraOrang(punca),
      bilPenempatan: kiraPenempatan(punca),
      tidakDitempatkan: tidakDitempatkan.map((w) => w.nama),
      semuaDisahkan: seksyen.every((s) => s.status === "disahkan"),
      tahun: dok.tahun,
      mesej: `Carta dibina dari Buku Pengurusan edisi ${dok.tahun}.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/* -------------------------------------------------------------- suntingan */

export async function suntingNod(
  barisId: string, sel: string[],
): Promise<{ ok: boolean; mesej: string }> {
  try {
    await pastikanBoleh("urus_pengurusan");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  try {
    const bersih = sel.map((c) => (c ?? "").toString().trim());
    if (bersih.every((c) => c === "")) {
      return { ok: false, mesej: "Baris kosong. Guna Padam kalau mahu membuangnya." };
    }
    const saya = await pastikanBoleh("urus_pengurusan");
    await pindaBarisKekal(barisId, bersih, saya.emel ?? null);
    revalidatePath("/admin/carta");
    return { ok: true, mesej: "Disimpan bersama pindaan untuk muat naik akan datang." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/** Pemadaman dan pindaan kekal mesti berjaya serentak. */
export async function padamNod(barisId: string, kekal = true): Promise<{ ok: boolean; mesej: string }> {
  try {
    const saya = await pastikanBoleh("urus_pengurusan");
    if (kekal) await pindaBarisKekal(barisId, null, saya.emel ?? null);
    else await padamBaris(barisId);
    revalidatePath("/admin/carta");
    revalidatePath("/admin/pengurusan");
    return { ok: true, mesej: "Baris dibuang dan pindaan disimpan." };
  } catch (e) { return { ok: false, mesej: ralat(e) }; }
}

export async function tambahNod(
  seksyenId: string, sel: string[],
): Promise<{ ok: boolean; mesej: string }> {
  try {
    await pastikanBoleh("urus_pengurusan");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  try {
    await tambahBaris(seksyenId, sel.map((c) => (c ?? "").toString().trim()));
    revalidatePath("/admin/carta");
    return { ok: true, mesej: "Ditambah." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/**
 * Bentuk seksyen dari nama lajurnya.
 *
 * Bentuk tidak disimpan dalam pangkalan data — hanya lajur. Itu memadai:
 * seksyen bidang tugas sentiasa mempunyai lajur ["Peranan", "Bidang Tugas"],
 * dan itu bukan bentuk yang muncul secara kebetulan.
 */
function bentukSeksyen(lajur: string[]): string | undefined {
  return lajur[1]?.toLowerCase() === "bidang tugas" ? "tugas" : undefined;
}

function ralat(e: unknown): string {
  return "Sistem gagal. Tunjukkan mesej ini kepada admin: " +
    (e instanceof Error ? `${e.name}: ${e.message}` : String(e));
}
