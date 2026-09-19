"use server";

import { revalidatePath } from "next/cache";
import { pengguna, pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { hantar, emelIkutPeranan } from "./notifikasi";
import { emelGuruKelas } from "./guru-kelas";
import { belumDipasang } from "./db-belum-sedia";
import { senaraiPentadbirUntukSemua } from "./pentadbir";
import { SEKOLAH } from "@/data/sekolah";

/**
 * Borang Sekolah — surat rasmi ringkas & Borang Kebenaran Gambar
 * (permintaan pengguna A.1/A.2/A.4, B.3).
 *
 * SATU JADUAL, `jenis` membezakan bentuk (permintaan "jimat kuota" — bukan
 * satu jadual setiap jenis borang). Medan yang khusus kepada satu jenis
 * borang disimpan dalam `data` (jsonb) supaya jenis borang baharu tidak
 * memerlukan migrasi skema baharu.
 *
 * ALIRAN "rasmi": guru isi → Urusan Pejabat (kerani/pentadbir/admin) diberi
 * tahu → kerani isi rujukan kami → status "selesai".
 * ALIRAN "gambar": guru kelas/pentadbir isi bagi pihak ibu bapa (tiada log
 * masuk ibu bapa dalam skop semasa — lihat nota di `bina/borang`), status
 * terus "selesai" apabila keputusan direkod.
 */

export type JenisSurat = "rasmi" | "gambar";
export type StatusSurat = "baharu" | "selesai";

export interface DataSuratRasmi {
  alamat: string;
  tarikh: string; // ISO yyyy-mm-dd
  isi: string;
  wakilGbNama: string;
  wakilGbJawatan: string;
}

export interface DataSuratGambar {
  penjagaNama?: string; penjagaKp?: string; alamat?: string; telefon?: string; muridKp?: string;
  muridNama: string;
  muridKelas: string;
  bersetuju: boolean;
  catatan?: string;
}

export interface BarisSurat {
  id: string;
  jenis: JenisSurat;
  status: StatusSurat;
  tajuk: string;
  rujukan_kami: string | null;
  pemohon_nama: string;
  pemohon_emel: string;
  tandatangan_url: string | null;
  data: DataSuratRasmi | DataSuratGambar;
  dicipta: string;
}

export type HasilSurat = { ok: boolean; mesej: string; id?: string };

const PERANAN_PEJABAT = ["kerani", "pentadbir", "admin", "admin_mutlak"];

export async function hantarSuratRasmi(input: {
  tajuk: string; alamat: string; tarikh: string; isi: string;
  wakilGbNama: string; wakilGbJawatan: string; tandatangan_url: string | null;
}): Promise<HasilSurat> {
  if (input.tandatangan_url && (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(input.tandatangan_url) || input.tandatangan_url.length > 350000))
    return { ok: false, mesej: "Tandatangan tidak sah. Lukis atau muat naik semula." };
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };

  const tajuk = input.tajuk.trim();
  const isi = input.isi.trim();
  const alamat = input.alamat.trim();
  if (!tajuk) return { ok: false, mesej: "Tajuk surat diperlukan." };
  if (!isi) return { ok: false, mesej: "Isi surat diperlukan." };
  if (!alamat) return { ok: false, mesej: "Alamat penerima diperlukan." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarikh)) return { ok: false, mesej: "Tarikh tidak sah." };
  if (!input.wakilGbNama.trim()) return { ok: false, mesej: "Pilih Guru Besar / wakil." };

  const pentadbir = await senaraiPentadbirUntukSemua();
  const wakil = pentadbir.find((p) => p.nama === input.wakilGbNama && p.jawatan === input.wakilGbJawatan);
  if (!wakil) return { ok: false, mesej: "Senarai pentadbir berubah. Muat semula dan pilih penandatangan." };
  const db = klienTulis();
  let baris: { id: string }[];
  try {
    baris = (await db.minta("pbd_surat", {
      method: "POST",
      body: JSON.stringify({
        jenis: "rasmi",
        status: "baharu",
        tajuk,
        pemohon_id: saya.id,
        pemohon_nama: saya.nama ?? saya.emel,
        pemohon_emel: saya.emel,
        tandatangan_url: input.tandatangan_url,
        data: {
          alamat, tarikh: input.tarikh, isi,
          wakilGbNama: input.wakilGbNama.trim(),
          wakilGbJawatan: input.wakilGbJawatan.trim(),
        },
      }),
    })) as { id: string }[];
  } catch (e) {
    if (belumDipasang(e, "pbd_surat")) {
      return { ok: false, mesej: "Ciri ini belum dipasang — admin perlu jalankan SQL Borang Sekolah dahulu." };
    }
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menghantar." };
  }

  const id = baris[0]?.id;
  await beritahuPejabat(tajuk, saya.nama ?? saya.emel, saya.emel);

  revalidatePath("/borang");
  revalidatePath("/pejabat");
  return { ok: true, mesej: "Surat dihantar ke Urusan Pejabat.", id };
}

async function beritahuPejabat(tajuk: string, oleh: string, olehEmel: string) {
  const penerima = await emelIkutPeranan(PERANAN_PEJABAT).catch(() => [] as string[]);
  if (penerima.length === 0) return;
  await hantar({
    penerima, jenis: "surat", tajuk: "Surat rasmi baharu",
    teks: `${oleh} menghantar "${tajuk}" — perlu nombor rujukan kami.`,
    pautan: "/pejabat", oleh: olehEmel,
  }).catch(() => {});
}

export async function hantarSuratGambar(input: {
  muridNama: string; muridKelas: string; bersetuju: boolean; catatan?: string;
  penjagaNama: string; penjagaKp: string; alamat: string; telefon: string; muridKp: string;
  tandatangan_url: string | null;
}): Promise<HasilSurat> {
  if (input.tandatangan_url && (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(input.tandatangan_url) || input.tandatangan_url.length > 350000))
    return { ok: false, mesej: "Tandatangan tidak sah. Lukis atau muat naik semula." };
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  const muridNama = input.muridNama.trim();
  const muridKelas = input.muridKelas.trim();
  if (!muridNama) return { ok: false, mesej: "Nama murid diperlukan." };
  if (!muridKelas) return { ok: false, mesej: "Kelas murid diperlukan." };

  if (!input.penjagaNama?.trim() || !input.alamat?.trim() || !input.telefon?.trim() ||
      !/^\d{12}$/.test(input.penjagaKp?.replace(/[- ]/g, "")) || !/^\d{12}$/.test(input.muridKp?.replace(/[- ]/g, "")) || typeof input.bersetuju !== "boolean")
    return { ok: false, mesej: "Lengkapkan nama penjaga, alamat, telefon dan No. KP/MyKid 12 digit." };
  const db = klienTulis();
  let id: string | undefined;
  try {
    const rows = await db.minta("pbd_surat", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        jenis: "gambar",
        status: "selesai",
        tajuk: `Kebenaran Gambar — ${muridNama}`,
        pemohon_id: saya.id,
        pemohon_nama: saya.nama ?? saya.emel,
        pemohon_emel: saya.emel,
        tandatangan_url: input.tandatangan_url,
        data: {
          penjagaNama: input.penjagaNama.trim(), penjagaKp: input.penjagaKp, alamat: input.alamat.trim(), telefon: input.telefon.trim(), muridKp: input.muridKp,
          muridNama, muridKelas, bersetuju: input.bersetuju,
          catatan: input.catatan?.trim() || undefined,
        },
      }),
    }) as { id: string }[];
    id = rows[0]?.id;
  } catch (e) {
    if (belumDipasang(e, "pbd_surat")) {
      return { ok: false, mesej: "Ciri ini belum dipasang — admin perlu jalankan SQL Borang Sekolah dahulu." };
    }
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." };
  }

  // Guru kelas murid ini diberitahu keputusan (permintaan A.4).
  const emelGk = await emelGuruKelas(muridKelas).catch(() => [] as string[]);
  if (emelGk.length > 0) {
    await hantar({
      penerima: emelGk, jenis: "borang",
      tajuk: "Kebenaran Gambar direkod",
      teks: `${muridNama} (${muridKelas}): ibu bapa ${input.bersetuju ? "BERSETUJU" : "TIDAK BERSETUJU"} gambar diambil.`,
      pautan: "/borang", oleh: saya.emel,
    }).catch(() => {});
  }

  revalidatePath("/borang");
  return { ok: true, id, mesej: "Direkod." };
}

/** Surat yang SAYA hantar (bukan skrin pejabat). */
export async function senaraiSuratSaya(): Promise<{ belumSedia: boolean; senarai: BarisSurat[] }> {
  const saya = await pengguna();
  if (!saya?.peranan) return { belumSedia: false, senarai: [] };
  const db = klienTulis();
  try {
    const senarai = (await db.minta(
      `pbd_surat?select=id,jenis,status,tajuk,rujukan_kami,pemohon_nama,pemohon_emel,tandatangan_url,data,dicipta` +
        `&pemohon_emel=eq.${encodeURIComponent(saya.emel)}&order=dicipta.desc&limit=100`,
    )) as BarisSurat[];
    return { belumSedia: false, senarai };
  } catch (e) {
    if (belumDipasang(e, "pbd_surat")) return { belumSedia: true, senarai: [] };
    throw e;
  }
}

/** Peti masuk Urusan Pejabat — kerani, pentadbir & admin sahaja. */
export async function senaraiSuratPejabat(): Promise<{ belumSedia: boolean; senarai: BarisSurat[] }> {
  await pastikanBoleh("urus_pejabat");
  const db = klienTulis();
  try {
    const senarai = (await db.minta(
      `pbd_surat?select=id,jenis,status,tajuk,rujukan_kami,pemohon_nama,pemohon_emel,tandatangan_url,data,dicipta` +
        `&jenis=eq.rasmi&order=dicipta.desc&limit=200`,
    )) as BarisSurat[];
    return { belumSedia: false, senarai };
  } catch (e) {
    if (belumDipasang(e, "pbd_surat")) return { belumSedia: true, senarai: [] };
    throw e;
  }
}

export async function tetapkanRujukan(id: string, rujukan_kami: string): Promise<HasilSurat> {
  await pastikanBoleh("urus_pejabat");
  const bersih = rujukan_kami.trim();
  if (!bersih) return { ok: false, mesej: "Nombor rujukan kosong tidak disimpan." };

  const db = klienTulis();
  try {
    await db.minta(`pbd_surat?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ rujukan_kami: bersih, status: "selesai" }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/pejabat");
  revalidatePath("/borang");
  return { ok: true, mesej: "Rujukan kami disimpan." };
}

/** Nama & kod rasmi sekolah — untuk letterhead cetakan. */
export async function kepalaSurat() {
  return {
    nama: SEKOLAH.namaPenuh,
    kod: SEKOLAH.kod,
    alamat: SEKOLAH.hubungi.alamat,
    telefon: SEKOLAH.hubungi.telefon,
    faks: SEKOLAH.hubungi.faks,
    emel: SEKOLAH.hubungi.emel,
  };
}
