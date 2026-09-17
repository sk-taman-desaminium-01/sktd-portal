import "server-only";
import { klienTulis } from "./supabase-pelayan";
import type { Barang, Permohonan, StatusPermohonan } from "@/data/inventori";

export type { Barang, Permohonan, StatusPermohonan };

export async function senaraiBarang(unit = "ICT", termasukTidakAktif = false): Promise<Barang[]> {
  const db = klienTulis();
  const tapis = termasukTidakAktif ? "" : "&aktif=eq.true";
  const barang = (await db.minta(
    `inventori_barang?select=*&unit=eq.${encodeURIComponent(unit)}${tapis}&order=nama.asc`,
  )) as Barang[];
  if (barang.length === 0) return [];

  // Berapa yang sedang diagihkan — dikira dari permohonan yang DILULUSKAN
  // dan belum selesai. Satu nombor, satu tempat mengiranya (peraturan #3):
  // menyimpan lajur `dipinjam` yang dikemas kini dengan tangan bermakna ia
  // akan tersasar, dan tiada siapa akan tahu bila.
  const aktif = (await db.minta(
    `inventori_permohonan?select=barang_id,kuantiti&status=eq.lulus`,
  )) as { barang_id: string; kuantiti: number }[];

  const kira = new Map<string, number>();
  for (const p of aktif) kira.set(p.barang_id, (kira.get(p.barang_id) ?? 0) + p.kuantiti);

  return barang.map((b) => ({ ...b, dipinjam: kira.get(b.id) ?? 0 }));
}

export async function simpanBarang(b: {
  id?: string; unit: string; nama: string; kategori: string | null;
  kuantiti: number; lokasi: string | null; nota: string | null; aktif: boolean;
}): Promise<Barang | null> {
  const db = klienTulis();
  const badan = {
    unit: b.unit, nama: b.nama, kategori: b.kategori,
    kuantiti: b.kuantiti, lokasi: b.lokasi, nota: b.nota, aktif: b.aktif,
  };
  if (b.id) {
    await db.minta(`inventori_barang?id=eq.${encodeURIComponent(b.id)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(badan),
    });
    return null;
  }
  const hasil = (await db.minta("inventori_barang", {
    method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(badan),
  })) as Barang[];
  return hasil[0] ?? null;
}

/**
 * Padam barang — atau sembunyikan, kalau ia pernah dimohon.
 *
 * Sama seperti bilik: memadam barang yang pernah dimohon memusnahkan rekod
 * permohonan yang merujuknya, dan "siapa pinjam laptop bulan lepas" hilang
 * tanpa sesiapa memintanya.
 */
export async function padamBarang(id: string): Promise<"dipadam" | "dinyahaktif"> {
  const db = klienTulis();
  const ada = (await db.minta(
    `inventori_permohonan?select=id&barang_id=eq.${encodeURIComponent(id)}&limit=1`,
  )) as { id: string }[];

  if (ada.length > 0) {
    await db.minta(`inventori_barang?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ aktif: false }),
    });
    return "dinyahaktif";
  }
  await db.minta(`inventori_barang?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE", headers: { Prefer: "return=minimal" },
  });
  return "dipadam";
}

/* ------------------------------------------------------------- permohonan */

export async function permohonanSemua(had = 200): Promise<Permohonan[]> {
  const db = klienTulis();
  return (await db.minta(
    `inventori_permohonan?select=*&order=dicipta.desc&limit=${had}`,
  )) as Permohonan[];
}

export async function permohonanSaya(emel: string, had = 100): Promise<Permohonan[]> {
  const db = klienTulis();
  return (await db.minta(
    `inventori_permohonan?select=*&oleh=eq.${encodeURIComponent(emel.toLowerCase())}` +
      `&order=dicipta.desc&limit=${had}`,
  )) as Permohonan[];
}

export async function simpanPermohonan(p: {
  barang_id: string; kuantiti: number; tujuan: string;
  perlu_pada: string | null; oleh: string; nama: string;
  tempahan_id?: string | null;
}): Promise<Permohonan | null> {
  const db = klienTulis();
  const hasil = (await db.minta("inventori_permohonan", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ tempahan_id: null, ...p, status: "baharu" }),
  })) as Permohonan[];
  return hasil[0] ?? null;
}

/**
 * Banyak permohonan sekali gus, daripada satu tempahan bilik.
 *
 * Guru yang menempah dewan dan menanda "perlukan projektor dan pembesar
 * suara" membuat SATU tindakan, bukan tiga. Menuntut mereka membuka skrin
 * lain dan mengisi borang untuk setiap barang ialah tepat kerja yang
 * penggabungan ini hapuskan.
 */
export async function simpanPermohonanPukal(
  senarai: {
    barang_id: string; kuantiti: number; tujuan: string;
    perlu_pada: string | null; oleh: string; nama: string; tempahan_id: string | null;
  }[],
): Promise<void> {
  if (senarai.length === 0) return;
  const db = klienTulis();
  await db.minta("inventori_permohonan", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify(senarai.map((p) => ({ ...p, status: "baharu" }))),
  });
}

export async function putuskanPermohonan(
  id: string, status: StatusPermohonan, catatan: string | null, oleh: string,
): Promise<Permohonan | null> {
  const db = klienTulis();
  const hasil = (await db.minta(`inventori_permohonan?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status, catatan, diputuskan_oleh: oleh }),
  })) as Permohonan[];
  return hasil[0] ?? null;
}

export async function batalPermohonan(id: string, emel: string): Promise<void> {
  const db = klienTulis();
  await db.minta(
    `inventori_permohonan?id=eq.${encodeURIComponent(id)}` +
      `&oleh=eq.${encodeURIComponent(emel.toLowerCase())}&status=eq.baharu`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
}

/**
 * Emel penyelia unit — siapa yang menerima notifikasi permohonan.
 *
 * Jadual berasingan dan bukan peranan, kerana "ahli unit ICT" bukan tahap
 * kuasa: seorang guru biasa boleh menjadi penyelia inventori ICT tanpa
 * menjadi pentadbir sekolah. Mencampurkan kedua-duanya bermakna memberi
 * kuasa pentadbiran kepada sesiapa yang menguruskan laptop.
 */
export async function penyeliaUnit(unit: string): Promise<string[]> {
  const db = klienTulis();
  const baris = (await db.minta(
    `inventori_penyelia?select=emel&unit=eq.${encodeURIComponent(unit)}`,
  )) as { emel: string }[];
  return baris.map((b) => b.emel);
}

export async function tambahPenyelia(unit: string, emel: string): Promise<void> {
  const db = klienTulis();
  await db.minta("inventori_penyelia?on_conflict=unit,emel", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ unit, emel: emel.toLowerCase() }),
  });
}

export async function buangPenyelia(unit: string, emel: string): Promise<void> {
  const db = klienTulis();
  await db.minta(
    `inventori_penyelia?unit=eq.${encodeURIComponent(unit)}&emel=eq.${encodeURIComponent(emel.toLowerCase())}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
}
