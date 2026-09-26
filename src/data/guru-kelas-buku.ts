import { semuaKelas, semuaKelasPPKI } from "./kelas.ts";
import { tokenNama } from "./borang-aktiviti.ts";

/**
 * BENTUK SEBENAR SEKSYEN GURU KELAS — diukur pada buku sekolah, bukan diteka.
 *
 * Dua pusingan tekaan memulangkan SIFAR. Buku itu akhirnya dibaca terus
 * (BUKU PENGURUSAN SKTD25, m.73–75) dan bentuknya:
 *
 *   TAHUN 1                                    ← tahun pada baris TAJUK
 *   PENYELARAS : NOR HASFARADZI BIN HASHIM
 *   BIL | KELAS | GURU KELAS | GURU PEMBANTU / PPM
 *    1  | DEDIKASI | SUHAILA BINTI SUHAIMI | MOHD NASSER BIN SAPARI
 *    2  | EFEKTIF  | FARIZAH BEGUM ...     | ISFAN FAZLI ...
 *
 * TIGA SEBAB padanan lama gagal sepenuhnya:
 *  1. Kelas ditulis TANPA tahun ("DEDIKASI"), dan tahunnya berada pada baris
 *     tajuk di atas — jadi tiada satu pun baris mengandungi "1 DEDIKASI".
 *  2. Lajur KEEMPAT ialah GURU PEMBANTU. Mengambil "nama terpanjang" boleh
 *     memilih pembantu, dan itu memberi pembantu kuasa menyunting kelas.
 *  3. PPKI disenaraikan sebagai "SUNFLOWER" sahaja, tanpa awalan PPKI.
 */

/** Nama kelas tanpa tahun → label rasmi, dengan tahun daripada baris tajuk. */
function labelRasmi(tahun: number | null, namaKelas: string): string | null {
  const bersih = namaKelas.toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (!bersih) return null;

  // PPKI ditulis tanpa awalan dalam buku ("SUNFLOWER", "LILY").
  const ppki = semuaKelasPPKI().find(
    (k) => k.toUpperCase() === bersih || k.toUpperCase() === `PPKI ${bersih}`,
  );
  if (ppki) return ppki;

  if (tahun === null) return null;
  const penuh = `${tahun} ${bersih}`;
  return semuaKelas().find((k) => k.toUpperCase() === penuh) ?? null;
}

/** "TAHUN 3" pada baris sendiri → 3. Null kalau baris itu bukan tajuk tahun. */
function tahunDariTajuk(baris: string[]): number | null {
  const teks = baris.join(" ").toUpperCase().replace(/\s+/g, " ").trim();
  const m = /^TAHUN\s*([1-6])\b/.exec(teks);
  return m ? Number(m[1]) : null;
}

/**
 * Baris tajuk lajur → indeks lajur KELAS dan GURU KELAS.
 *
 * Penghurai PDF kadang-kadang mencantumkan sel bersebelahan, jadi tajuknya
 * datang dalam DUA bentuk yang kedua-duanya sah:
 *   ["BIL", "KELAS", "GURU KELAS", "GURU PEMBANTU / PPM"]
 *   ["BIL KELAS",    "GURU KELAS", "GURU PEMBANTU / PPM"]
 *
 * "GURU KELAS" dipadan TEPAT — "GURU PEMBANTU / PPM" mesti tidak terpilih,
 * kerana menetapkan pembantu sebagai guru kelas memberinya kuasa menyunting
 * jadual kelas itu.
 */
function lajurDariTajuk(baris: string[]): { kelas: number; guru: number } | null {
  const naik = baris.map((b) => (b ?? "").toUpperCase().replace(/\s+/g, " ").trim());
  const kelas = naik.findIndex((b) => b === "KELAS" || b === "BIL KELAS");
  const guru = naik.findIndex((b) => b === "GURU KELAS");
  return kelas >= 0 && guru >= 0 ? { kelas, guru } : null;
}

/**
 * Pasangan kelas + guru kelas daripada baris seksyen.
 *
 * Tulen dan tanpa I/O supaya ia boleh diuji terhadap buku sebenar.
 */
export function pasanganGuruKelas(
  semuaBaris: string[][],
): { kelas: string; guru: string }[] {
  const keluar: { kelas: string; guru: string }[] = [];
  let tahun: number | null = null;
  let lajur: { kelas: number; guru: number } | null = null;
  const dilihat = new Set<string>();

  for (const mentah of semuaBaris) {
    const sel = mentah.map((x) => (x ?? "").trim());
    const isi = sel.filter(Boolean);
    if (isi.length === 0) continue;

    const t = tahunDariTajuk(isi);
    if (t !== null) { tahun = t; lajur = null; continue; }
    // PRASEKOLAH ada tajuknya sendiri dan kelasnya bukan kelas rendah.
    if (/^PRASEKOLAH/i.test(isi.join(" "))) { tahun = null; lajur = null; continue; }

    const l = lajurDariTajuk(sel);
    if (l) { lajur = l; continue; }

    /* Baris data bermula dengan nombor BIL — sama ada sebagai sel sendiri
       ("1" | "DEDIKASI" | …) atau bercantum dengan kelas ("1 DEDIKASI" | …).
       Kedua-duanya berlaku pada buku yang sama, bergantung bagaimana
       penghurai PDF memecahkan barisnya. */
    const awal = /^(\d{1,2})\s*(.*)$/.exec(isi[0]);
    if (!awal) continue;

    const selKelas = lajur ? (sel[lajur.kelas] ?? "") : (awal[2] || isi[1] || "");
    // Buang nombor BIL yang bercantum di hadapan nama kelas.
    const namaKelas = selKelas.replace(/^\s*\d{1,2}\s+/, "").trim() || awal[2].trim();
    const namaGuru = (lajur ? sel[lajur.guru] : isi[2]) ?? "";
    if (!namaKelas || !namaGuru) continue;

    const kelas = labelRasmi(tahun, namaKelas);
    if (!kelas || dilihat.has(kelas)) continue;
    // Nama guru mesti dua perkataan; sel kosong atau "-" bukan nama.
    if (tokenNama(namaGuru).length < 2) continue;

    dilihat.add(kelas);
    keluar.push({ kelas, guru: namaGuru.replace(/\s+/g, " ").trim() });
  }
  return keluar;
}
