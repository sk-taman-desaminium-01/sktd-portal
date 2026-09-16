import "server-only";
import { klienTulis } from "./supabase-pelayan";
import type { KodSeksyen } from "@/data/seksyen-pengurusan";

/**
 * Simpanan Buku Pengurusan Tahunan.
 *
 * ⚠️ TIGA JADUAL INI TERTUTUP KEPADA KUNCI AWAM. RLS dihidupkan tanpa satu
 * pun dasar (`supabase/pengurusan.sql`), jadi hanya kunci rahsia di pelayan
 * boleh membacanya. Itu bukan terlupa — buku pengurusan mengandungi nombor
 * telefon guru, jadual bertugas dan butiran jawatankuasa dalaman.
 *
 * VERSI LAMA TIDAK DIPADAM. Buku pengurusan berubah sepanjang tahun, dan
 * sekolah perlu boleh melihat apa yang berubah. Ini BERBEZA dengan jadual
 * waktu, yang failnya tidak disimpan langsung.
 *
 * FAIL PDF SENDIRI TIDAK DISIMPAN DI SINI. Ia dibaca dalam pelayar admin dan
 * hanya teksnya dihantar — lihat `muka-pdf.ts` untuk sebabnya.
 */

export interface Dokumen {
  id: string;
  tahun: number;
  versi: number;
  nama_fail: string;
  muka: number | null;
  jenis_fail: string | null;
  oleh: string | null;
  created_at: string;
}

export interface Seksyen {
  id: string;
  dokumen_id: string;
  kod: KodSeksyen;
  tajuk: string;
  muka: string | null;
  keyakinan: number | null;
  paparan: "awam" | "dalaman";
  status: "draf" | "disahkan";
  amaran: string | null;
  lajur: string[];
  urutan: number;
  /** Kiraan baris, disimpan semasa muat naik — bukan dikira semula. */
  bil_baris: number;
}

export interface Baris {
  id: string;
  seksyen_id: string;
  urutan: number | null;
  sel: string[];
  asal: string[] | null;
  sumber: "pdf" | "sunting" | "tambah";
}

/* ------------------------------------------------------------------ baca */

export async function senaraiDokumen(): Promise<Dokumen[]> {
  const db = klienTulis();
  return (await db.minta(
    "pengurusan_dokumen?select=*&order=tahun.desc,versi.desc",
  )) as Dokumen[];
}

export async function dokumenTerkini(): Promise<Dokumen | null> {
  const semua = await senaraiDokumen();
  return semua[0] ?? null;
}

export async function seksyenDokumen(dokumenId: string): Promise<Seksyen[]> {
  const db = klienTulis();
  return (await db.minta(
    `pengurusan_seksyen?select=*&dokumen_id=eq.${encodeURIComponent(dokumenId)}&order=urutan.asc`,
  )) as Seksyen[];
}

/**
 * Baris satu seksyen.
 *
 * Peraturan keras #1: JANGAN `.limit()` mentah. Takwim setahun ialah 358
 * baris hari ini, tetapi had lalai PostgREST 1,000 sudah pernah memotong
 * 87% data dua kali dalam projek lain. Maka ia dibaca berkeping-keping
 * sehingga habis, bukan sekali dengan harapan muat.
 */
export async function barisSeksyen(seksyenId: string): Promise<Baris[]> {
  const db = klienTulis();
  const KEPING = 1000;
  const keluar: Baris[] = [];
  for (let mula = 0; ; mula += KEPING) {
    const keping = (await db.minta(
      `pengurusan_baris?select=*&seksyen_id=eq.${encodeURIComponent(seksyenId)}` +
        `&order=urutan.asc&offset=${mula}&limit=${KEPING}`,
    )) as Baris[];
    keluar.push(...keping);
    if (keping.length < KEPING) return keluar;
  }
}

/** Baris bagi jenis seksyen tertentu dalam dokumen TERKINI yang disahkan. */
export async function barisIkutKod(kod: KodSeksyen): Promise<{ lajur: string[]; baris: string[][] } | null> {
  const dok = await dokumenTerkini();
  if (!dok) return null;
  const seksyen = (await seksyenDokumen(dok.id)).filter(
    (s) => s.kod === kod && s.status === "disahkan",
  );
  if (seksyen.length === 0) return null;

  const baris: string[][] = [];
  for (const s of seksyen) baris.push(...(await barisSeksyen(s.id)).map((b) => b.sel));
  return { lajur: seksyen[0].lajur ?? [], baris };
}

/* ------------------------------------------------------------------ tulis */

export interface SeksyenUntukSimpan {
  kod: KodSeksyen;
  tajuk: string;
  muka: string;
  keyakinan: number;
  paparan: "awam" | "dalaman";
  amaran: string[];
  lajur: string[];
  baris: string[][];
}

/**
 * Simpan satu edisi buku beserta seksyennya.
 *
 * `versi` dikira dari apa yang sudah ada bagi tahun itu — bukan dihantar dari
 * pelayar. Nombor versi yang datang dari pelayar boleh berlanggar apabila dua
 * admin memuat naik serentak, dan `unique (tahun, versi)` akan menolak yang
 * kedua dengan ralat yang tidak bermakna kepada sesiapa.
 */
export async function simpanDokumen(
  maklumat: { tahun: number; namaFail: string; muka: number; jenisFail: string; oleh: string },
  seksyen: SeksyenUntukSimpan[],
): Promise<{ id: string; versi: number; bilBaris: number }> {
  const db = klienTulis();

  const sedia = (await db.minta(
    `pengurusan_dokumen?select=versi&tahun=eq.${maklumat.tahun}&order=versi.desc&limit=1`,
  )) as { versi: number }[];
  const versi = (sedia[0]?.versi ?? 0) + 1;

  const [dok] = (await db.minta("pengurusan_dokumen", {
    method: "POST",
    body: JSON.stringify({
      tahun: maklumat.tahun, versi,
      nama_fail: maklumat.namaFail, muka: maklumat.muka,
      jenis_fail: maklumat.jenisFail, oleh: maklumat.oleh,
    }),
  })) as Dokumen[];

  let bilBaris = 0;
  for (let i = 0; i < seksyen.length; i++) {
    const s = seksyen[i];
    const [rekod] = (await db.minta("pengurusan_seksyen", {
      method: "POST",
      body: JSON.stringify({
        dokumen_id: dok.id, kod: s.kod, tajuk: s.tajuk, muka: s.muka,
        keyakinan: s.keyakinan, paparan: s.paparan, status: "draf",
        amaran: s.amaran.length ? s.amaran.join(" · ") : null,
        lajur: s.lajur, urutan: i, bil_baris: s.baris.length,
      }),
    })) as Seksyen[];

    // Sisipan berkeping: satu seksyen takwim ialah 358 baris, dan badan
    // permintaan tunggal bagi semuanya sekali gus pernah gagal senyap.
    const KEPING = 400;
    for (let m = 0; m < s.baris.length; m += KEPING) {
      const keping = s.baris.slice(m, m + KEPING).map((sel, n) => ({
        seksyen_id: rekod.id, urutan: m + n, sel, sumber: "pdf",
      }));
      if (keping.length === 0) continue;
      await db.minta("pengurusan_baris", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(keping),
      });
      bilBaris += keping.length;
    }
  }
  return { id: dok.id, versi, bilBaris };
}

/**
 * Sunting satu baris, sambil MENYIMPAN apa yang PDF asalnya kata.
 *
 * `asal` diisi sekali sahaja — pada suntingan PERTAMA. Menulisnya semula pada
 * setiap suntingan bermakna selepas dua kali sunting, "asal" ialah suntingan
 * pertama dan bacaan sebenar PDF hilang selamanya.
 */
export async function suntingBaris(id: string, sel: string[]): Promise<void> {
  const db = klienTulis();
  const sedia = (await db.minta(
    `pengurusan_baris?select=asal,sel&id=eq.${encodeURIComponent(id)}`,
  )) as { asal: string[] | null; sel: string[] }[];
  if (sedia.length === 0) throw new Error("Baris itu tiada.");

  await db.minta(`pengurusan_baris?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      sel,
      asal: sedia[0].asal ?? sedia[0].sel,
      sumber: "sunting",
    }),
  });
}

/** Tambah seorang yang tertinggal dari bacaan. */
export async function tambahBaris(seksyenId: string, sel: string[]): Promise<void> {
  const db = klienTulis();
  const akhir = (await db.minta(
    `pengurusan_baris?select=urutan&seksyen_id=eq.${encodeURIComponent(seksyenId)}&order=urutan.desc&limit=1`,
  )) as { urutan: number | null }[];
  await db.minta("pengurusan_baris", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      seksyen_id: seksyenId, urutan: (akhir[0]?.urutan ?? -1) + 1,
      sel, sumber: "tambah",
    }),
  });
  await db.minta(`pengurusan_seksyen?id=eq.${encodeURIComponent(seksyenId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ bil_baris: await kiraBaris(seksyenId) }),
  });
}

/** Padam satu baris yang tersalah baca sepenuhnya. */
export async function padamBaris(id: string): Promise<void> {
  const db = klienTulis();
  await db.minta(`pengurusan_baris?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

async function kiraBaris(seksyenId: string): Promise<number> {
  return (await barisSeksyen(seksyenId)).length;
}

export async function tukarSeksyen(
  id: string,
  ubah: Partial<Pick<Seksyen, "kod" | "tajuk" | "paparan" | "status">>,
): Promise<void> {
  const db = klienTulis();
  await db.minta(`pengurusan_seksyen?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(ubah),
  });
}

/** Padam satu edisi. Seksyen dan baris ikut terpadam (on delete cascade). */
export async function padamDokumen(id: string): Promise<void> {
  const db = klienTulis();
  await db.minta(`pengurusan_dokumen?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
