"use server";

import { revalidatePath } from "next/cache";
import { pengguna, pastikanBoleh } from "./akses";
import { boleh } from "./peranan";
import {
  senaraiBarang, simpanBarang, padamBarang, permohonanSemua, permohonanSaya,
  simpanPermohonan, putuskanPermohonan, batalPermohonan, penyeliaUnit,
  tambahPenyelia, buangPenyelia,
} from "./inventori";
import { semakPermohonan, NAMA_STATUS, type Barang, type Permohonan, type StatusPermohonan } from "@/data/inventori";
import { hantar, emelIkutPeranan } from "./notifikasi";

const UNIT = "ICT";

export interface HasilInventori {
  ok: boolean;
  mesej: string;
  /** Rekod baharu dengan id SEBENAR — lihat nota dalam tindakan-bilik.ts. */
  rekod?: { id: string };
}

function belumPasang(e: unknown): boolean {
  const t = e instanceof Error ? e.message : String(e);
  return /inventori_|42P01|does not exist|Not Found|404/i.test(t);
}

function ralat(e: unknown): string {
  return "Sistem gagal. Tunjukkan mesej ini kepada admin: " +
    (e instanceof Error ? `${e.name}: ${e.message}` : String(e));
}

export interface PapanInventori {
  belumSedia: boolean;
  barang: Barang[];
  /** Permohonan yang boleh dilihat: semua bagi penyelia, sendiri bagi guru. */
  permohonan: Permohonan[];
  penyelia: string[];
  sayaEmel: string;
  /** Boleh meluluskan permohonan dan mengurus senarai barang. */
  bolehUrus: boolean;
  /** Boleh melantik penyelia — admin sahaja. */
  bolehLantik: boolean;
}

export async function papanInventori(): Promise<PapanInventori | null> {
  const saya = await pengguna();
  if (!saya?.peranan) return null;

  const emel = (saya.emel ?? "").toLowerCase();
  const asas = {
    sayaEmel: emel,
    bolehLantik: boleh(saya.peranan, "urus_akses"),
  };

  try {
    const penyelia = await penyeliaUnit(UNIT);
    // Penyelia unit ATAU pentadbir. Ketua unit ICT meminta kedua-duanya:
    // "unit ict / admin boleh dapat noti tempahan2 ni".
    const bolehUrus = penyelia.includes(emel) || boleh(saya.peranan, "urus_bilik");

    const [barang, permohonan] = await Promise.all([
      senaraiBarang(UNIT, bolehUrus),
      bolehUrus ? permohonanSemua() : permohonanSaya(emel),
    ]);

    return { ...asas, belumSedia: false, barang, permohonan, penyelia, bolehUrus };
  } catch (e) {
    if (belumPasang(e)) {
      return { ...asas, belumSedia: true, barang: [], permohonan: [], penyelia: [], bolehUrus: false };
    }
    throw e;
  }
}

/* -------------------------------------------------------------- permohonan */

export async function mohonTindakan(data: {
  barang_id: string; kuantiti: number; tujuan: string; perlu_pada: string;
}): Promise<HasilInventori> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };

  try {
    const barang = (await senaraiBarang(UNIT)).find((b) => b.id === data.barang_id);
    const semak = semakPermohonan(data, barang);
    if (!semak.ok) return { ok: false, mesej: semak.sebab ?? "Permohonan tidak sah." };

    const rekod = await simpanPermohonan({
      barang_id: data.barang_id,
      kuantiti: data.kuantiti,
      tujuan: data.tujuan.trim(),
      perlu_pada: data.perlu_pada || null,
      oleh: (saya.emel ?? "").toLowerCase(),
      nama: saya.nama ?? saya.emel ?? "",
    });

    // Penyelia unit DAN pentadbir diberitahu. Kegagalan di sini tidak
    // membatalkan permohonan yang sudah tersimpan.
    await hantar({
      penerima: [...(await penyeliaUnit(UNIT)), ...(await emelIkutPeranan(["unit_ict"]))],
      jenis: "inventori",
      tajuk: `Permohonan ${barang?.nama ?? "barang"} · ${data.kuantiti} unit`,
      teks:
        `${saya.nama ?? saya.emel} memohon ${data.kuantiti} ${barang?.nama ?? "barang"}. ` +
        `Tujuan: ${data.tujuan.trim()}` +
        (data.perlu_pada ? ` · diperlukan ${data.perlu_pada}` : ""),
      pautan: "/inventori",
      oleh: saya.emel ?? null,
    });

    revalidatePath("/inventori");
    revalidatePath("/bilik");
    return {
      ok: true,
      rekod: rekod ? { id: rekod.id } : undefined,
      mesej:
        (semak.sebab ? semak.sebab + " " : "") +
        "Permohonan dihantar. Unit akan dimaklumkan.",
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function putuskanTindakan(
  id: string, status: StatusPermohonan, catatan: string,
): Promise<HasilInventori> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  const emel = (saya.emel ?? "").toLowerCase();

  try {
    const penyelia = await penyeliaUnit(UNIT);
    if (!penyelia.includes(emel) && !boleh(saya.peranan, "urus_bilik")) {
      return { ok: false, mesej: "Hanya penyelia unit atau pentadbir boleh memutuskan." };
    }
    if (status === "tolak" && catatan.trim().length < 3) {
      // Penolakan tanpa sebab menghantar guru bertanya secara peribadi —
      // iaitu tepat kerja yang modul ini wujud untuk hapuskan.
      return { ok: false, mesej: "Tulis sebab penolakan. Guru perlu tahu kenapa." };
    }

    const rekod = await putuskanPermohonan(id, status, catatan.trim() || null, emel);
    if (rekod) {
      const barang = (await senaraiBarang(UNIT, true)).find((b) => b.id === rekod.barang_id);
      await hantar({
        penerima: [rekod.oleh],
        jenis: "inventori",
        tajuk: `Permohonan ${barang?.nama ?? "barang"} — ${NAMA_STATUS[status]}`,
        teks:
          `Permohonan anda untuk ${rekod.kuantiti} ${barang?.nama ?? "barang"} ` +
          `telah ${NAMA_STATUS[status].toLowerCase()}.` +
          (rekod.catatan ? ` Catatan: ${rekod.catatan}` : ""),
        pautan: "/inventori",
        oleh: saya.emel ?? null,
      });
    }

    revalidatePath("/inventori");
    return { ok: true, mesej: `Permohonan ditanda ${NAMA_STATUS[status].toLowerCase()}. Pemohon dimaklumkan.` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function batalTindakan(id: string): Promise<HasilInventori> {
  const saya = await pengguna();
  if (!saya?.emel) return { ok: false, mesej: "Tiada kebenaran." };
  try {
    await batalPermohonan(id, saya.emel);
    revalidatePath("/inventori");
    return { ok: true, mesej: "Permohonan dibatalkan." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/* ------------------------------------------------------------------ barang */

async function pastikanPenyelia(): Promise<string> {
  const saya = await pengguna();
  const emel = (saya?.emel ?? "").toLowerCase();
  const penyelia = await penyeliaUnit(UNIT);
  if (!penyelia.includes(emel) && !boleh(saya?.peranan ?? null, "urus_bilik")) {
    throw new Error("Hanya penyelia unit atau pentadbir boleh mengurus senarai barang.");
  }
  return emel;
}

export async function simpanBarangTindakan(b: {
  id?: string; nama: string; kategori: string; kuantiti: string;
  lokasi: string; nota: string; aktif: boolean;
}): Promise<HasilInventori> {
  try {
    await pastikanPenyelia();
    const nama = b.nama.trim();
    if (nama.length < 2) return { ok: false, mesej: "Nama barang diperlukan." };
    const kuantiti = Number(b.kuantiti);
    if (!Number.isInteger(kuantiti) || kuantiti < 0 || kuantiti > 100000) {
      return { ok: false, mesej: "Kuantiti mesti nombor bulat antara 0 dan 100,000." };
    }
    const rekod = await simpanBarang({
      id: b.id, unit: UNIT, nama,
      kategori: b.kategori.trim() || null,
      kuantiti,
      lokasi: b.lokasi.trim() || null,
      nota: b.nota.trim() || null,
      aktif: b.aktif,
    });
    revalidatePath("/inventori");
    revalidatePath("/bilik");
    return {
      ok: true,
      rekod: rekod ? { id: rekod.id } : undefined,
      mesej: b.id ? "Barang dikemas kini." : `"${nama}" ditambah.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function padamBarangTindakan(id: string): Promise<HasilInventori> {
  try {
    await pastikanPenyelia();
    const hasil = await padamBarang(id);
    revalidatePath("/inventori");
    return {
      ok: true,
      mesej: hasil === "dipadam"
        ? "Barang dipadam."
        : "Barang ini pernah dimohon, jadi ia DISEMBUNYIKAN dan bukan dipadam — " +
          "rekod permohonan lamanya kekal utuh.",
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/* ---------------------------------------------------------------- penyelia */

export async function tambahPenyeliaTindakan(emel: string): Promise<HasilInventori> {
  try {
    await pastikanBoleh("urus_akses");
    const e = emel.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, mesej: "Emel tidak sah." };
    await tambahPenyelia(UNIT, e);
    revalidatePath("/inventori");
    return { ok: true, mesej: `${e} kini menerima permohonan unit ${UNIT}.` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function buangPenyeliaTindakan(emel: string): Promise<HasilInventori> {
  try {
    await pastikanBoleh("urus_akses");
    await buangPenyelia(UNIT, emel);
    revalidatePath("/inventori");
    return { ok: true, mesej: "Penyelia dibuang." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}
