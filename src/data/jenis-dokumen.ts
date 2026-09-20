/** Pengecaman jenis fail yang tulen dan boleh diuji tanpa pelayan. */
export type JenisDokumen = "pdf" | "docx" | "xlsx" | "csv" | "teks" | "imbasan" | "lain";

export function jenisDokumen(nama: string, mime: string): JenisDokumen {
  const n = nama.toLowerCase();
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (mime.includes("wordprocessingml") || n.endsWith(".docx")) return "docx";
  if (mime.includes("spreadsheetml") || n.endsWith(".xlsx") || n.endsWith(".xlsm")) return "xlsx";
  if (mime === "text/csv" || n.endsWith(".csv")) return "csv";
  // Teks OCR dari pelayar dinamakan `nama-asal.ocr.txt`.
  if (mime === "text/plain" || n.endsWith(".txt")) return "teks";
  if (mime.startsWith("image/")) return "imbasan";
  return "lain";
}
