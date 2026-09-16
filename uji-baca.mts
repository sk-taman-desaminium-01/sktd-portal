/**
 * Uji bacaDokumen() sebenar. Sumbernya diimport apa adanya, kecuali baris
 * `import "server-only"` yang ditanggalkan — baris itu sengaja melontar di
 * luar Next, dan ia tiada kaitan dengan logik yang diuji.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sumber = readFileSync("src/lib/baca-dokumen.ts", "utf8")
  .replace(/^import "server-only";\n/m, "");
const dir = mkdtempSync(join(tmpdir(), "uji-baca-"));
const fail = join(dir, "baca-dokumen.mts");
writeFileSync(fail, sumber);

const { bacaDokumen } = await import(fail);

const pdf = new File([new Uint8Array(readFileSync("/tmp/uji.pdf"))], "jadual.pdf", { type: "application/pdf" });
try {
  const d = await bacaDokumen(pdf);
  console.log("PDF  →", d.jenis, "| teks:", JSON.stringify(d.teks.slice(0, 60)), "| amaran:", d.amaran.length);
} catch (e) {
  console.log("PDF  → LONTAR:", (e as Error).message.slice(0, 250));
}

const csv = new File([new TextEncoder().encode("HARI,1,2\nISNIN,BM,MT\nSELASA,SN,BI\n")], "j.csv", { type: "text/csv" });
try {
  const d = await bacaDokumen(csv);
  console.log("CSV  →", d.jenis, "| baris:", d.grid[0]?.length, "| sel[1][1]:", d.grid[0]?.[1]?.[1]);
} catch (e) {
  console.log("CSV  → LONTAR:", (e as Error).message.slice(0, 250));
}
