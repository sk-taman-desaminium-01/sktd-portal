"use client";

import { useState } from "react";
import { simpanPos, type HasilSimpan } from "@/lib/cms";

/**
 * Borang pos. Butang Simpan Draf dan Terbit adalah BERASINGAN dan kelihatan
 * berbeza — menerbitkan sesuatu ialah tindakan yang dilihat ibu bapa, jadi ia
 * tidak boleh berlaku kerana tersalah tekan.
 */
export default function BorangPos() {
  const [hasil, setHasil] = useState<HasilSimpan | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function hantar(data: FormData, status: "draf" | "terbit") {
    setSibuk(true);
    data.set("status", status);
    setHasil(await simpanPos(data));
    setSibuk(false);
  }

  return (
    <form className="mt-6 space-y-5">
      <input type="hidden" name="id" />

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Tajuk</span>
        <input name="tajuk" required className="mt-1 w-full rounded-lg border border-garis px-3 py-2.5 text-sm" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Jenis</span>
          <select name="jenis" className="mt-1 w-full rounded-lg border border-garis px-3 py-2.5 text-sm">
            <option value="pengumuman">Pengumuman</option>
            <option value="aktiviti">Aktiviti</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Keutamaan</span>
          <select name="keutamaan" className="mt-1 w-full rounded-lg border border-garis px-3 py-2.5 text-sm">
            <option value="biasa">Biasa</option>
            <option value="utama">Penting</option>
            <option value="segera">Segera — kad merah di laman utama</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Kategori</span>
        <input name="kategori" className="mt-1 w-full rounded-lg border border-garis px-3 py-2.5 text-sm" />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Ringkasan</span>
        <textarea name="ringkasan" rows={2} className="mt-1 w-full rounded-lg border border-garis px-3 py-2.5 text-sm" />
        <span className="mt-1 block text-xs text-slate-500">
          Dipapar dalam senarai dan pada kad. Pendek sahaja.
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Kandungan</span>
        <textarea name="kandungan" rows={10} className="mt-1 w-full rounded-lg border border-garis px-3 py-2.5 text-sm" />
        <span className="mt-1 block text-xs text-slate-500">
          Satu baris kosong antara perenggan.
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Slug</span>
        <input name="slug" placeholder="dijana dari tajuk jika kosong" className="mt-1 w-full rounded-lg border border-garis px-3 py-2.5 text-sm" />
      </label>

      <div className="flex flex-wrap gap-3 border-t border-garis pt-5">
        <button
          type="submit"
          disabled={sibuk}
          formAction={(d) => hantar(d, "draf")}
          className="rounded-lg border border-garis bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 disabled:opacity-50"
        >
          Simpan draf
        </button>
        <button
          type="submit"
          disabled={sibuk}
          formAction={(d) => hantar(d, "terbit")}
          className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Terbit ke laman awam
        </button>
      </div>

      {hasil && (
        <div
          className={`rounded-xl p-4 text-sm ${
            hasil.ok ? "bg-[#e5f4ec] text-[#167a4b]" : "bg-[#fbeaea] text-[#a32a2a]"
          }`}
        >
          <p className="font-semibold">{hasil.mesej}</p>
          {/* Kegagalan hook TIDAK ditelan — tanpa ini admin fikir pos sudah
              naik sedangkan ia tidak. */}
          {hasil.amaranBina && (
            <p className="mt-2 rounded bg-[#fdf3dc] p-2 text-[#9a6b06]">
              ⚠️ {hasil.amaranBina}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
