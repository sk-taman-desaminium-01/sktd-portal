import "server-only";
import { cache } from "react";
import { klienTulis } from "./supabase-pelayan";
import { VERSI_PENGHURAI, type KodSeksyen } from "@/data/seksyen-pengurusan";

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
  /** Versi penghurai yang membaca fail ini. Null = sebelum cap diperkenalkan. */
  versi_penghurai: string | null;
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

export const senaraiDokumen = cache(async (): Promise<Dokumen[]> => {
  const db = klienTulis();
  return (await db.minta(
    "pengurusan_dokumen?select=*&order=tahun.desc,versi.desc",
  )) as Dokumen[];
});

/**
 * Dokumen TERKINI, dibaca sekali sahaja bagi setiap permintaan.
 *
 * Satu halaman boleh memanggil `barisIkutKod()` beberapa kali — kad Takwim
 * memanggilnya dua kali, untuk program dan untuk mesyuarat — dan setiap
 * panggilan dahulunya menanyakan dokumen dan seksyennya semula. `cache()`
 * React menyatukan panggilan yang serupa dalam SATU permintaan; ia tidak
 * menyimpan apa-apa antara permintaan, jadi data tidak pernah menjadi
 * lapuk.
 */
export const dokumenTerkini = cache(async (): Promise<Dokumen | null> => {
  const semua = await senaraiDokumen();
  return semua[0] ?? null;
});

export const seksyenDokumen = cache(async (dokumenId: string): Promise<Seksyen[]> => {
  const db = klienTulis();
  return (await db.minta(
    `pengurusan_seksyen?select=*&dokumen_id=eq.${encodeURIComponent(dokumenId)}&order=urutan.asc`,
  )) as Seksyen[];
});

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

/**
 * Baris bagi SEMUA seksyen yang dinamakan, dalam SATU pertanyaan.
 *
 * KENAPA INI WUJUD. Versi pertama membaca setiap seksyen satu demi satu.
 * Takwim disimpan sebagai dua belas seksyen bulanan, jadi membuka kad
 * Takwim bermakna empat belas perjalanan berturutan ke Supabase — dan
 * setiap perjalanan dari Vercel ke pangkalan data memakan ratusan milisaat
 * walaupun pertanyaannya pantas. Pengguna mengukurnya sendiri: enam saat
 * untuk Takwim, tiga untuk Kokurikulum, satu untuk Urus Laman. Perbezaan
 * itu ialah BILANGAN SEKSYEN, bukan saiz data.
 *
 * Satu pertanyaan `seksyen_id=in.(…)` menggantikan kesemuanya.
 */
async function barisBanyakSeksyen(seksyenId: string[]): Promise<Map<string, string[][]>> {
  const peta = new Map<string, string[][]>();
  if (seksyenId.length === 0) return peta;

  const db = klienTulis();
  const KEPING = 1000;
  const senarai = seksyenId.map((x) => `"${x}"`).join(",");

  for (let mula = 0; ; mula += KEPING) {
    const keping = (await db.minta(
      `pengurusan_baris?select=seksyen_id,urutan,sel&seksyen_id=in.(${senarai})` +
        `&order=seksyen_id.asc,urutan.asc&offset=${mula}&limit=${KEPING}`,
    )) as { seksyen_id: string; sel: string[] }[];

    for (const b of keping) {
      const a = peta.get(b.seksyen_id) ?? [];
      a.push(b.sel);
      peta.set(b.seksyen_id, a);
    }
    // Peraturan keras #1: dibaca sehingga habis, bukan sekali dengan harapan
    // muat. Had lalai Supabase 1,000 pernah memotong 87% data.
    if (keping.length < KEPING) return peta;
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

  const peta = await barisBanyakSeksyen(seksyen.map((s) => s.id));
  // Urutan seksyen DIKEKALKAN — takwim bulan Januari mesti datang sebelum
  // Februari, dan urutan itu hidup dalam susunan seksyen, bukan dalam baris.
  const baris: string[][] = [];
  for (const s of seksyen) baris.push(...(peta.get(s.id) ?? []));
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
      versi_penghurai: VERSI_PENGHURAI,
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

/** Satu baris, dengan selnya. Null bila ia sudah tiada. */
export async function satuBaris(id: string): Promise<Baris | null> {
  const db = klienTulis();
  const r = (await db.minta(
    `pengurusan_baris?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
  )) as Baris[];
  return r[0] ?? null;
}

/**
 * Sunting satu baris, sambil MENYIMPAN apa yang PDF asalnya kata.
 *
 * `asal` diisi sekali sahaja — pada suntingan PERTAMA. Menulisnya semula pada
 * setiap suntingan bermakna selepas dua kali sunting, "asal" ialah suntingan
 * pertama dan bacaan sebenar PDF hilang selamanya.
 */
/**
 * Kemas kini BANYAK baris dengan satu permintaan setiap baris, lapan serentak.
 *
 * `suntingBaris()` membuat DUA permintaan bagi setiap baris (baca `asal`,
 * kemudian tulis). Bila pindaan dikenakan pada seluruh edisi, itu ribuan
 * perjalanan berturutan dan fungsi Vercel tamat masa di tengah jalan —
 * pengguna melihat "sambungan terputus" sedangkan namanya memang tersimpan.
 * Di sini `asal` sudah diketahui daripada bacaan, jadi satu tulisan cukup.
 */
export async function suntingBarisBanyak(
  baris: { id: string; sel: string[]; asal: string[] | null }[],
): Promise<number> {
  const db = klienTulis();
  let siap = 0;
  const SERENTAK = 8;
  for (let i = 0; i < baris.length; i += SERENTAK) {
    const hasil = await Promise.allSettled(baris.slice(i, i + SERENTAK).map((b) =>
      db.minta(`pengurusan_baris?id=eq.${encodeURIComponent(b.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ sel: b.sel, asal: b.asal ?? b.sel, sumber: "sunting" }),
      })));
    siap += hasil.filter((h) => h.status === "fulfilled").length;
  }
  return siap;
}

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
