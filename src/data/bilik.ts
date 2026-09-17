/**
 * TEMPAHAN BILIK KHAS — logik tulen, tanpa pangkalan data.
 *
 * Modul operasi harian yang pertama. Skopnya sengaja kecil: ia tidak
 * menyentuh data murid, tiada apa yang perlu dicetak, dan kegagalan paling
 * teruk ialah dua guru tiba di bilik yang sama — menjengkelkan, tetapi boleh
 * diselesaikan dengan bercakap.
 *
 * SEBAB IA TETAP DITULIS DENGAN BERHATI-HATI: pertindihan ialah SATU-SATUNYA
 * peraturan dalam modul ini. Sistem tempahan yang membenarkan dua tempahan
 * bertindih tidak menyelesaikan masalah yang ia wujud untuk selesaikan — ia
 * hanya memindahkan pergaduhan dari papan kenyataan ke skrin.
 */

export interface Tempahan {
  id: string;
  bilik_id: string;
  tarikh: string;      // YYYY-MM-DD
  mula: string;        // HH:MM
  tamat: string;       // HH:MM
  tujuan: string;
  oleh: string;        // emel
  nama: string;
  dibatalkan: boolean;
  dicipta: string;
}

export interface Bilik {
  id: string;
  nama: string;
  /** Kapasiti, bila diketahui. Dipapar supaya guru tidak menempah bilik terlalu kecil. */
  muatan: number | null;
  nota: string | null;
  aktif: boolean;
}

/** Minit dari tengah malam. "09:30" → 570. Null bila bentuknya salah. */
export function keMinit(jam: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((jam ?? "").trim());
  if (!m) return null;
  const j = Number(m[1]);
  const t = Number(m[2]);
  if (j < 0 || j > 23 || t < 0 || t > 59) return null;
  return j * 60 + t;
}

export function keJam(minit: number): string {
  return `${String(Math.floor(minit / 60)).padStart(2, "0")}:${String(minit % 60).padStart(2, "0")}`;
}

/**
 * Dua tempahan bertindih?
 *
 * Sempadan TIDAK dikira bertindih: tempahan 09:00–10:00 dan 10:00–11:00
 * boleh hidup bersama, kerana itulah cara guru sebenarnya menggunakan bilik.
 * `<` dan `>`, bukan `<=` dan `>=` — dan perbezaan itu ialah keseluruhan
 * peraturan.
 */
export function bertindih(
  a: { mula: string; tamat: string },
  b: { mula: string; tamat: string },
): boolean {
  const am = keMinit(a.mula), at = keMinit(a.tamat);
  const bm = keMinit(b.mula), bt = keMinit(b.tamat);
  if (am === null || at === null || bm === null || bt === null) return false;
  return am < bt && at > bm;
}

export interface SemakanTempahan {
  ok: boolean;
  sebab?: string;
  /** Tempahan sedia ada yang bertindih, bila ada. */
  berlanggar?: Tempahan;
}

/** Waktu sekolah. Tempahan di luar julat ini hampir selalu tersalah taip. */
const BUKA = 6 * 60;      // 06:00
const TUTUP = 22 * 60;    // 22:00
const MAKS_JAM = 8;

/**
 * Semak satu permohonan terhadap tempahan sedia ada.
 *
 * `sediaAda` mesti SUDAH ditapis kepada bilik dan tarikh yang sama; menapis
 * di sini bermakna fungsi ini perlu tahu bentuk pertanyaan pangkalan data,
 * dan ia sengaja tidak tahu apa-apa tentang itu.
 */
export function semakTempahan(
  minta: { tarikh: string; mula: string; tamat: string },
  sediaAda: Tempahan[],
  hariIni?: string,
): SemakanTempahan {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(minta.tarikh)) {
    return { ok: false, sebab: "Tarikh tidak sah." };
  }
  const m = keMinit(minta.mula);
  const t = keMinit(minta.tamat);
  if (m === null || t === null) return { ok: false, sebab: "Waktu tidak sah. Gunakan bentuk 09:30." };
  if (t <= m) return { ok: false, sebab: "Waktu tamat mesti selepas waktu mula." };
  if (m < BUKA || t > TUTUP) {
    return { ok: false, sebab: `Tempahan hanya antara ${keJam(BUKA)} dan ${keJam(TUTUP)}.` };
  }
  if (t - m > MAKS_JAM * 60) {
    return { ok: false, sebab: `Tempahan paling lama ${MAKS_JAM} jam. Pecahkan kepada beberapa tempahan.` };
  }
  // Menempah untuk semalam tidak pernah disengajakan — ia tarikh yang
  // tersalah taip, dan membiarkannya bermakna bilik kelihatan penuh pada
  // hari yang sudah berlalu.
  if (hariIni && minta.tarikh < hariIni) {
    return { ok: false, sebab: "Tarikh itu sudah berlalu." };
  }

  const langgar = sediaAda.find((x) => !x.dibatalkan && bertindih(minta, x));
  if (langgar) {
    return {
      ok: false,
      berlanggar: langgar,
      sebab: `Bilik sudah ditempah ${langgar.mula}–${langgar.tamat} oleh ${langgar.nama}.`,
    };
  }
  return { ok: true };
}

/** Susun ikut tarikh, kemudian waktu mula. */
export function susunTempahan(senarai: Tempahan[]): Tempahan[] {
  return [...senarai].sort(
    (a, b) => a.tarikh.localeCompare(b.tarikh) || a.mula.localeCompare(b.mula),
  );
}

export interface HariTempahan {
  tarikh: string;
  label: string;
  lalu: boolean;
  tempahan: Tempahan[];
}

const HARI = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const BULAN = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];

/** "2026-09-17" → "Khamis, 17 Sep". */
export function labelTarikh(iso: string): string {
  const [y, b, h] = iso.split("-").map(Number);
  if (!y || !b || !h) return iso;
  const hari = HARI[new Date(Date.UTC(y, b - 1, h)).getUTCDay()];
  return `${hari}, ${h} ${BULAN[b - 1]}`;
}

/**
 * Kumpulkan ikut hari.
 *
 * Hari yang telah berlalu ditanda — warna hijau bermakna "selesai" di seluruh
 * portal ini, dan tempahan mengikut peraturan yang sama seperti takwim.
 */
export function ikutHari(senarai: Tempahan[], hariIni: string): HariTempahan[] {
  const peta = new Map<string, Tempahan[]>();
  for (const t of susunTempahan(senarai)) {
    const a = peta.get(t.tarikh) ?? [];
    a.push(t);
    peta.set(t.tarikh, a);
  }
  return [...peta.entries()].map(([tarikh, tempahan]) => ({
    tarikh,
    label: labelTarikh(tarikh),
    lalu: tarikh < hariIni,
    tempahan,
  }));
}
