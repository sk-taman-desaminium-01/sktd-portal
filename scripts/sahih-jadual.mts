/**
 * Separuh PORTAL bagi `sahih-jadual.py`: baca PDF tepat seperti
 * `src/lib/baca-dokumen.ts` membacanya dan keluarkan hasil penghurai sebagai
 * JSON, satu entri setiap muka. Jangan jalankan terus — guna
 * `npm run sahih:jadual -- fail.pdf`.
 */
import { readFileSync } from "node:fs";
import { binaDrafDariKedudukan, type Kedudukan } from "../src/lib/jadual-huraian.ts";
import { semuaKelasDalam } from "../src/data/kesan-kelas.ts";
import { JADUAL_KOSONG, setUntukKelas, HARI } from "../src/data/jadual-jenis.ts";

const { getDocumentProxy } = await import("unpdf");
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(process.argv[2])));
const semua: Kedudukan[][] = [];
for (let i = 1; i <= pdf.numPages; i++) {
  const isi = await (await pdf.getPage(i)).getTextContent();
  semua.push((isi.items as { str?: string; transform: number[]; width: number; height: number; fontName: string }[])
    .filter((it) => typeof it.str === "string" && it.str.trim() !== "")
    .map((it) => ({ str: it.str!, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height, f: it.fontName })));
}
const muka = semua.map((item) => {
  const kelas = semuaKelasDalam(item.map((t) => t.str).join(" "));
  const set = kelas.length === 1 ? setUntukKelas(JADUAL_KOSONG, kelas[0]) : null;
  const d = set ? binaDrafDariKedudukan([item], set.senarai, semua) : null;
  const hari: Record<string, (string[] | null)[]> = {};
  for (const h of HARI) {
    const s = d?.draf.hari[h] ?? {};
    hari[h] = (set?.senarai ?? []).map((w) => {
      const x = s[w.id];
      if (!x) return null;
      const g = d!.draf.guruSubjek ?? {};
      return [x.subjek, x.guru ?? g[x.subjek] ?? "", x.seiring ?? "", x.seiring ? (g[x.seiring] ?? "") : ""];
    });
  }
  return { kelas: kelas.length === 1 ? kelas[0] : null, hari, amaran: d?.amaran ?? [] };
});
console.log(JSON.stringify({ muka }));
