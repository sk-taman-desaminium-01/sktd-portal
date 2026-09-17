/**
 * NAIK TAHUN — apa yang berlaku pada 1 Januari.
 *
 * Ini operasi paling merbahaya dalam seluruh sistem. Ia menyentuh setiap
 * murid sekali, ia berlaku sekali setahun, dan orang yang menekannya tidak
 * akan pernah cukup biasa dengannya untuk perasan bila ia salah. Kalau ia
 * tersilap, kesilapan itu ditemui pada bulan Mac oleh guru yang mendapati
 * kelasnya kosong.
 *
 * Maka keputusannya dipisahkan daripada pelaksanaannya. Fail ini TIDAK
 * menyentuh pangkalan data langsung: ia menerima senarai pendaftaran dan
 * memulangkan RANCANGAN. Rancangan itu boleh dipapar kepada manusia,
 * dihitung, dan diuji — dan ujian itu boleh dijalankan tanpa pangkalan data,
 * yang bermakna ia benar-benar dijalankan.
 *
 * Peraturan keras #5: import mesti larian kering dahulu. Ini lebih besar
 * daripada import.
 */

export interface Pendaftaran {
  murid_id: string;
  tahun: number;
  kelas: string;
  aliran: string;
}

export interface LangkahNaik {
  murid_id: string;
  dari: number;
  ke: number;
  kelas: string;
  aliran: string;
}

export interface RancanganNaik {
  dariSesi: number;
  keSesi: number;
  /** Murid yang naik satu tahun. */
  naik: LangkahNaik[];
  /** Tahun 6 — tamat persekolahan. Rekod KEKAL, status sahaja bertukar. */
  tamat: string[];
  /** Sudah ada dalam sesi sasaran. Dilangkau, bukan ditulis ganti. */
  sudahAda: string[];
  /** Baris yang tidak boleh diproses, dengan sebabnya. */
  ditolak: { murid_id: string; sebab: string }[];
  /** Berapa murid setiap tahun SELEPAS naik — untuk disemak mata kasar. */
  taburan: { tahun: number; bil: number }[];
  /** Perkara yang manusia patut baca sebelum menekan. */
  amaran: string[];
}

/**
 * Bina rancangan. Tidak menulis apa-apa.
 *
 * `sediaAda` ialah murid yang SUDAH berdaftar dalam sesi sasaran. Ia wujud
 * kerana naik tahun akan ditekan dua kali — seseorang akan tertanya sama ada
 * ia berjaya dan menekannya lagi. Kali kedua mesti tidak melakukan apa-apa,
 * dan mesti MENGATAKAN bahawa ia tidak melakukan apa-apa.
 */
export function rancangNaik(
  pendaftaran: Pendaftaran[],
  dariSesi: number,
  keSesi: number,
  sediaAda: string[] = [],
): RancanganNaik {
  const amaran: string[] = [];
  const ditolak: { murid_id: string; sebab: string }[] = [];
  const set = new Set(sediaAda);

  if (keSesi <= dariSesi) {
    amaran.push(`Sesi sasaran (${keSesi}) mesti lebih lewat daripada sesi sumber (${dariSesi}).`);
  }
  if (keSesi - dariSesi > 1) {
    amaran.push(`Melangkau ${keSesi - dariSesi - 1} sesi. Murid akan naik SATU tahun sahaja.`);
  }

  const naik: LangkahNaik[] = [];
  const tamat: string[] = [];
  const sudahAda: string[] = [];
  const nampak = new Set<string>();

  for (const p of pendaftaran) {
    if (nampak.has(p.murid_id)) {
      ditolak.push({ murid_id: p.murid_id, sebab: "Berdaftar lebih sekali dalam sesi sumber." });
      continue;
    }
    nampak.add(p.murid_id);

    if (set.has(p.murid_id)) { sudahAda.push(p.murid_id); continue; }

    if (!Number.isInteger(p.tahun) || p.tahun < 1 || p.tahun > 6) {
      ditolak.push({ murid_id: p.murid_id, sebab: `Tahun ${p.tahun} bukan 1–6.` });
      continue;
    }
    if (p.tahun === 6) { tamat.push(p.murid_id); continue; }
    if (!p.kelas || p.kelas.trim() === "") {
      ditolak.push({ murid_id: p.murid_id, sebab: "Tiada kelas." });
      continue;
    }
    naik.push({
      murid_id: p.murid_id, dari: p.tahun, ke: p.tahun + 1,
      kelas: p.kelas, aliran: p.aliran ?? "",
    });
  }

  const kira = new Map<number, number>();
  for (const n of naik) kira.set(n.ke, (kira.get(n.ke) ?? 0) + 1);
  const taburan = [...kira.entries()]
    .map(([tahun, bil]) => ({ tahun, bil }))
    .sort((a, b) => a.tahun - b.tahun);

  // Tahun 1 SELALU kosong selepas naik tahun, dan itu betul — murid Tahun 1
  // datang dari pendaftaran baharu, bukan dari kelas sebelumnya. Dikatakan
  // terus terang supaya tiada siapa menyangka sesuatu hilang.
  amaran.push("Tahun 1 kekal kosong sehingga murid baharu dimasukkan — itu dijangka.");

  if (sudahAda.length > 0) {
    amaran.push(
      `${sudahAda.length} murid sudah berdaftar dalam sesi ${keSesi}. Mereka DILANGKAU, ` +
        "bukan ditulis ganti — data yang sudah ada kekal.",
    );
  }
  if (naik.length === 0 && tamat.length === 0) {
    amaran.push("Tiada murid untuk dinaikkan. Semak sama ada sesi sumber betul.");
  }
  if (ditolak.length > 0) {
    amaran.push(`${ditolak.length} baris tidak boleh diproses — lihat senarai di bawah.`);
  }

  return { dariSesi, keSesi, naik, tamat, sudahAda, ditolak, taburan, amaran };
}

/** Pergerakan setiap kelas, untuk disemak mata kasar. */
export function gerakKelas(r: RancanganNaik): { label: string; bil: number }[] {
  const kira = new Map<string, number>();
  for (const n of r.naik) {
    const k = `Tahun ${n.dari} ${n.kelas} → Tahun ${n.ke} ${n.kelas}`;
    kira.set(k, (kira.get(k) ?? 0) + 1);
  }
  return [...kira.entries()]
    .map(([label, bil]) => ({ label, bil }))
    .sort((a, b) => a.label.localeCompare(b.label, "ms-MY"));
}
