import "server-only";
import { cache } from "react";
import { after } from "next/server";
import { klienTulis } from "./supabase-pelayan";
import { penerimaBersih, type JenisNotifikasi, type Notifikasi } from "@/data/notifikasi";
import { tahunSesiAktif } from "./sesi-aktif";
import { hantarPush } from "./push";

export type { Notifikasi, JenisNotifikasi };

/**
 * Lapisan pangkalan data notifikasi.
 *
 * MENGHANTAR TIDAK PERNAH MENGGAGALKAN KERJA SEBENAR. Setiap panggilan
 * `hantar()` menelan kegagalannya sendiri dan melaporkannya sebagai `false`.
 * Tempahan bilik yang berjaya tetapi gagal memberitahu unit ICT ialah
 * tempahan yang BERJAYA — membatalkannya kerana loceng tidak berbunyi
 * adalah lebih teruk daripada loceng yang senyap.
 */

export interface Hantaran {
  penerima: string[];
  /** Peranan DB yang akan dicari selepas respons dihantar. */
  peranan?: string[];
  /** Tugasan sekolah semasa yang akan dicari selepas respons dihantar. */
  tugasan?: { peranan: TugasanNotifikasi; skop?: string }[];
  /** Pengumuman kepada semua akaun portal yang dibenarkan. */
  semuaWarga?: boolean;
  /**
   * Mesej PERIBADI — pentadbir TIDAK ditambah.
   *
   * Lalai, setiap kejadian turut sampai kepada pentadbir/admin. Itu betul
   * untuk kejadian sistem, tetapi salah untuk mesej yang berbunyi "Anda
   * telah diluluskan": admin membacanya seolah-olah akaun mereka sendiri
   * baru diluluskan. Untuk kejadian itu, admin menerima notifikasi
   * berasingan yang ditulis untuk mereka ("Pengguna baharu menunggu…").
   */
  peribadi?: boolean;
  jenis: JenisNotifikasi;
  tajuk: string;
  teks: string;
  pautan?: string | null;
  oleh?: string | null;
}

/** Pentadbir, admin dan Admin Mutlak menerima setiap kejadian sistem. */
export const emelPentadbirSemua = cache(async function emelPentadbirSemua(): Promise<string[]> {
  const mutlak = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const db = klienTulis();
  const baris = (await db.minta(
    "pbd_guru?select=email&dibenarkan=eq.true&peranan=in.(admin,pentadbir)",
  )) as { email: string | null }[];
  return [...new Set([...mutlak, ...baris.map((b) => b.email?.toLowerCase() ?? "").filter(Boolean)])];
});

export async function hantar(h: Hantaran): Promise<boolean> {
  try {
    after(async () => { await hantarSekarang(h); });
    return true;
  } catch {
    // Ujian skrip atau konteks tanpa kitaran request tidak menyediakan
    // `after`; jalankan terus supaya fungsi kekal boleh digunakan.
    return hantarSekarang(h);
  }
}

async function hantarSekarang(h: Hantaran): Promise<boolean> {
  const carian = await Promise.allSettled([
    h.peribadi ? Promise.resolve([] as string[]) : emelPentadbirSemua(),
    h.peranan?.length ? emelIkutPeranan(h.peranan) : Promise.resolve([]),
    h.semuaWarga ? emelSemuaWarga() : Promise.resolve([]),
    ...(h.tugasan ?? []).map((t) => emelTugasanNotifikasi(t.peranan, t.skop)),
  ]);
  const tambahan = carian.map((r) => {
    if (r.status === "fulfilled") return r.value;
    // Satu kumpulan gagal tidak boleh membuang kumpulan lain yang berjaya.
    console.error("[notifikasi] gagal mendapatkan kumpulan penerima", r.reason);
    return [] as string[];
  });
  // Pelaku biasa tidak menerima gema tindakannya sendiri. Pentadbir ialah
  // pengecualian yang disengajakan: mereka diminta menerima SEMUA kejadian,
  // termasuk ujian/borang yang mereka sendiri hantar untuk mengesahkan aliran.
  const sasaran = penerimaBersih([...h.penerima, ...tambahan.flat()], h.oleh ?? null);
  // Kumpulan pertama sentiasa pentadbir. Masukkan semula selepas pelaku
  // dibuang supaya admin menerima semua kejadian, termasuk tindakannya sendiri.
  const untuk = [...new Set([...sasaran, ...(tambahan[0] ?? [])])];
  if (untuk.length === 0) return true;

  try {
    const db = klienTulis();
    const binaMuatan = (jenis: JenisNotifikasi) => untuk.map((e) => ({
      untuk: e,
      jenis,
      tajuk: h.tajuk.slice(0, 200),
      teks: h.teks.slice(0, 1000),
      pautan: h.pautan ?? null,
      oleh: h.oleh ?? null,
      dibaca: false,
    }));
    try {
      await db.minta("notifikasi", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(binaMuatan(h.jenis)),
      });
    } catch (e) {
      // Skema lama hanya menerima lima jenis. Jangan hilangkan notifikasi
      // borang/surat sementara pentadbir belum menjalankan migrasi baharu.
      const mesej = e instanceof Error ? e.message : String(e);
      if ((h.jenis === "borang" || h.jenis === "surat") && /23514|check constraint|jenis/i.test(mesej)) {
        await db.minta("notifikasi", {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify(binaMuatan("umum")),
        });
      } else throw e;
    }
    await hantarPush(untuk, {
      tajuk: h.tajuk,
      teks: h.teks,
      pautan: h.pautan,
    });
    return true;
  } catch (e) {
    console.error("[notifikasi] gagal menghantar", h.jenis, h.tajuk, e);
    return false;
  }
}

/**
 * Notifikasi seseorang.
 *
 * HAD 100. Loceng memapar apa yang BARU berlaku; sesiapa yang perlu menggali
 * lebih dalam daripada seratus notifikasi sedang mencari sesuatu yang
 * sepatutnya dicari di skrin modulnya sendiri.
 */
export async function untukSaya(emel: string, had = 100): Promise<Notifikasi[]> {
  if (!emel) return [];
  const db = klienTulis();
  return (await db.minta(
    `notifikasi?select=*&untuk=eq.${encodeURIComponent(emel.toLowerCase())}` +
      `&order=dicipta.desc&limit=${had}`,
  )) as Notifikasi[];
}

export async function bilangBelumBaca(emel: string): Promise<number> {
  if (!emel) return 0;
  const db = klienTulis();
  const baris = (await db.minta(
    `notifikasi?select=id&untuk=eq.${encodeURIComponent(emel.toLowerCase())}` +
      `&dibaca=eq.false&limit=100`,
  )) as { id: string }[];
  return baris.length;
}

export async function tandaDibaca(emel: string, id?: string): Promise<void> {
  const db = klienTulis();
  const tapis = id
    ? `id=eq.${encodeURIComponent(id)}&untuk=eq.${encodeURIComponent(emel.toLowerCase())}`
    : `untuk=eq.${encodeURIComponent(emel.toLowerCase())}&dibaca=eq.false`;
  await db.minta(`notifikasi?${tapis}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ dibaca: true }),
  });
}

export async function padamNotifikasi(emel: string, id: string): Promise<void> {
  const db = klienTulis();
  await db.minta(
    `notifikasi?id=eq.${encodeURIComponent(id)}&untuk=eq.${encodeURIComponent(emel.toLowerCase())}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
}

/** Buang semua notifikasi yang SUDAH DIBACA milik seseorang. */
export async function kosongkan(emel: string): Promise<void> {
  const db = klienTulis();
  await db.minta(
    `notifikasi?untuk=eq.${encodeURIComponent(emel.toLowerCase())}&dibaca=eq.true`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
}

/* --------------------------------------------------------- siapa penerima */

/**
 * Emel setiap orang yang memegang peranan tertentu.
 *
 * Digunakan untuk menghantar kepada "semua pentadbir" tanpa menyimpan
 * senarai emel kedua di mana-mana — senarai kedua ialah senarai yang
 * menjadi lapuk.
 */
/**
 * Emel SETIAP warga yang dibenarkan masuk portal.
 *
 * Untuk pengumuman yang memang ditujukan kepada semua — pos yang
 * diterbitkan, makluman sekolah. Dibaca berkeping-keping: peraturan keras #1
 * bukan tentang saiz data hari ini, ia tentang saiz data pada tahun kelima.
 */
export async function emelSemuaWarga(): Promise<string[]> {
  const db = klienTulis();
  const KEPING = 500;
  const keluar: string[] = [];
  for (let mula = 0; ; mula += KEPING) {
    const keping = (await db.minta(
      `pbd_guru?select=email&dibenarkan=eq.true&order=id.asc&offset=${mula}&limit=${KEPING}`,
    )) as { email: string | null }[];
    keluar.push(...keping.map((b) => b.email ?? "").filter((e) => e !== ""));
    if (keping.length < KEPING) return keluar;
  }
}

export async function emelIkutPeranan(peranan: string[]): Promise<string[]> {
  if (peranan.length === 0) return [];
  const mahuMutlak = peranan.includes("admin_mutlak");
  const perananDb = peranan.filter((p) => p !== "admin_mutlak");
  const db = klienTulis();
  const baris = perananDb.length ? (await db.minta(
    `pbd_guru?select=email&dibenarkan=eq.true&peranan=in.(${perananDb.join(",")})`,
  )) as { email: string | null }[] : [];
  const mutlak = mahuMutlak
    ? (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    : [];
  return [...new Set([...baris.map((b) => b.email ?? "").filter(Boolean), ...mutlak])];
}

export type TugasanNotifikasi = "guru_kelas" | "guru_rmt" | "guru_disiplin" | "pengurus_pasukan";

/** Emel pemegang tugasan semasa, dengan pilihan kelas/skop yang tepat. */
export async function emelTugasanNotifikasi(
  peranan: TugasanNotifikasi,
  skop?: string,
): Promise<string[]> {
  const sesi = await tahunSesiAktif();
  const db = klienTulis();
  let tapis = `&tahun_sesi=eq.${sesi}&peranan=eq.${peranan}`;
  if (skop) {
    const label = skop.trim().toUpperCase();
    const kelas = /^([1-6])\s+(.+)$/.exec(label);
    if (peranan === "guru_kelas" && kelas) {
      tapis += `&tahun=eq.${Number(kelas[1])}&kelas=eq.${encodeURIComponent(kelas[2])}`;
    } else if (peranan === "guru_kelas" && /^PPKI\s+/i.test(label)) {
      tapis += `&tahun=eq.0&kelas=eq.${encodeURIComponent(label)}`;
    } else {
      tapis += `&kelas=eq.${encodeURIComponent(label)}`;
    }
  }
  const baris = (await db.minta(
    `pbd_guru_kelas?select=pbd_guru(email)${tapis}`,
  )) as { pbd_guru: { email: string | null } | null }[];
  return [...new Set(baris.map((b) => b.pbd_guru?.email?.toLowerCase() ?? "").filter(Boolean))];
}
