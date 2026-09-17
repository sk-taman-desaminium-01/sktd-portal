import { barisIkutKod } from "@/lib/pengurusan";
import { cariPadanan, namaBersih, kunciNama } from "@/lib/nama";
import { arasKod } from "@/data/carta";

/**
 * Padankan AKAUN dengan ORANG dalam Buku Pengurusan.
 *
 * MASALAH YANG INI SELESAIKAN. Skrin Senarai Akses memapar nama seperti
 * akaun Google KPM menulisnya: "KPM-Guru NORA BINTI REMALI". Pentadbir yang
 * meluluskan akses melihat satu baris nama dan satu emel berangka
 * (`g-45550141@moe-dl.edu.my`) — dan tiada apa yang memberitahu mereka sama
 * ada orang itu benar-benar guru di sekolah ini.
 *
 * Buku Pengurusan sudah menyenaraikan setiap warga sekolah dengan jawatan
 * dan opsyennya. Memadankan kedua-duanya menukar keputusan "luluskan orang
 * yang saya tidak kenal" kepada "luluskan Nora, guru kelas Dedikasi".
 *
 * TIDAK ADA YANG DILULUSKAN SECARA AUTOMATIK. Padanan ialah bukti yang
 * dipaparkan kepada manusia, bukan pengganti manusia — `cariPadanan()`
 * sendiri menolak seri, kerana dua padanan sempurna bermakna nama itu
 * berulang di sekolah dan memilih salah satu secara senyap ialah cara
 * memberi akses kepada orang yang salah.
 */

export interface WargaBuku {
  nama: string;
  /** Kod jawatan dalam buku: PGB, PK1, GAB, GAG … */
  kod: string;
  /** Opsyen / bidang: "PENDIDIKAN ISLAM", "PENGAJIAN SAINS". */
  opsyen: string;
}

export interface PadananAkses {
  /** Nama akaun selepas awalan "KPM-Guru" dan gelaran dibuang. */
  namaBersih: string;
  warga: WargaBuku | null;
  skor: number;
}

/**
 * Baca senarai warga dari seksyen `guru` dokumen TERKINI yang disahkan.
 *
 * Lajur tidak dikunci pada nombor tetap. Buku menyusun lajurnya semula dari
 * tahun ke tahun, dan kod seperti "GAB" atau "PK1" ialah isyarat yang jauh
 * lebih tahan lama daripada "lajur ketiga".
 */
export async function wargaBuku(): Promise<WargaBuku[]> {
  const data = await barisIkutKod("guru");
  if (!data) return [];

  const keluar: WargaBuku[] = [];
  for (const sel of data.baris) {
    const isi = sel.map((c) => (c ?? "").trim()).filter((c) => c !== "");
    // Nama ialah sel terpanjang yang membawa penanda nasab; kod jawatan
    // ialah sel pendek yang dikenali dalam ARA_JAWATAN.
    const nama = isi.find((c) => /\b(BIN|BINTI|BT|BTE|A\/L|A\/P)\b/i.test(c) && c.length > 6);
    if (!nama) continue;
    const kod = isi.find((c) => c.length <= 5 && arasKod(c.toUpperCase()) !== null) ?? "";
    const opsyen =
      isi.find((c) => c !== nama && c !== kod && c.length > 5 && !/\d/.test(c)) ?? "";
    keluar.push({ nama, kod: kod.toUpperCase(), opsyen });
  }

  // Nama berulang dibuang — buku menyenaraikan orang yang sama dalam
  // beberapa seksyen dan padanan tidak perlu melihat salinannya.
  const nampak = new Set<string>();
  return keluar.filter((w) => {
    const k = kunciNama(w.nama);
    if (k === "" || nampak.has(k)) return false;
    nampak.add(k);
    return true;
  });
}

/** Padankan satu nama akaun dengan senarai warga. */
export function padanSatu(nama: string, warga: WargaBuku[]): PadananAkses {
  const bersih = namaBersih(nama);
  const padan = cariPadanan(bersih, warga, (w) => w.nama);
  return {
    namaBersih: bersih,
    warga: padan?.item ?? null,
    skor: padan?.skor ?? 0,
  };
}

/**
 * Padankan seluruh senarai akses sekali gus.
 *
 * Buku dibaca SEKALI di sini, bukan sekali bagi setiap baris akses — seksyen
 * guru ialah ratusan baris dan membacanya semula seratus kali ialah cara
 * skrin admin menjadi perlahan tanpa sebab yang kelihatan.
 */
export async function padanSenarai<T extends { nama: string }>(
  baris: T[],
): Promise<Map<string, PadananAkses>> {
  const peta = new Map<string, PadananAkses>();
  let warga: WargaBuku[] = [];
  try {
    warga = await wargaBuku();
  } catch {
    // Buku belum dimuat naik, atau seksyen guru belum disahkan. Skrin akses
    // mesti tetap berfungsi tanpanya — ia berfungsi sepanjang tahun sebelum
    // buku wujud.
    return peta;
  }
  if (warga.length === 0) return peta;
  for (const b of baris) peta.set(b.nama, padanSatu(b.nama, warga));
  return peta;
}
