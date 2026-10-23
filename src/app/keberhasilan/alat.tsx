import type { ReactNode } from "react";
import type { KeadaanPeringkat } from "@/data/keberhasilan";

/** Zon waktu Malaysia — pelayan Vercel berjalan pada UTC (peraturan keras #25). */
const ZON = "Asia/Kuala_Lumpur";

/** "2026-07-14" atau cap masa ISO → "14 Jul 2026" (+ ", 09:30" bila `dgMasa`). */
export function tarikh(v: string | null | undefined, dgMasa = false): string {
  if (!v) return "";
  const d = new Date(v.length <= 10 ? `${v}T00:00:00+08:00` : v);
  if (Number.isNaN(d.getTime())) return v;
  const t = d.toLocaleDateString("ms-MY", { timeZone: ZON, day: "numeric", month: "short", year: "numeric" });
  return dgMasa ? `${t}, ${d.toLocaleTimeString("ms-MY", { timeZone: ZON, hour: "2-digit", minute: "2-digit" })}` : t;
}

/** "NURUL HUDA BINTI AHMAD" → "NURUL HUDA" */
export const namaPendek = (n: string) =>
  String(n ?? "").split(/\s+(?:BIN|BINTI|A\/L|A\/P)\s+/i)[0].split(/\s+/).slice(0, 2).join(" ");

export const inisial = (n: string) =>
  String(n ?? "?").replace(/\b(BIN|BINTI|A\/L|A\/P)\b/gi, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";

export const saizFail = (n: number) =>
  n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

/* ------------------------------------------------------------ gaya ---- */

export const BTN = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-garis bg-white px-3 py-1.5 text-sm font-semibold text-navy-800 hover:border-navy-700 disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_UTAMA = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-navy-700 bg-navy-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_SENYAP = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-semibold text-slate-500 hover:border-garis hover:text-navy-800 disabled:cursor-not-allowed disabled:opacity-40";
export const BTN_BAHAYA = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_BAHAYA_PEKAT = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-red-700 bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50";
/** 16px (text-base) supaya iOS tidak zum masuk bila medan difokus. */
export const INPUT = "w-full min-w-0 rounded-lg border border-garis bg-white px-3 py-2 text-base text-slate-800 outline-none focus:border-navy-700 disabled:bg-slate-50 disabled:text-slate-500";
export const LABEL = "block text-xs font-semibold uppercase tracking-wide text-slate-500";
export const KAD = "rounded-xl border border-garis bg-white shadow-sm";

export type Varian = "" | "ok" | "warn" | "bad" | "info" | "acc" | "emas";
const WARNA: Record<Varian, string> = {
  "": "border-garis bg-slate-50 text-slate-600",
  ok: "border-transparent bg-emerald-50 text-emerald-700",
  warn: "border-transparent bg-amber-50 text-amber-800",
  bad: "border-transparent bg-red-50 text-red-700",
  info: "border-transparent bg-violet-50 text-violet-700",
  acc: "border-transparent bg-navy-100 text-navy-700",
  emas: "border-transparent bg-[#f6edd6] text-emas-gelap",
};

export function Chip({ v = "", bungkus = false, children }: { v?: Varian; bungkus?: boolean; children: ReactNode }) {
  return <span className={`inline-flex items-center ${bungkus ? "max-w-full whitespace-normal break-words" : "whitespace-nowrap"} rounded-full border px-2 py-0.5 text-xs font-semibold ${WARNA[v]}`}>{children}</span>;
}

export const VARIAN_KEADAAN: Record<KeadaanPeringkat, Varian> = {
  kunci: "", draf: "", dihantar: "info", dipulang: "bad", sah1: "ok", sah2: "ok",
};

/** Warna segmen jejak 4-peringkat. */
export const WARNA_JEJAK: Record<KeadaanPeringkat, string> = {
  kunci: "bg-slate-200",
  draf: "bg-slate-400",
  dihantar: "bg-violet-500",
  dipulang: "bg-red-600",
  sah1: "bg-gradient-to-r from-emerald-600 from-50% to-slate-200 to-50%",
  sah2: "bg-emerald-600",
};
