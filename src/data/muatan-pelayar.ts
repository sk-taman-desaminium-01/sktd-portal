"use client";

import { failKeMuatan, type MuatanFail } from "./fail-base64";
import { mintaSlotMuatNaik } from "@/lib/muat-naik-terus";

/**
 * Sediakan fail untuk Server Action — DARI TELEFON ATAU KOMPUTER.
 *
 * 1. Kenal pasti jenis sebenar daripada BAIT, bukan nama. Android yang
 *    mengambil fail daripada WhatsApp/Drive kerap memberi jenis
 *    `application/octet-stream` atau nama tanpa sambungan ("1000123.bin",
 *    "document") — pelayan dahulu menolaknya sebagai jenis tidak dibenarkan.
 * 2. Fail > 3 MB dihantar TERUS ke storan (had badan Vercel 4.5 MB, base64
 *    +33%). Fail kecil kekal base64 — satu perjalanan, tiada storan.
 */
const HAD_BASE64 = 3 * 1024 * 1024;

const PETA: Record<string, { sambungan: string; jenis: string }> = {
  pdf: { sambungan: "pdf", jenis: "application/pdf" },
  png: { sambungan: "png", jenis: "image/png" },
  jpg: { sambungan: "jpg", jenis: "image/jpeg" },
  webp: { sambungan: "webp", jenis: "image/webp" },
  docx: { sambungan: "docx", jenis: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  xlsx: { sambungan: "xlsx", jenis: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  zip: { sambungan: "zip", jenis: "application/zip" },
};

function ada(bait: Uint8Array, teks: string): boolean {
  const cari = new TextEncoder().encode(teks);
  outer: for (let i = 0; i <= bait.length - cari.length; i++) {
    for (let j = 0; j < cari.length; j++) if (bait[i + j] !== cari[j]) continue outer;
    return true;
  }
  return false;
}

async function kenalJenis(fail: File): Promise<keyof typeof PETA | null> {
  const kepala = new Uint8Array(await fail.slice(0, 16).arrayBuffer());
  const h = (...b: number[]) => b.every((x, i) => kepala[i] === x);
  if (h(0x25, 0x50, 0x44, 0x46)) return "pdf";
  if (h(0x89, 0x50, 0x4e, 0x47)) return "png";
  if (h(0xff, 0xd8, 0xff)) return "jpg";
  if (h(0x52, 0x49, 0x46, 0x46) && kepala[8] === 0x57 && kepala[9] === 0x45) return "webp";
  if (h(0x50, 0x4b, 0x03, 0x04)) {
    // Office Open XML ialah ZIP. Nama bahagian dalaman menentukan jenisnya.
    const awal = new Uint8Array(await fail.slice(0, 256 * 1024).arrayBuffer());
    const akhir = new Uint8Array(await fail.slice(Math.max(0, fail.size - 256 * 1024)).arrayBuffer());
    if (ada(awal, "word/") || ada(akhir, "word/document.xml")) return "docx";
    if (ada(awal, "xl/") || ada(akhir, "xl/workbook.xml")) return "xlsx";
    return "zip";
  }
  return null;
}

/** Betulkan nama & jenis fail mengikut kandungan sebenar. */
export async function normalkanFail(fail: File): Promise<File> {
  const jenis = await kenalJenis(fail).catch(() => null);
  if (!jenis) return fail;
  const p = PETA[jenis];
  const namaSah = new RegExp(`\\.(${p.sambungan}${jenis === "jpg" ? "|jpeg" : ""}${jenis === "xlsx" ? "|xlsm" : ""})$`, "i").test(fail.name);
  if (namaSah && fail.type === p.jenis) return fail;
  const asas = fail.name.replace(/\.[a-z0-9]{1,5}$/i, "") || "fail";
  return new File([fail], namaSah ? fail.name : `${asas}.${p.sambungan}`, { type: p.jenis, lastModified: fail.lastModified });
}

export async function sediaMuatan(asal: File): Promise<MuatanFail> {
  const fail = await normalkanFail(asal);
  if (fail.size <= HAD_BASE64) return failKeMuatan(fail);

  const slot = await mintaSlotMuatNaik(fail.name, fail.size);
  if (!slot.ok || !slot.urlMuatNaik || !slot.laluan) throw new Error(slot.mesej || "Muat naik fail besar gagal disediakan.");
  const res = await fetch(slot.urlMuatNaik, {
    method: "PUT",
    headers: {
      "Content-Type": fail.type || "application/octet-stream",
      "x-upsert": "false",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
    body: fail,
  });
  if (!res.ok) throw new Error(`Muat naik ke storan gagal (${res.status}). Semak sambungan internet dan cuba lagi.`);
  return { nama: fail.name, jenis: fail.type, saiz: fail.size, laluan: slot.laluan };
}
