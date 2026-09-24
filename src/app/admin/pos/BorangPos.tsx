"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { simpanPos, padamPos, type HasilSimpan, type PosCms, type Keutamaan } from "@/lib/cms";
import { naikMedia } from "@/lib/media";
import {
  kecilkanGambar, bolehDikecilkan, ceritaKecil, bait, HAD_GAMBAR_BAIT,
} from "@/lib/kecilkan-gambar";
import { pautGambar } from "@/data/pautan-gambar";

type Jenis = "pengumuman" | "aktiviti";

/**
 * Borang pos — gaya "apa yang berlaku" macam media sosial (permintaan L).
 *
 * Isi kandungan + gambar terus di depan. Tajuk/Jenis/Keutamaan hanya
 * ditanya dalam POP UP apabila menekan "Hantar" — kerana itulah tiga
 * perkara yang perlu diputuskan sebelum sesuatu sampai kepada ibu bapa.
 * "Draf" (kelabu) simpan terus tanpa pop up, untuk tulis separuh jalan
 * dan sambung kemudian.
 */
export default function BorangPos({
  draf, pos,
}: {
  draf: Pick<PosCms, "id" | "tajuk" | "updated_at">[];
  pos: (PosCms & { kandungan: string | null }) | null;
}) {
  const router = useRouter();
  const [hasil, setHasil] = useState<HasilSimpan | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [gambar, setGambar] = useState<string>(pos?.gambar_utama ?? "");
  const [naik, setNaik] = useState<string | null>(null);
  const [kandungan, setKandungan] = useState(pos?.kandungan ?? "");
  const [senaraiDrafBuka, setSenaraiDrafBuka] = useState(false);

  const [popup, setPopup] = useState(false);
  const [tajuk, setTajuk] = useState(pos?.tajuk ?? "");
  const [jenis, setJenis] = useState<Jenis>(pos?.jenis ?? "pengumuman");
  const [keutamaan, setKeutamaan] = useState<Keutamaan>(pos?.keutamaan ?? "biasa");

  async function pilihGambar(fail: File) {
    if (!bolehDikecilkan(fail)) { setNaik("Fail itu bukan gambar."); return; }
    try {
      if (fail.size > HAD_GAMBAR_BAIT) { setNaik(`Gambar ini ${bait(fail.size)} — had 1 GB.`); return; }
      setNaik("Mengecilkan…");
      const kecil = await kecilkanGambar(fail);
      setNaik("Memuat naik…");
      const fd = new FormData();
      fd.set("fail", kecil.fail, kecil.fail.name);
      const r = await naikMedia(fd);
      if (r.ok && r.url) { setGambar(r.url); setNaik(ceritaKecil(kecil)); }
      else setNaik(r.mesej);
    } catch {
      setNaik("Sambungan terputus atau pelayan tidak menjawab. Cuba lagi.");
    }
  }

  function auto200(): string {
    const rata = kandungan.replace(/\s+/g, " ").trim();
    return rata.length <= 200 ? rata : `${rata.slice(0, 200)}…`;
  }

  async function hantarStatus(status: "draf" | "terbit", tajukAkhir: string) {
    try {
      setSibuk(true);
      const fd = new FormData();
      if (pos?.id) fd.set("id", pos.id);
      fd.set("kandungan", kandungan);
      fd.set("ringkasan", auto200());
      fd.set("gambar_utama", gambar);
      fd.set("tajuk", tajukAkhir);
      fd.set("jenis", jenis);
      fd.set("keutamaan", keutamaan);
      fd.set("status", status);
      const r = await simpanPos(fd);
      setHasil(r);
      setSibuk(false);
      if (r.ok) {
        setPopup(false);
        router.refresh();
        if (!pos && status === "terbit") {
          // Pos baharu berjaya terbit — bersihkan borang untuk pos seterusnya.
          setKandungan(""); setGambar(""); setTajuk(""); setNaik(null);
        }
      }
    } catch {
      setHasil({ ok: false, mesej: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  function tekanDraf() {
    // Draf tidak perlu tajuk sempurna — ambil dari kandungan sahaja supaya
    // menulis boleh disambung kemudian tanpa disekat oleh medan wajib.
    const auto = tajuk.trim() || kandungan.trim().slice(0, 60) || "(draf tanpa tajuk)";
    void hantarStatus("draf", auto);
  }

  async function padam() {
    if (!pos || !window.confirm(`Padam pos “${pos.tajuk}”?`)) return;
    try {
      setSibuk(true);
      const r = await padamPos(pos.id);
      setHasil(r);
      setSibuk(false);
      if (r.ok) router.push("/admin/pos");
    } catch {
      setHasil({ ok: false, mesej: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <>
      <section className="mt-6 rounded-2xl border border-garis bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-navy-800">
            {pos ? "Sunting pos" : "Pos baharu"}
          </h2>
          {/* "Draf" DI ATAS — untuk MEMBACA draf sedia ada, bukan menyimpan. */}
          <button
            type="button"
            onClick={() => setSenaraiDrafBuka((b) => !b)}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            Draf ({draf.length})
          </button>
        </div>

        {senaraiDrafBuka && (
          <ul className="mt-3 space-y-1 rounded-lg border border-garis bg-navy-50/40 p-2">
            {draf.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-slate-500">Tiada draf.</li>
            ) : (
              draf.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/admin/pos?id=${d.id}`}
                    className="block truncate rounded px-2 py-1.5 text-xs text-navy-700 hover:bg-white"
                  >
                    {d.tajuk}
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}

        <textarea
          value={kandungan}
          onChange={(e) => setKandungan(e.target.value)}
          rows={6}
          placeholder="Apa yang berlaku di sekolah?"
          className="mt-4 w-full resize-y rounded-lg border border-garis px-3 py-2.5 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Ringkasan pada kad ditulis automatik daripada ayat pertama (maks. 200 aksara).
        </p>

        <div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {gambar && gambar !== "__buang__" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pautGambar(gambar)} alt="" loading="lazy" decoding="async"
                className="h-20 w-28 rounded-lg border border-garis object-cover" />
            )}
            <label className="cursor-pointer rounded-lg border border-navy-700 px-4 py-2 text-sm font-semibold text-navy-700">
              {gambar && gambar !== "__buang__" ? "Tukar gambar" : "Tambah gambar"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void pilihGambar(f);
                }}
              />
            </label>
            {gambar && gambar !== "__buang__" && (
              <button
                type="button"
                onClick={() => { setGambar("__buang__"); setNaik(null); }}
                className="text-xs text-slate-500 underline hover:text-[#8f2424]"
              >
                Buang gambar
              </button>
            )}
          </div>
          {naik && <p className="mt-2 text-xs text-slate-500">{naik}</p>}
        </div>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-garis pt-5">
          <button
            type="button"
            disabled={sibuk || !kandungan.trim()}
            onClick={tekanDraf}
            className="rounded-lg bg-slate-200/70 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"
          >
            Draf
          </button>
          <button
            type="button"
            disabled={sibuk || !kandungan.trim()}
            onClick={() => setPopup(true)}
            className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Hantar
          </button>
          {pos && (
            <button type="button" disabled={sibuk} onClick={() => void padam()} className="ml-auto text-sm font-semibold text-[#8f2424] underline disabled:opacity-50">
              Padam pos
            </button>
          )}
        </div>

        {hasil && (
          <div className={`mt-4 rounded-xl p-4 text-sm ${hasil.ok ? "bg-[#e5f4ec] text-[#167a4b]" : "bg-[#fbeaea] text-[#a32a2a]"}`}>
            <p className="font-semibold">{hasil.mesej}</p>
            {hasil.amaranBina && (
              <p className="mt-2 rounded bg-[#fdf3dc] p-2 text-[#9a6b06]">⚠️ {hasil.amaranBina}</p>
            )}
          </div>
        )}
      </section>

      {popup && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !sibuk && setPopup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-bold text-navy-800">Sebelum dihantar…</h3>
            <p className="mt-1 text-xs text-slate-500">{auto200()}</p>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700">Tajuk</span>
              <input
                autoFocus
                value={tajuk}
                onChange={(e) => setTajuk(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-garis px-3 py-2.5 text-sm"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Jenis</span>
                <select
                  value={jenis}
                  onChange={(e) => setJenis(e.target.value as Jenis)}
                  className="mt-1 w-full rounded-lg border border-garis px-3 py-2.5 text-sm"
                >
                  <option value="pengumuman">Pengumuman</option>
                  <option value="aktiviti">Aktiviti</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Keutamaan</span>
                <select
                  value={keutamaan}
                  onChange={(e) => setKeutamaan(e.target.value as Keutamaan)}
                  className="mt-1 w-full rounded-lg border border-garis px-3 py-2.5 text-sm"
                >
                  <option value="biasa">Biasa</option>
                  <option value="utama">Penting</option>
                  <option value="segera">Segera</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={sibuk}
                onClick={() => setPopup(false)}
                className="rounded-lg border border-garis px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={sibuk || !tajuk.trim()}
                onClick={() => void hantarStatus("terbit", tajuk.trim())}
                className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sibuk ? "Menghantar…" : "Terbit ke laman awam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
