import "server-only";

/**
 * Pembacaan dokumen yang DIKONGSI — jadual waktu, Buku Pengurusan, dan
 * apa-apa lagi yang perlu membaca fail yang dimuat naik.
 *
 * Ia memulangkan dua perkara, dan perbezaannya penting:
 *
 *   · `teks`  — semua teks, rata. Sentiasa ada kalau fail boleh dibaca.
 *   · `grid`  — SEL SEBENAR dalam baris dan lajur, bila format menyimpannya.
 *
 * Excel dan jadual DOCX menyimpan struktur; PDF tidak. Dengan grid, kita tahu
 * sel mana di bawah lajur "ISNIN" dan pada baris waktu yang mana — jadi
 * padanan menjadi kedudukan, bukan tekaan urutan. Itu perbezaan antara
 * jadual yang boleh dipercayai dan jadual yang perlu disemak sel demi sel.
 *
 * APA YANG TIDAK BOLEH DIBACA: PDF imbasan dan gambar. Ia perlu OCR, dan OCR
 * dalam projek ini menggunakan Ollama tempatan yang tidak wujud di Vercel
 * (docs/buku-pengurusan.md). Kita katakan demikian dan berhenti — tekaan pada
 * dokumen sekolah bermakna orang membaca maklumat yang tidak pernah wujud.
 */

export type JenisDokumen = "pdf" | "docx" | "xlsx" | "csv" | "imbasan" | "lain";

export interface Dokumen {
  jenis: JenisDokumen;
  teks: string;
  /** [helaian][baris][lajur]. Kosong bila format tidak menyimpan struktur. */
  grid: string[][][];
  amaran: string[];
}

/** Tentukan jenis dari MIME dan nama fail — MIME sahaja tidak boleh dipercayai. */
export function jenisFail(nama: string, mime: string): JenisDokumen {
  const n = nama.toLowerCase();
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (mime.includes("wordprocessingml") || n.endsWith(".docx")) return "docx";
  if (mime.includes("spreadsheetml") || n.endsWith(".xlsx") || n.endsWith(".xlsm")) return "xlsx";
  if (mime === "text/csv" || n.endsWith(".csv")) return "csv";
  if (mime.startsWith("image/")) return "imbasan";
  return "lain";
}

/* --------------------------------------------------------------------- PDF */

async function bacaPdf(buf: ArrayBuffer): Promise<Dokumen> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  const teks = (Array.isArray(text) ? text.join("\n") : text).replace(/ /g, " ").trim();

  // PDF yang diimbas memulangkan hampir tiada teks. Itu bukan "kosong" —
  // itu isyarat bahawa ia gambar, dan kita mesti berkata begitu.
  if (teks.length < 40) {
    return {
      jenis: "imbasan", teks, grid: [],
      amaran: [
        "PDF ini tidak mengandungi lapisan teks — hampir pasti ia imbasan atau gambar.",
        "Membacanya memerlukan OCR, yang tidak berjalan di pelayan ini.",
      ],
    };
  }
  return { jenis: "pdf", teks, grid: [], amaran: [] };
}

/* -------------------------------------------------------------------- DOCX */

/** Tarik jadual dari HTML mammoth tanpa penghurai DOM — pelayan tiada DOM. */
function jadualDariHtml(html: string): string[][][] {
  const grid: string[][][] = [];
  for (const [, isiJadual] of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    const baris: string[][] = [];
    for (const [, isiBaris] of isiJadual.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const sel: string[] = [];
      for (const [, isiSel] of isiBaris.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
        sel.push(
          isiSel.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(),
        );
      }
      if (sel.length) baris.push(sel);
    }
    if (baris.length) grid.push(baris);
  }
  return grid;
}

async function bacaDocx(buf: ArrayBuffer): Promise<Dokumen> {
  const mammoth = (await import("mammoth")).default;
  const nodeBuf = Buffer.from(buf);
  const [{ value: teks }, { value: html }] = await Promise.all([
    mammoth.extractRawText({ buffer: nodeBuf }),
    mammoth.convertToHtml({ buffer: nodeBuf }),
  ]);
  return { jenis: "docx", teks: teks.trim(), grid: jadualDariHtml(html), amaran: [] };
}

/* ------------------------------------------------------------------- Excel */

async function bacaXlsx(buf: ArrayBuffer): Promise<Dokumen> {
  const ExcelJS = (await import("exceljs")).default;
  const buku = new ExcelJS.Workbook();
  await buku.xlsx.load(buf);

  const grid: string[][][] = [];
  const teks: string[] = [];

  buku.eachSheet((helaian) => {
    const baris: string[][] = [];
    helaian.eachRow({ includeEmpty: true }, (row) => {
      const sel: string[] = [];
      // `eachCell` melangkau sel kosong, dan itu MEROSAKKAN kedudukan lajur —
      // satu sel kosong akan menganjakkan semua sel selepasnya ke hari yang
      // salah. Jadi kita berjalan mengikut nombor lajur, bukan mengikut sel
      // yang wujud.
      const lebar = Math.max(helaian.columnCount, row.cellCount);
      for (let c = 1; c <= lebar; c++) {
        const v = row.getCell(c).value;
        sel.push(nilaiSel(v));
      }
      baris.push(sel);
    });
    if (baris.length) {
      grid.push(baris);
      teks.push(baris.map((b) => b.join(" | ")).join("\n"));
    }
  });

  return { jenis: "xlsx", teks: teks.join("\n\n").trim(), grid, amaran: [] };
}

/** Tukar nilai sel ExcelJS kepada teks biasa. */
function nilaiSel(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (typeof o.text === "string") return o.text.trim();
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text).join("").trim();
    if (o.result !== undefined) return nilaiSel(o.result);
  }
  return "";
}

/* --------------------------------------------------------------------- CSV */

function bacaCsv(teksMentah: string): Dokumen {
  const baris = teksMentah.split(/\r?\n/).filter((b) => b.trim() !== "");
  const grid = [baris.map(pecahBarisCsv)];
  return { jenis: "csv", teks: teksMentah.trim(), grid, amaran: [] };
}

/** Pecah satu baris CSV, menghormati petikan berganda. */
function pecahBarisCsv(baris: string): string[] {
  const sel: string[] = [];
  let semasa = "";
  let dalamPetikan = false;
  for (let i = 0; i < baris.length; i++) {
    const c = baris[i];
    if (c === '"') {
      if (dalamPetikan && baris[i + 1] === '"') { semasa += '"'; i++; }
      else dalamPetikan = !dalamPetikan;
    } else if (c === "," && !dalamPetikan) {
      sel.push(semasa.trim());
      semasa = "";
    } else semasa += c;
  }
  sel.push(semasa.trim());
  return sel;
}

/* ------------------------------------------------------------------- utama */

export async function bacaDokumen(fail: File): Promise<Dokumen> {
  const jenis = jenisFail(fail.name, fail.type);

  if (jenis === "imbasan") {
    return {
      jenis: "imbasan", teks: "", grid: [],
      amaran: [
        "Gambar tidak boleh dibaca automatik — ia memerlukan OCR, yang tidak berjalan di pelayan ini.",
      ],
    };
  }
  if (jenis === "lain") {
    return {
      jenis: "lain", teks: "", grid: [],
      amaran: ["Jenis fail ini tidak disokong. Guna PDF, DOCX, XLSX atau CSV."],
    };
  }

  const buf = await fail.arrayBuffer();
  if (jenis === "pdf") return bacaPdf(buf);
  if (jenis === "docx") return bacaDocx(buf);
  if (jenis === "xlsx") return bacaXlsx(buf);
  return bacaCsv(new TextDecoder().decode(buf));
}
