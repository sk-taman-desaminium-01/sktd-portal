/**
 * INVENTORI UNIT — barang yang unit selenggara, dan permohonan guru.
 *
 * DIMINTA OLEH KETUA UNIT ICT: "rekod inventori. Buat satu ruang untuk unit
 * ict selenggara, barang2 apa yang under unit ict. Contoh laptop kuantiti
 * berapa, mouse berapa. And cikgu2 boleh request barang2 yang dia mintak
 * kita sediakan. And unit ict / admin boleh dapat noti tempahan2 ni."
 *
 * SKOPNYA SENGAJA KECIL. Ini BUKAN sistem aset KWAPM dengan nombor siri,
 * susut nilai dan pelupusan — itu sistem yang berbeza, dengan peraturan
 * perakaunan yang berbeza, dan membinanya separuh jalan lebih teruk
 * daripada tidak membinanya. Ini menjawab dua soalan sahaja:
 *
 *   "Unit ICT ada berapa laptop, dan berapa yang masih ada?"
 *   "Siapa minta apa, dan sudah diluluskan?"
 *
 * UNIT sebagai medan, bukan ICT yang dikodkan keras. Unit lain akan minta
 * perkara yang sama tahun depan, dan menyalin seluruh modul untuk menukar
 * satu perkataan ialah cara sistem menjadi empat sistem.
 */

export interface Barang {
  id: string;
  unit: string;
  nama: string;
  kategori: string | null;
  /** Jumlah yang unit MILIKI. */
  kuantiti: number;
  /** Berapa yang sedang dipinjam/diagihkan. Dikira dari permohonan diluluskan. */
  dipinjam?: number;
  lokasi: string | null;
  nota: string | null;
  aktif: boolean;
}

export type StatusPermohonan = "baharu" | "lulus" | "tolak" | "selesai";

export interface Permohonan {
  id: string;
  barang_id: string;
  kuantiti: number;
  tujuan: string;
  /** Bila barang itu diperlukan. Kosong bermakna tiada tarikh khusus. */
  perlu_pada: string | null;
  oleh: string;
  nama: string;
  /** Tempahan bilik yang mencetuskannya, bila permohonan datang dari sana. */
  tempahan_id: string | null;
  status: StatusPermohonan;
  catatan: string | null;
  diputuskan_oleh: string | null;
  dicipta: string;
}

export const NAMA_STATUS: Record<StatusPermohonan, string> = {
  baharu: "Menunggu",
  lulus: "Diluluskan",
  tolak: "Ditolak",
  selesai: "Selesai",
};

export const WARNA_STATUS: Record<StatusPermohonan, string> = {
  baharu: "bg-[#fdf3dc] text-[#9a6b06]",
  lulus: "bg-[#e5f4ec] text-[#167a4b]",
  tolak: "bg-[#fdf1f1] text-[#8f2b2b]",
  selesai: "bg-[#eef1f5] text-slate-500",
};

/**
 * Berapa yang masih boleh dimohon.
 *
 * Permohonan yang DILULUSKAN mengurangkan baki; yang MENUNGGU tidak.
 * Sebabnya praktikal: guru meminta lima papan putih dan unit meluluskan
 * dua — menolak kelima-limanya dari baki semasa ia masih menunggu
 * memaparkan kekurangan yang tidak wujud, dan guru kedua berhenti memohon.
 */
export function baki(b: Barang): number {
  return Math.max(0, b.kuantiti - (b.dipinjam ?? 0));
}

export interface SemakanPermohonan {
  ok: boolean;
  sebab?: string;
}

export function semakPermohonan(
  minta: { kuantiti: number; tujuan: string },
  barang: Barang | undefined,
): SemakanPermohonan {
  if (!barang) return { ok: false, sebab: "Pilih barang dahulu." };
  if (!barang.aktif) return { ok: false, sebab: `${barang.nama} tidak lagi disediakan.` };
  if (!Number.isInteger(minta.kuantiti) || minta.kuantiti < 1) {
    return { ok: false, sebab: "Kuantiti mesti sekurang-kurangnya 1." };
  }
  if (minta.tujuan.trim().length < 3) {
    return { ok: false, sebab: "Tulis tujuan — unit membacanya sebelum memutuskan." };
  }
  const ada = baki(barang);
  if (minta.kuantiti > ada) {
    // BUKAN ralat keras. Unit mungkin ada stok yang belum direkodkan, atau
    // boleh meminjam dari unit lain. Permohonan tetap dihantar; unit yang
    // memutuskan.
    return {
      ok: true,
      sebab:
        `Unit merekodkan ${ada} sahaja yang masih ada (daripada ${barang.kuantiti}). ` +
        "Permohonan anda tetap dihantar — unit yang memutuskan.",
    };
  }
  return { ok: true };
}

/** Kumpulkan barang mengikut kategori, untuk dipapar. */
export function ikutKategori(senarai: Barang[]): { kategori: string; barang: Barang[] }[] {
  const peta = new Map<string, Barang[]>();
  for (const b of senarai) {
    const k = (b.kategori ?? "").trim() || "Lain-lain";
    const a = peta.get(k) ?? [];
    a.push(b);
    peta.set(k, a);
  }
  return [...peta.entries()]
    .map(([kategori, barang]) => ({
      kategori,
      barang: barang.sort((x, y) => x.nama.localeCompare(y.nama, "ms")),
    }))
    // "Lain-lain" sentiasa di HUJUNG — ia bakul, bukan kategori.
    .sort((a, b) =>
      a.kategori === "Lain-lain" ? 1
      : b.kategori === "Lain-lain" ? -1
      : a.kategori.localeCompare(b.kategori, "ms"),
    );
}
