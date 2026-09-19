/**
 * Lapisan pangkalan data bagi pembetulan kekal.
 *
 * Logik tulennya duduk dalam `@/data/pindaan` supaya ia boleh diuji tanpa
 * pangkalan data — `kenakanPindaan()` ialah bahagian yang paling mudah
 * merosakkan data, jadi ia mesti berada di tempat yang ujian boleh capai.
 */
import { klienTulis } from "@/lib/supabase-pelayan";
import { kunciNama } from "@/lib/nama";
import { dokumenTerkini, seksyenDokumen, barisSeksyen, suntingBaris, padamBaris } from "@/lib/pengurusan";
import { kenakanPindaan, kesanPewaris } from "@/data/pindaan";
import type { JenisPindaan, Pindaan, Pentadbir, Pewaris } from "@/data/pindaan";

export * from "@/data/pindaan";

export async function senaraiPindaan(): Promise<Pindaan[]> {
  const db = klienTulis();
  const semua: Pindaan[] = [];
  for (let offset = 0; ; offset += 500) {
    const rows = await db.minta(`pengurusan_pindaan?select=*&order=dicipta.asc,id.asc&limit=500&offset=${offset}`) as Pindaan[];
    semua.push(...rows);
    if (rows.length < 500) return semua;
  }
}

export async function tambahPindaan(
  p: { jenis: JenisPindaan; dari: string; kepada: string | null; sebab: string | null; oleh: string | null },
): Promise<void> {
  const db = klienTulis();
  await db.minta("pengurusan_pindaan", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      jenis: p.jenis,
      dari: p.dari.trim(),
      kepada: p.kepada?.trim() || null,
      sebab: p.sebab?.trim() || null,
      aktif: true,
      oleh: p.oleh,
    }),
  });
}

export async function togolPindaan(id: string, aktif: boolean): Promise<void> {
  const db = klienTulis();
  await db.minta(`pengurusan_pindaan?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ aktif }),
  });
}

export async function padamPindaan(id: string): Promise<void> {
  const db = klienTulis();
  await db.minta(`pengurusan_pindaan?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}


/* --------------------------------------------------- kenakan pada edisi */

/**
 * Kenakan pindaan aktif pada satu edisi yang SUDAH tersimpan.
 *
 * Pindaan biasanya berkuat kuasa pada muat naik berikutnya. Tetapi
 * pembetulan yang dibuat hari ini — Guru Besar yang bersara — perlu berkuat
 * kuasa hari ini juga, pada edisi yang sedang digunakan. Tanpa ini seseorang
 * terpaksa menyunting dua puluh baris dengan tangan untuk satu orang, dalam
 * dua puluh jawatankuasa.
 *
 * Bacaan asal PDF kekal disimpan dalam lajur `asal` setiap baris.
 */
export async function kenakanPadaDokumen(
  dokumenId: string,
  pindaan: Pindaan[],
): Promise<{ diubah: number; digugur: number }> {
  const aktif = pindaan.filter((p) => p.aktif);
  if (aktif.length === 0) return { diubah: 0, digugur: 0 };

  let diubah = 0;
  let digugur = 0;
  for (const s of await seksyenDokumen(dokumenId)) {
    for (const b of await barisSeksyen(s.id)) {
      const kesan = kenakanPindaan(b.sel, aktif);
      if (kesan.gugur) { await padamBaris(b.id); digugur++; continue; }
      if (kesan.kena.length === 0) continue;
      await suntingBaris(b.id, kesan.sel);
      diubah++;
    }
  }
  return { diubah, digugur };
}

export interface HasilPewarisan {
  pewaris: Pewaris[];
  diubah: number;
  digugur: number;
  /** Pindaan yang sudah wujud dan tidak dicipta semula. */
  dilangkau: number;
}

/**
 * Simpan pertukaran sebagai pindaan, dan kenakannya serta-merta.
 *
 * Dipanggil SELEPAS kad Pentadbir berjaya disimpan, dan kegagalannya tidak
 * boleh membatalkan simpanan itu — nama pentadbir yang betul di laman awam
 * lebih penting daripada jawatankuasa yang menyusul lewat.
 */
export async function wariskanPentadbir(
  lama: Pentadbir[],
  baharu: Pentadbir[],
  oleh: string | null,
): Promise<HasilPewarisan> {
  const pewaris = kesanPewaris(lama, baharu);
  if (pewaris.length === 0) return { pewaris, diubah: 0, digugur: 0, dilangkau: 0 };

  const sedia = await senaraiPindaan();
  const sudahAda = new Set(sedia.map((p) => kunciNama(p.dari)));

  let dilangkau = 0;
  for (const w of pewaris) {
    if (sudahAda.has(kunciNama(w.lama))) { dilangkau++; continue; }
    await tambahPindaan({
      jenis: "ganti_nama",
      dari: w.lama,
      kepada: w.baharu,
      sebab: `${w.jawatan} bertukar — dikemas kini dalam kad Pentadbir`,
      oleh,
    });
    sudahAda.add(kunciNama(w.lama));
  }

  // Baca semula supaya pindaan yang baru dicipta membawa id sebenarnya.
  const semua = await senaraiPindaan();
  const dok = await dokumenTerkini();
  if (!dok) return { pewaris, diubah: 0, digugur: 0, dilangkau };

  const kunciPewaris = new Set(pewaris.map((w) => kunciNama(w.lama)));
  const kenakan = semua.filter((p) => p.aktif && kunciPewaris.has(kunciNama(p.dari)));
  const hasil = await kenakanPadaDokumen(dok.id, kenakan);

  return { pewaris, ...hasil, dilangkau };
}

/** Simpan baris dan ingatan pindaan dalam satu transaksi pangkalan data. */
export async function pindaBarisKekal(id: string, sel: string[] | null, oleh: string | null): Promise<void> {
  await klienTulis().minta("rpc/pinda_baris_kekal", {
    method: "POST", body: JSON.stringify({ p_id: id, p_sel: sel, p_oleh: oleh }),
  });
}
