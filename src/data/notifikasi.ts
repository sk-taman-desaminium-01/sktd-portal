/**
 * NOTIFIKASI — logik tulen.
 *
 * KENAPA MODUL INI WUJUD. Sebelum ini, apa-apa yang berlaku dalam portal
 * hanya diketahui oleh orang yang kebetulan membuka skrin yang betul. Bilik
 * ditempah, permohonan barang ICT dihantar, tempahan dibatalkan — dan orang
 * yang perlu tahu mendapat tahu apabila seseorang memberitahu mereka secara
 * peribadi. Itu bukan sistem; itu WhatsApp dengan langkah tambahan.
 *
 * SATU PERATURAN YANG MENENTUKAN BENTUK SEMUANYA: notifikasi ialah satu
 * KEJADIAN, bukan mesej kepada seorang. Satu permohonan barang ICT perlu
 * sampai kepada SETIAP ahli unit ICT, dan kalau salah seorang membacanya,
 * yang lain tetap perlu melihatnya. Maka setiap penerima mendapat barisnya
 * sendiri, dengan penanda "dibaca" sendiri.
 */

export type JenisNotifikasi =
  | "tempahan"     // bilik ditempah / dibatalkan
  | "inventori"    // permohonan barang ICT
  | "akses"        // akaun baharu menunggu kelulusan
  | "pbd"          // hal ePBD
  | "surat"        // surat rasmi baharu untuk Urusan Pejabat
  | "borang"       // borang ibu bapa dihantar (kebenaran gambar / waris)
  | "umum";

export interface Notifikasi {
  id: string;
  /** Emel penerima. Setiap penerima mendapat barisnya sendiri. */
  untuk: string;
  jenis: JenisNotifikasi;
  tajuk: string;
  teks: string;
  /** Ke mana notifikasi ini membawa bila ditekan. */
  pautan: string | null;
  dibaca: boolean;
  /** Emel orang yang mencetuskannya — untuk tidak menghantar kepada diri sendiri. */
  oleh: string | null;
  dicipta: string;
}

export const IKON_JENIS: Record<JenisNotifikasi, string> = {
  tempahan: "📅",
  inventori: "📦",
  akses: "🔑",
  pbd: "📘",
  surat: "✉️",
  borang: "📝",
  umum: "🔔",
};

export const NAMA_JENIS: Record<JenisNotifikasi, string> = {
  tempahan: "Tempahan bilik",
  inventori: "Inventori ICT",
  akses: "Akses portal",
  pbd: "ePBD",
  surat: "Surat rasmi",
  borang: "Borang ibu bapa",
  umum: "Umum",
};

/**
 * "2026-09-17T08:30:00Z" → "3 minit lalu".
 *
 * Masa relatif, bukan cap masa penuh. Notifikasi dibaca untuk mengetahui
 * apa yang BARU berlaku; "17 Sep, 8:30 pagi" memaksa pembaca mengira
 * sendiri berapa lama itu.
 */
export function masaLalu(iso: string, sekarang = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const saat = Math.max(0, Math.round((sekarang - t) / 1000));
  if (saat < 60) return "baru sahaja";
  const minit = Math.round(saat / 60);
  if (minit < 60) return `${minit} minit lalu`;
  const jam = Math.round(minit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.round(jam / 24);
  if (hari === 1) return "semalam";
  if (hari < 7) return `${hari} hari lalu`;
  const minggu = Math.round(hari / 7);
  if (minggu < 5) return `${minggu} minggu lalu`;
  return new Date(t).toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Buang penerima yang tidak sepatutnya menerima.
 *
 * Seseorang yang menempah bilik tidak perlu diberitahu bahawa dia menempah
 * bilik. Notifikasi yang memberitahu anda tentang perbuatan anda sendiri
 * ialah bunyi, dan bunyi mengajar orang mengabaikan loceng itu.
 */
export function penerimaBersih(penerima: string[], oleh: string | null): string[] {
  const set = new Set(
    penerima.map((e) => e.trim().toLowerCase()).filter((e) => e !== ""),
  );
  if (oleh) set.delete(oleh.trim().toLowerCase());
  return [...set];
}

/**
 * Kumpulkan notifikasi mengikut hari, untuk dipapar.
 *
 * "Hari ini" dan "Semalam" dinamakan; selebihnya membawa tarikhnya.
 */
export function ikutHari(
  senarai: Notifikasi[], hariIni: string,
): { label: string; senarai: Notifikasi[] }[] {
  const peta = new Map<string, Notifikasi[]>();
  for (const n of senarai) {
    const hari = n.dicipta.slice(0, 10);
    const a = peta.get(hari) ?? [];
    a.push(n);
    peta.set(hari, a);
  }

  const semalam = new Date(Date.parse(`${hariIni}T00:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10);

  return [...peta.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([hari, isi]) => ({
      label:
        hari === hariIni ? "Hari ini"
        : hari === semalam ? "Semalam"
        : new Date(`${hari}T00:00:00Z`).toLocaleDateString("ms-MY", {
            day: "numeric", month: "long", year: "numeric",
          }),
      senarai: isi,
    }));
}
