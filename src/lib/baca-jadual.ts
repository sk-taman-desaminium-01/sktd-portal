"use server";

import { pengguna } from "./akses";
import { kelasBolehSunting } from "./guru-kelas";
import { muatNaik } from "./storan";
import { type KelasJadual, type Sesi } from "@/data/jadual-jenis";
import { binaDraf } from "./jadual-huraian";

/**
 * Baca fail jadual waktu yang dimuat naik, dan CADANGKAN draf.
 *
 * FALSAFAH SAMA DENGAN BUKU PENGURUSAN (docs/buku-pengurusan.md): andaikan
 * pengekstrakan PASTI silap kadang-kadang. Tiada apa yang diterbitkan
 * automatik. Fungsi ini memulangkan CADANGAN; guru kelas menyemaknya dalam
 * grid dan menekan Simpan sendiri.
 *
 * APA YANG BOLEH DAN TIDAK BOLEH DIBACA
 *  · PDF dengan lapisan teks  → boleh (ditaip dalam Word/Excel lalu dieksport)
 *  · DOCX                     → boleh
 *  · PDF imbasan / gambar     → TIDAK. Ia perlu OCR, dan OCR dalam projek ini
 *    menggunakan Ollama tempatan yang tidak wujud di Vercel. Kita BERHENTI dan
 *    beritahu, bukan meneka — tekaan pada jadual bermakna ibu bapa membaca
 *    subjek yang salah untuk anak mereka.
 *
 * Fail asal SENTIASA disimpan, walaupun pembacaan gagal: ia sumber kebenaran,
 * dan guru kelas boleh merujuknya sambil mengisi grid.
 */

export interface HasilBaca {
  ok: boolean;
  mesej: string;
  /** URL fail yang disimpan — sentiasa ada jika muat naik berjaya. */
  fail?: string;
  /** Teks mentah yang dibaca, untuk guru bandingkan. */
  teks?: string;
  /** Cadangan jadual. Tiada jika fail tidak boleh dibaca. */
  draf?: KelasJadual;
  /** Berapa slot dikenal pasti berbanding jumlah slot PdP. */
  keyakinan?: { dikenal: number; jumlah: number };
  amaran?: string[];
}

/* ------------------------------------------------------------ baca dokumen */

async function teksDariPdf(buf: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function teksDariDocx(buf: ArrayBuffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
  return value;
}

/* ---------------------------------------------------------------- tindakan */

export async function naikFailJadual(data: FormData): Promise<HasilBaca> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tidak dibenarkan." };

  const label = String(data.get("kelas") ?? "").trim();
  const sesi = (String(data.get("sesi") ?? "pagi") as Sesi) === "petang" ? "petang" : "pagi";
  const fail = data.get("fail");

  const dibenar = await kelasBolehSunting();
  if (dibenar !== null && !dibenar.includes(label)) {
    return { ok: false, mesej: `Anda bukan guru kelas ${label}.` };
  }
  if (!(fail instanceof File) || fail.size === 0) {
    return { ok: false, mesej: "Tiada fail dipilih." };
  }

  // Fail asal disimpan DAHULU, sebelum apa-apa pembacaan. Kalau pembacaan
  // gagal, fail itu masih ada untuk dirujuk guru kelas.
  let url: string;
  try {
    const hasil = await muatNaik(fail, "jadual");
    url = hasil.url;
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Muat naik gagal." };
  }

  const jenis = fail.type;
  const buf = await fail.arrayBuffer();
  let teks = "";

  try {
    if (jenis === "application/pdf") teks = await teksDariPdf(buf);
    else if (jenis.includes("wordprocessingml") || fail.name.toLowerCase().endsWith(".docx")) {
      teks = await teksDariDocx(buf);
    } else {
      return {
        ok: true, fail: url,
        mesej:
          "Fail disimpan, tetapi jenis ini tidak boleh dibaca automatik. " +
          "Buka fail itu di sebelah dan isi grid di bawah.",
        amaran: ["Hanya PDF (berteks) dan DOCX boleh dibaca."],
      };
    }
  } catch (e) {
    return {
      ok: true, fail: url,
      mesej: "Fail disimpan, tetapi gagal dibaca. Isi grid di bawah secara manual.",
      amaran: [e instanceof Error ? e.message : "Ralat membaca fail."],
    };
  }

  const bersih = teks.replace(/ /g, " ").trim();
  if (bersih.length < 40) {
    // Tiada lapisan teks = hampir pasti imbasan. JANGAN teka.
    return {
      ok: true, fail: url, teks: bersih,
      mesej:
        "Fail disimpan, tetapi ia tidak mengandungi teks yang boleh dibaca — " +
        "kemungkinan besar ia imbasan atau gambar. Sistem TIDAK meneka isinya. " +
        "Buka fail itu di sebelah dan isi grid di bawah.",
      amaran: ["Imbasan memerlukan OCR, yang tidak berjalan di pelayan ini."],
    };
  }

  const { draf, dikenal, jumlah } = binaDraf(bersih, sesi);
  return {
    ok: true,
    fail: url,
    teks: bersih.slice(0, 4000),
    draf,
    keyakinan: { dikenal, jumlah },
    mesej:
      dikenal === 0
        ? "Fail dibaca, tetapi tiada subjek dikenal pasti. Isi grid secara manual."
        : `Fail dibaca. ${dikenal} slot dikenal pasti — SEMAK setiap satu sebelum menyimpan.`,
  };
}
