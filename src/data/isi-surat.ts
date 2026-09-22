/**
 * ISI SURAT RASMI — cara guru menaip, cara surat dicetak (22 Sep 2026).
 *
 * Gaya WhatsApp, kerana itu yang guru sudah biasa:
 *   *teks*  → TEBAL      _teks_ → italik      ~teks~ → dicoret
 *
 * NOMBOR DITAIP SENDIRI oleh guru ("2.", "3.", "(a)"). Sistem tidak menomborkan
 * apa-apa — ia hanya menyusun: baris bernombor mendapat inden tergantung,
 * dan baris tanpa nombor di bawahnya (Enter sekali, tiada baris kosong)
 * sejajar dengan teks perenggan itu — seperti "Tarikh : …" dalam surat
 * Padang Hoki. Baris kosong memisahkan perenggan.
 *
 * Ayat "Dengan hormatnya perkara di atas adalah dirujuk." sentiasa dicetak
 * oleh templat; jika guru menaipnya juga, salinan itu dibuang.
 *
 * Surat yang dicipta SEBELUM peraturan ini ditaip dengan satu Enter bagi
 * setiap perenggan dan dinomborkan automatik (bermula 2.). Surat itu
 * dikekalkan dengan peraturan lama sehingga disunting semula.
 */

export const HAD_ISI_SATU_MUKA = 1_200;
export const HAD_BARIS = 24;
const MULA_GAYA_BAHARU = Date.parse("2026-09-22T14:30:00Z");

const RUJUK = /^dengan hormatnya,? perkara di atas (adalah )?dirujuk\.?$/i;
const NOMBOR = /^(\(?(?:\d{1,2}|[a-z]|[ivx]{1,4})[.)])\s+(.*)$/i;

export interface BarisIsi {
  /** "2.", "(a)" — seperti ditaip guru. Null untuk baris biasa. */
  nombor: string | null;
  teks: string;
  /** Baris tanpa nombor di bawah baris bernombor dalam perenggan sama → sejajar teks. */
  sejajar: boolean;
}

export function gayaLama(dicipta: string | null | undefined): boolean {
  const t = Date.parse(dicipta ?? "");
  return Number.isFinite(t) && t < MULA_GAYA_BAHARU;
}

/** Perenggan (dipisah baris kosong), setiap satu senarai baris tersusun. */
export function susunIsiSurat(isi: string, lama = false): { perenggan: BarisIsi[][]; dipendekkan: boolean } {
  const bersih = isi.replace(/\r/g, "");
  const kasar: string[][] = lama
    ? bersih.split(/\n+/).map((b) => [b])
    : bersih.split(/\n[ \t]*\n+/).map((b) => b.split("\n"));
  const perenggan = kasar
    .map((baris) => baris.map((b) => b.replace(/[ \t]+/g, " ").trim()).filter((b) => b && !RUJUK.test(b)))
    .filter((baris) => baris.length > 0)
    .map((baris, i) => {
      if (lama) {
        // Peraturan lama: setiap baris satu perenggan bernombor automatik.
        return [{ nombor: `${i + 2}.`, teks: baris[0].replace(/^\(?\d{1,2}[.)]\s*/, ""), sejajar: false }];
      }
      let adaNombor = false;
      return baris.map((b): BarisIsi => {
        const m = NOMBOR.exec(b);
        if (m) { adaNombor = true; return { nombor: m[1], teks: m[2], sejajar: false }; }
        return { nombor: null, teks: b, sejajar: adaNombor };
      });
    });

  let dipendekkan = false;
  let aksara = 0;
  let bil = 0;
  const keluar: BarisIsi[][] = [];
  for (const p of perenggan) {
    const simpan: BarisIsi[] = [];
    for (const b of p) {
      if (aksara + b.teks.length > HAD_ISI_SATU_MUKA || bil >= HAD_BARIS) { dipendekkan = true; break; }
      simpan.push(b);
      aksara += b.teks.length;
      bil++;
    }
    if (simpan.length) keluar.push(simpan);
    if (dipendekkan) break;
  }
  return { perenggan: keluar, dipendekkan };
}

export interface KepingTeks { teks: string; tebal: boolean; italik: boolean; coret: boolean }

const TANDA = { "*": "tebal", "_": "italik", "~": "coret" } as const;

/**
 * "Tarikh : *26 Sep*" → kepingan berformat. Peraturan WhatsApp: penanda
 * mesti rapat dengan teks (`*tebal*`, bukan `* tebal *`) dan tidak berada di
 * tengah perkataan — jadi "nama_fail" atau "5*3" kekal seperti ditaip.
 * Boleh bersarang: `*_tebal italik_*`.
 */
export function pecahFormat(teks: string, asas: Omit<KepingTeks, "teks"> = { tebal: false, italik: false, coret: false }): KepingTeks[] {
  const corak = /(^|[^\p{L}\p{N}*_~])([*_~])(?!\s)(.+?)(?<!\s)\2(?=$|[^\p{L}\p{N}*_~])/u;
  const m = corak.exec(teks);
  if (!m) return teks ? [{ teks, ...asas }] : [];
  const mula = m.index + m[1].length;
  const kunci = TANDA[m[2] as keyof typeof TANDA];
  return [
    ...(teks.slice(0, mula) ? [{ teks: teks.slice(0, mula), ...asas }] : []),
    ...pecahFormat(m[3], { ...asas, [kunci]: true }),
    ...pecahFormat(teks.slice(mula + m[2].length * 2 + m[3].length), asas),
  ];
}
