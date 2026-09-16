/**
 * Membina grid baris-dan-lajur daripada koordinat teks PDF.
 *
 * Diasingkan kerana DUA pembaca memerlukannya: jadual waktu dan Buku
 * Pengurusan. Menyalinnya ke dua tempat ialah cara pepijat TASMIK berlaku —
 * satu salinan dikemas kini, satu lagi tidak, dan tiada ralat di mana-mana.
 *
 * Import relatif dengan sambungan .ts supaya ia boleh dijalankan terus oleh
 * Node semasa ujian.
 */

export interface ItemKedudukan {
  str: string;
  x: number;
  y: number;
  w?: number;
}

/**
 * Bina grid daripada KEDUDUKAN teks dalam PDF.
 *
 * KENAPA INI PERLU: `extractText` memulangkan teks mengikut susunan ia
 * disimpan dalam fail, bukan mengikut susunan ia KELIHATAN. Pada jadual aSc
 * sebenar sekolah, hasilnya ialah senarai subjek dan nama guru yang bercampur
 * tanpa sebarang petunjuk sel mana milik hari mana — diuji pada fail sebenar:
 * 0 daripada 45 slot dikenal pasti.
 *
 * Tetapi setiap serpihan teks dalam PDF membawa koordinat x dan y. Dengan
 * mengumpulkan y menjadi baris dan x menjadi lajur, jadual yang dilihat mata
 * boleh dibina semula — dan barulah "sel ini di bawah hari itu" bermakna.
 *
 * Nota: paksi y PDF bermula dari BAWAH, jadi baris disusun menurun.
 */
export function gridDariKedudukan(
  item: ItemKedudukan[],
): string[][] {
  const berisi = item.filter((i) => i.str.trim() !== "");
  if (berisi.length === 0) return [];

  /** Kumpulkan nilai berhampiran menjadi satu paksi. */
  const kumpul = (nilai: number[], toleransi: number): number[] => {
    const susun = [...nilai].sort((a, b) => a - b);
    const pusat: number[] = [];
    for (const n of susun) {
      if (pusat.length === 0 || Math.abs(n - pusat[pusat.length - 1]) > toleransi) pusat.push(n);
    }
    return pusat;
  };

  // Toleransi: baris lebih ketat daripada lajur, kerana teks dalam satu sel
  // boleh berpecah kepada beberapa baris kecil (subjek di atas, guru di bawah).
  const barisY = kumpul(berisi.map((i) => i.y), 6).sort((a, b) => b - a);
  const lajurX = kumpul(berisi.map((i) => i.x), 18);

  const dekat = (senarai: number[], n: number) =>
    senarai.reduce((t, v, idx) => (Math.abs(v - n) < Math.abs(senarai[t] - n) ? idx : t), 0);

  const grid: string[][] = barisY.map(() => Array(lajurX.length).fill(""));
  for (const i of berisi) {
    const r = dekat(barisY, i.y);
    const c = dekat(lajurX, i.x);
    grid[r][c] = grid[r][c] ? `${grid[r][c]} ${i.str.trim()}` : i.str.trim();
  }
  return grid;
}

