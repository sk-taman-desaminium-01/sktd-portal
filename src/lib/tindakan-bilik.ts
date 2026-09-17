"use server";

import { revalidatePath } from "next/cache";
import { pengguna, pastikanBoleh } from "./akses";
import { boleh } from "./peranan";
import {
  senaraiBilik, tempahanJulat, tempahanBilikTarikh, simpanTempahan,
  batalTempahan, satuTempahan, simpanBilik, hariIniMY,
} from "./bilik";
import { semakTempahan, type Bilik, type Tempahan } from "@/data/bilik";

/**
 * Tempahan Bilik Khas — tindakan pelayan.
 *
 * SEMAKAN PERTINDIHAN BERLAKU DI SINI, bukan hanya dalam pelayar. Pelayar
 * menyemak untuk memberi jawapan segera; pelayan menyemak kerana dua guru
 * boleh menekan "Tempah" dalam saat yang sama, dan hanya pelayan melihat
 * kedua-duanya.
 *
 * Pangkalan data menyemaknya SEKALI LAGI dengan kekangan EXCLUDE (lihat
 * supabase/bilik.sql). Tiga lapisan bukan berlebihan: dua permintaan serentak
 * boleh kedua-duanya lulus semakan pelayan sebelum salah satu menulis, dan
 * hanya kekangan pangkalan data menangkap keadaan itu.
 */

export interface HasilBilik {
  ok: boolean;
  mesej: string;
}

function ralat(e: unknown): string {
  const teks = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  // Kekangan pangkalan data bercakap dalam bahasa Postgres. Diterjemah di
  // sini, sekali, supaya guru tidak pernah melihat "conflicting key value
  // violates exclusion constraint".
  if (/exclusion constraint|tempahan_tiada_tindih|23P01/i.test(teks)) {
    return "Bilik itu baru sahaja ditempah orang lain untuk waktu yang sama. Muat semula dan cuba waktu lain.";
  }
  return "Sistem gagal. Tunjukkan mesej ini kepada admin: " + teks;
}

export interface PapanBilik {
  bilik: Bilik[];
  tempahan: Tempahan[];
  hariIni: string;
  dari: string;
  hingga: string;
  sayaEmel: string;
  bolehUrus: boolean;
}

/** Baca papan tempahan untuk julat tarikh. Lalai: 14 hari dari hari ini. */
export async function papanBilik(dari?: string, hari = 14): Promise<PapanBilik | null> {
  const saya = await pengguna();
  if (!saya?.peranan) return null;

  const hariIni = hariIniMY();
  const mula = dari && /^\d{4}-\d{2}-\d{2}$/.test(dari) ? dari : hariIni;
  const akhir = tambahHari(mula, hari);

  const [bilik, tempahan] = await Promise.all([
    senaraiBilik(),
    tempahanJulat(mula, akhir),
  ]);

  return {
    bilik, tempahan, hariIni, dari: mula, hingga: akhir,
    sayaEmel: saya.emel ?? "",
    bolehUrus: boleh(saya.peranan, "urus_bilik"),
  };
}

function tambahHari(iso: string, n: number): string {
  const [y, b, h] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, b - 1, h + n));
  return d.toISOString().slice(0, 10);
}

export async function tempahTindakan(data: {
  bilik_id: string; tarikh: string; mula: string; tamat: string; tujuan: string;
}): Promise<HasilBilik> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };

  const tujuan = data.tujuan.trim();
  if (tujuan.length < 3) {
    return { ok: false, mesej: "Tulis tujuan tempahan — itu yang guru lain baca sebelum bertanya." };
  }
  if (!data.bilik_id) return { ok: false, mesej: "Pilih bilik." };

  try {
    const sedia = await tempahanBilikTarikh(data.bilik_id, data.tarikh);
    const semak = semakTempahan(data, sedia, hariIniMY());
    if (!semak.ok) return { ok: false, mesej: semak.sebab ?? "Tempahan tidak sah." };

    await simpanTempahan({
      bilik_id: data.bilik_id,
      tarikh: data.tarikh,
      mula: data.mula,
      tamat: data.tamat,
      tujuan,
      oleh: saya.emel ?? "",
      nama: saya.nama ?? saya.emel ?? "",
    });
    revalidatePath("/bilik");
    return { ok: true, mesej: `Bilik ditempah ${data.mula}–${data.tamat}.` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/**
 * Batal tempahan.
 *
 * Guru membatalkan tempahan SENDIRI. Membatalkan tempahan orang lain
 * memerlukan `urus_bilik` — kalau tidak, sesiapa boleh mengosongkan bilik
 * yang ditempah orang lain sejam sebelum majlis.
 */
export async function batalTindakan(id: string): Promise<HasilBilik> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  try {
    const t = await satuTempahan(id);
    if (!t) return { ok: false, mesej: "Tempahan itu tiada." };
    const milikSaya = t.oleh !== "" && t.oleh === saya.emel;
    if (!milikSaya && !boleh(saya.peranan, "urus_bilik")) {
      return { ok: false, mesej: "Hanya penempah atau pentadbir boleh membatalkan tempahan ini." };
    }
    await batalTempahan(id);
    revalidatePath("/bilik");
    return { ok: true, mesej: "Tempahan dibatalkan." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function simpanBilikTindakan(b: {
  id?: string; nama: string; muatan: string; nota: string; aktif: boolean;
}): Promise<HasilBilik> {
  try {
    await pastikanBoleh("urus_bilik");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  const nama = b.nama.trim();
  if (nama.length < 2) return { ok: false, mesej: "Nama bilik diperlukan." };
  const muatan = b.muatan.trim() === "" ? null : Number(b.muatan);
  if (muatan !== null && (!Number.isInteger(muatan) || muatan < 1 || muatan > 2000)) {
    return { ok: false, mesej: "Muatan mesti nombor antara 1 dan 2000." };
  }
  try {
    await simpanBilik({ id: b.id, nama, muatan, nota: b.nota.trim() || null, aktif: b.aktif });
    revalidatePath("/bilik");
    return { ok: true, mesej: b.id ? "Bilik dikemas kini." : `Bilik "${nama}" ditambah.` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}
