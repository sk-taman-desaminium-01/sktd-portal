/**
 * RUANG DEPLOY — peraturan yang dikongsi pelayar DAN pelayan.
 *
 * Guru menerbitkan game atau nota interaktif HTML ke `<nama>.sktd.edu.my`.
 * Fail disimpan dalam baldi Supabase `interaktif`; Worker `sktd-web`
 * menghidangkannya mengikut subdomain (lihat `sktd-web/worker/index.ts`).
 *
 * Semua semakan di sini dijalankan DUA KALI: dalam pelayar supaya guru
 * nampak masalah serta-merta, dan di pelayan kerana pelayar boleh dipintas.
 * Satu fail supaya dua semakan itu tidak pernah terpesong.
 */

// Sambungan .ts supaya fail ini boleh dijalankan terus oleh Node semasa ujian.
import { SUBJEK } from "./subjek.ts";

/** Had setiap laman, SELEPAS zip dibuka. Storan Supabase 1 GB dikongsi semua app. */
export const HAD_LAMAN_MB = 10;
export const HAD_LAMAN_BAIT = HAD_LAMAN_MB * 1024 * 1024;
/**
 * Laman BAHARU setiap guru setiap bulan (permintaan pengguna, 19 Okt 2026).
 * Dikira daripada log terbit, jadi memadam laman tidak membuka semula kuota
 * bulan itu. Sunting laman sedia ada tidak dikira.
 */
export const HAD_LAMAN_BULAN = 5;
/** Kod HTML yang ditampal terus ke dalam borang. */
export const HAD_KOD_BAIT = 2 * 1024 * 1024;
/** Fail dalam satu zip. */
export const HAD_FAIL = 200;

export const BALDI_INTERAKTIF = "interaktif";

export const JENIS_LAMAN = [
  { kod: "game", nama: "Permainan" },
  { kod: "nota", nama: "Nota Interaktif" },
] as const;
export type JenisLaman = (typeof JENIS_LAMAN)[number]["kod"];

export const SUMBER_LAMAN = [
  { kod: "fail", nama: "Muat naik fail", ringkas: ".html atau .zip" },
  { kod: "kod", nama: "Tampal kod HTML", ringkas: "salin & tampal kod" },
  { kod: "cloudflare", nama: "Pautan Cloudflare", ringkas: "workers.dev / pages.dev" },
  { kod: "canva", nama: "Pautan Canva", ringkas: "laman Canva yang diterbitkan" },
] as const;
export type SumberLaman = (typeof SUMBER_LAMAN)[number]["kod"];

/** Mata pelajaran berpanitia + Kokurikulum + Lain-lain. */
export const SUBJEK_LAMAN: string[] = [
  ...SUBJEK.filter((s) => s.panitia).map((s) => s.nama),
  "Kokurikulum",
  "Lain-lain",
];

/**
 * Subdomain yang TIDAK boleh diambil guru. Ia sama ada sudah digunakan
 * sistem sekolah (portal, epbd, Clerk), atau namanya mengelirukan ibu bapa.
 * Senarai yang sama ada dalam Worker `sktd-web` — kemas kini kedua-duanya.
 */
export const DIKHASKAN = [
  "www", "mail", "admin", "api", "ftp", "cpanel", "webmail", "smtp", "imap", "pop",
  "portal", "epbd", "payibg", "bkgk", "clerk", "accounts", "clkmail", "deploy",
  "sekolah", "sktd", "pengumuman", "aktiviti", "interaktif", "jadual", "guru",
  "pentadbir", "ppd", "jpn", "moe", "kpm", "delima", "login", "masuk",
  // Subdomain hidup milik projek lain (Cloudflare Pages) — JANGAN dihidangkan di sini.
  "funrun",
];

const KASAR = ["bodoh", "babi", "sial", "celaka", "bangang", "bengap", "pukimak", "lancau", "puki"];

/** Bilangan perkataan dalam nama projek. */
export function perkataan(tajuk: string): string[] {
  return tajuk.trim().split(/\s+/).filter(Boolean);
}

/** Null jika sah; jika tidak, mesej untuk guru. */
export function semakTajuk(tajuk: string): string | null {
  const n = perkataan(tajuk).length;
  if (n === 0) return "Isi nama projek.";
  if (n < 2) return "Tambah satu lagi perkataan (2 atau 3 perkataan).";
  if (n > 3) return "Terlalu panjang. Gunakan 2 atau 3 perkataan sahaja.";
  if (tajuk.trim().length > 60) return "Nama projek terlalu panjang.";
  return null;
}

/** "Kuiz Sains Empat" → "kuizsainsempat". Tiada tanda sempang (keputusan pengguna). */
export function cadangSubdomain(tajuk: string): string {
  return perkataan(tajuk).join("").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "").slice(0, 30);
}

export function semakSubdomain(s: string): string | null {
  if (!s) return "Isi alamat laman.";
  if (!/^[a-z0-9]{3,30}$/.test(s)) return "Guna huruf kecil dan nombor sahaja, tanpa jarak atau tanda sempang (3–30 aksara).";
  if (DIKHASKAN.includes(s)) return "Nama ini dikhaskan untuk sistem sekolah. Sila pilih nama lain.";
  if (KASAR.some((k) => s.includes(k))) return "Nama ini tidak sesuai. Sila pilih nama lain.";
  return null;
}

/**
 * Pautan sumber. Cloudflare & laman Canva (`*.canva.site`) diproksi di bawah
 * subdomain sekolah; pautan reka bentuk `canva.com/design/...` dilencongkan
 * kerana halaman itu milik app Canva sendiri.
 */
export function semakPautan(sumber: SumberLaman, pautan: string): string | null {
  let u: URL;
  try { u = new URL(pautan.trim()); } catch { return "Pautan tidak sah. Salin pautan penuh bermula dengan https://"; }
  if (u.protocol !== "https:") return "Pautan mesti bermula dengan https://";
  const h = u.hostname.toLowerCase();
  if (sumber === "cloudflare") {
    if (/\.(workers|pages)\.dev$/.test(h)) return null;
    return "Pautan mesti berakhir dengan .workers.dev atau .pages.dev.";
  }
  if (sumber === "canva") {
    if (/\.canva\.site$/.test(h)) return null;
    if ((h === "www.canva.com" || h === "canva.com") && u.pathname.startsWith("/design/")) return null;
    return "Gunakan pautan laman Canva yang diterbitkan (….canva.site) atau pautan Lihat dari canva.com/design.";
  }
  return "Sumber tidak sah.";
}

/** Sumber yang failnya disimpan dalam baldi (berbanding pautan luar). */
export function sumberFail(s: SumberLaman): boolean {
  return s === "fail" || s === "kod";
}

/** Permulaan bulan semasa waktu Malaysia (pelayan Vercel berjalan pada UTC). */
export function awalBulanMy(kini = new Date()): Date {
  const [t, b] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit" })
    .format(kini).split("-").map(Number);
  return new Date(Date.UTC(t, b - 1, 1) - 8 * 3600_000);
}

/** Laluan fail dalam laman: relatif, tanpa `..`, aksara selamat sahaja. */
export function laluanSah(laluan: string): boolean {
  return laluan.length <= 200
    && !laluan.startsWith("/")
    && !laluan.split("/").some((b) => b === "" || b === "." || b === "..")
    && /^[A-Za-z0-9._\-/ ()]+$/.test(laluan);
}

export interface LamanInteraktif {
  id: string;
  subdomain: string;
  tajuk: string;
  subjek: string;
  jenis: JenisLaman;
  sumber: SumberLaman;
  pautan: string | null;
  saiz: number;
  pemilik_nama: string;
  status: "muat_naik" | "terbit" | "gantung";
  created_at: string;
  updated_at: string;
}
