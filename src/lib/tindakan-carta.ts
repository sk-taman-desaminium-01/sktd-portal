"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { pastikanBoleh } from "./akses";
import { SEKOLAH } from "@/data/sekolah";
import {
  dokumenTerkini, seksyenDokumen, barisSeksyen,
  tambahBaris, padamBaris,
} from "./pengurusan";
import { pindaBarisKekal, tambahPindaan, senaraiPindaan } from "./pindaan";
import { kenakanPindaan } from "@/data/pindaan";
import {
  binaCarta, kiraOrang, kiraPenempatan, type SeksyenCarta,
} from "./carta";
import { senaraiPentadbir } from "./pentadbir";
import type { NodCarta } from "@/data/carta";
import { kunciNama } from "./nama";
import { kenakanPindaanEdisi } from "./tindakan-pengurusan";

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

    // PINDAAN AKTIF DIKENAKAN SEMASA BACA.
    //
    // Baris dalam pangkalan data ialah apa yang TERCETAK dalam buku. Pindaan
    // (pertukaran PKP, PK, guru) hanya ditulis ke dalam baris semasa muat
    // naik edisi baharu atau bila admin menekan "Kenakan pindaan". Tanpa
    // langkah ini, kad atas carta memaparkan nama terkini sementara setiap
    // jawatankuasa di bawah kekal memaparkan nama lama — tepat seperti yang
    // dilaporkan (Yusri/Nazrullah, Rafli/Lokman). Ini bacaan sahaja: tiada
    // tulisan, jadi rekod asal buku kekal utuh.
    let pindaanAktif: Awaited<ReturnType<typeof senaraiPindaan>> = [];
    try {
      pindaanAktif = (await senaraiPindaan()).filter((p) => p.aktif);
    } catch {
      // Modul pindaan belum dipasang — carta tetap dibina dari buku.
    }

    for (const s of seksyen) {
      const asalBaris = await barisSeksyen(s.id);
      const baris = pindaanAktif.length === 0 ? asalBaris : asalBaris.flatMap((b) => {
        const kesan = kenakanPindaan(b.sel, pindaanAktif);
        return kesan.gugur ? [] : [{ ...b, sel: kesan.sel }];
      });
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
  barisId: string, sel: string[], namaLama?: string,
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

    // NAMA DITUKAR = TUKAR DI SETIAP TEMPAT, bukan pada baris ini sahaja.
    //
    // Seorang PKP muncul dalam belasan jawatankuasa. Menyunting kad carta
    // hanya menulis semula SATU baris, jadi kad atas memaparkan nama baharu
    // sementara unit di bawah kekal memaparkan nama buku — persis yang
    // dilaporkan pengguna (Yusri/Nazrullah, Rafli/Lokman). Maka: satu
    // pindaan `ganti_nama` dicipta DAN dikenakan pada edisi semasa serta-merta.
    const namaBaharu = namaSelDalamBaris(bersih, namaLama);
    let merebak = "";
    if (namaLama && namaBaharu && kunciNama(namaLama) !== kunciNama(namaBaharu)) {
      try {
        await tambahPindaan({
          jenis: "ganti_nama", dari: namaLama, kepada: namaBaharu,
          sebab: "Kemas kini nama dari Carta Organisasi", oleh: saya.emel ?? null,
        });
        merebak = " Nama ini dikemas kini di semua jawatankuasa.";
        // PEMBETULAN SELURUH EDISI DIJALANKAN SELEPAS JAWAPAN DIHANTAR.
        //
        // Buku 180 muka surat bermakna ribuan baris; menunggunya siap dalam
        // permintaan yang sama menyebabkan fungsi Vercel tamat masa, dan
        // pengguna melihat "sambungan terputus" sedangkan suntingan SUDAH
        // tersimpan. Carta pula mengenakan pindaan semasa BACA, jadi nama
        // betul kelihatan serta-merta walaupun tulisan ini masih berjalan.
        const dok = await dokumenTerkini();
        if (dok) {
          const jalankan = async () => {
            try { await kenakanPindaanEdisi(dok.id); }
            catch (e) { console.error("[carta] pindaan edisi gagal", e); }
          };
          try { after(jalankan); } catch { void jalankan(); }
        }
      } catch (e) {
        // Suntingan baris SUDAH tersimpan — kegagalan merebak tidak boleh
        // membatalkannya, tetapi puncanya mesti dilihat pengguna.
        merebak = ` Nama pada kad ini disimpan, TETAPI penyebaran ke jawatankuasa lain gagal: ${ralat(e)}`;
      }
    }
    revalidatePath("/admin/carta");
    revalidatePath("/admin/pengurusan");
    return { ok: true, mesej: `Disimpan.${merebak || " Pindaan disimpan untuk muat naik akan datang."}` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/**
 * Sel mana dalam baris yang membawa NAMA orang itu?
 *
 * Baris jawatankuasa ialah [unit, jawatan, nama]; senarai guru pula
 * [bil, nama, kod, opsyen]. Daripada meneka kedudukan, sel dipilih
 * mengikut sel yang PALING hampir dengan nama lama — dan bila nama lama
 * tiada, sel terpanjang yang berupa nama digunakan.
 */
function namaSelDalamBaris(sel: string[], namaLama?: string): string {
  const calon = sel.filter((c) => c.trim().length > 3 && kunciNama(c).split(" ").length >= 2);
  if (calon.length === 0) return "";
  if (!namaLama) return calon[0];
  const kunciL = kunciNama(namaLama);
  const sama = calon.find((c) => kunciNama(c) === kunciL);
  if (sama) return sama;
  // Nama bertukar: ambil calon yang BUKAN sel jawatan/unit — iaitu sel pada
  // kedudukan yang sama seperti nama lama dalam baris asal, jika ada.
  return calon[calon.length - 1];
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
