"use client";

import { useState } from "react";
import { bacaJadualPukal, type HasilPukal } from "@/lib/baca-jadual";
import { simpanJadualBanyak } from "@/lib/jadual";
import { failKeMuatan } from "@/data/fail-base64";
import { semakSaiz } from "@/data/had-fail";

/**
 * Muat naik jadual SEMUA kelas sekaligus. Pentadbir dan admin sahaja.
 *
 * TIGA KEPUTUSAN YANG MENJADIKANNYA TIDAK ROSAK:
 *
 * 1. ZIP dibuka DALAM PELAYAR. Menghantar zip 20 MB ke pelayan bermakna satu
 *    permintaan besar yang melepasi had badan, dan satu kegagalan
 *    menjatuhkan semuanya.
 * 2. Fail dihantar SATU DEMI SATU. 57 kelas x 300 KB ialah kira-kira 17 MB,
 *    dan base64 menjadikannya 23 MB — jauh melebihi had. Satu demi satu
 *    mengekalkan setiap permintaan kecil dan memberi kemajuan yang kelihatan.
 * 3. Satu fail rosak TIDAK menghentikan yang lain. Setiap fail dilaporkan
 *    sendiri; pentadbir nampak mana yang menjadi dan mana yang tidak.
 *
 * Tiada apa disimpan sehingga pentadbir menekan Simpan — dan simpanan itu
 * SATU tulisan untuk semua kelas, bukan satu tulisan setiap kelas.
 */

interface Baris extends HasilPukal {
  pilih: boolean;
}

export default function PukalJadual() {
  const [baris, setBaris] = useState<Baris[]>([]);
  const [kemajuan, setKemajuan] = useState<{ kini: number; jumlah: number } | null>(null);
  const [hasil, setHasil] = useState<{ ok: boolean; mesej: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);

  /** Buka zip dalam pelayar; fail lain dilalukan seadanya. */
  async function kembangkan(fail: File[]): Promise<{ nama: string; bait: Uint8Array }[]> {
    const keluar: { nama: string; bait: Uint8Array }[] = [];
    for (const f of fail) {
      if (!/\.zip$/i.test(f.name)) {
        keluar.push({ nama: f.name, bait: new Uint8Array(await f.arrayBuffer()) });
        continue;
      }
      const { unzipSync } = await import("fflate");
      const isi = unzipSync(new Uint8Array(await f.arrayBuffer()));
      for (const [nama, bait] of Object.entries(isi)) {
        // Folder dan fail sistem macOS (__MACOSX) dilangkau.
        if (nama.endsWith("/") || nama.includes("__MACOSX") || nama.startsWith(".")) continue;
        if (bait.length === 0) continue;
        keluar.push({ nama: nama.split("/").pop() || nama, bait });
      }
    }
    return keluar;
  }

  async function proses(borang: HTMLFormElement) {
    const fd = new FormData(borang);
    const dipilih = fd.getAll("fail").filter((f): f is File => f instanceof File && f.size > 0);
    if (dipilih.length === 0) {
      setHasil({ ok: false, mesej: "Tiada fail dipilih." });
      return;
    }

    setSibuk(true);
    setHasil(null);
    setBaris([]);

    try {
      const senarai = await kembangkan(dipilih);
      if (senarai.length === 0) {
        setHasil({ ok: false, mesej: "Tiada fail yang boleh dibaca dalam pilihan itu." });
        return;
      }

      const keputusan: Baris[] = [];
      for (let i = 0; i < senarai.length; i++) {
        setKemajuan({ kini: i + 1, jumlah: senarai.length });
        const { nama, bait } = senarai[i];
        // `bait.slice()` memberi salinan dengan bufernya sendiri — Uint8Array
        // dari unzip boleh menjadi paparan ke dalam buffer yang lebih besar.
        const fail = new File([bait.slice().buffer as ArrayBuffer], nama);
        const terlalu = semakSaiz(fail);
        if (terlalu) {
          keputusan.push({ nama, kelas: null, ok: false, mesej: terlalu, pilih: false });
          setBaris([...keputusan]);
          continue;
        }
        try {
          const r = await bacaJadualPukal(await failKeMuatan(fail));
          keputusan.push({ ...r, pilih: r.ok });
        } catch (e) {
          keputusan.push({
            nama, kelas: null, ok: false, pilih: false,
            mesej: e instanceof Error ? e.message : "Gagal dibaca.",
          });
        }
        setBaris([...keputusan]);
      }
    } finally {
      setKemajuan(null);
      setSibuk(false);
      borang.reset();
    }
  }

  async function simpan() {
    const masukan = baris
      .filter((b) => b.pilih && b.ok && b.kelas && b.draf)
      .map((b) => ({ kelas: b.kelas!, data: b.draf! }));
    if (masukan.length === 0) {
      setHasil({ ok: false, mesej: "Tiada jadual dipilih untuk disimpan." });
      return;
    }
    setSibuk(true);
    try {
      setHasil(await simpanJadualBanyak(masukan));
    } catch (e) {
      setHasil({ ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." });
    } finally {
      setSibuk(false);
    }
  }

  const berjaya = baris.filter((b) => b.ok).length;
  const dipilihKira = baris.filter((b) => b.pilih && b.ok).length;

  return (
    <section className="mt-5 rounded-xl border-2 border-navy-100 bg-white p-4">
      <h2 className="text-base font-bold text-navy-800">Muat naik pukal</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Pilih <b>banyak fail sekaligus</b>, atau satu fail <b>.zip</b> yang
        mengandungi semuanya. Sistem mengesan kelas setiap fail dari isinya,
        membacanya satu demi satu, dan menunjukkan hasilnya untuk anda semak
        sebelum apa-apa disimpan.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); proses(e.currentTarget); }}
        className="mt-3 flex flex-wrap items-center gap-3"
      >
        <input
          type="file" name="fail" multiple required
          accept=".pdf,.docx,.xlsx,.xlsm,.csv,.zip"
          className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-2.5 text-sm"
        />
        <button
          type="submit" disabled={sibuk}
          className="rounded-lg border border-navy-800 px-4 py-2.5 text-sm font-semibold text-navy-800 disabled:opacity-60"
        >
          {sibuk ? "Membaca…" : "Baca semua"}
        </button>
      </form>

      {/* Bar kemajuan: fail dibaca satu demi satu, jadi pentadbir perlu
          nampak ia BERGERAK. Tanpa ini, memproses 57 fail kelihatan seperti
          skrin yang tergantung. */}
      {kemajuan && (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-600">
              Membaca fail {kemajuan.kini} daripada {kemajuan.jumlah}…
            </span>
            <span className="font-semibold tabular-nums text-navy-800">
              {Math.round((kemajuan.kini / kemajuan.jumlah) * 100)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-100">
            <div
              className="h-full rounded-full bg-navy-800 transition-[width] duration-200"
              style={{ width: `${(kemajuan.kini / kemajuan.jumlah) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Bar hijau penuh bila selesai — tanda kerja SUDAH habis, bukan
          sekadar bar yang hilang begitu sahaja. */}
      {!kemajuan && baris.length > 0 && !sibuk && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-[#167a4b]">Selesai membaca</span>
            <span className="font-semibold tabular-nums text-[#167a4b]">100%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e5f4ec]">
            <div className="h-full w-full rounded-full bg-[#167a4b]" />
          </div>
        </div>
      )}

      {baris.length > 0 && (
        <>
          <p className="mt-4 text-sm text-slate-600">
            <b>{berjaya} daripada {baris.length}</b> fail berjaya dibaca.
          </p>

          <ul className="mt-2 divide-y divide-garis rounded-xl border border-garis">
            {baris.map((b, i) => (
              <li key={`${b.nama}-${i}`} className="flex flex-wrap items-center gap-3 p-3">
                <input
                  type="checkbox"
                  checked={b.pilih}
                  disabled={!b.ok}
                  onChange={(e) =>
                    setBaris((s) => s.map((x, j) => (j === i ? { ...x, pilih: e.target.checked } : x)))
                  }
                  aria-label={`Simpan ${b.kelas ?? b.nama}`}
                />
                <span className="w-24 shrink-0 font-semibold text-navy-800">
                  {b.kelas ?? "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-slate-500">{b.nama}</span>
                  <span className={`block text-sm ${b.ok ? "text-slate-600" : "text-[#8f2424]"}`}>
                    {b.mesej}
                  </span>
                </span>
                {b.keyakinan && (
                  <span className="shrink-0 text-xs text-slate-500">
                    {b.keyakinan.dikenal}/{b.keyakinan.jumlah}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button" onClick={simpan} disabled={sibuk || dipilihKira === 0}
              className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sibuk ? "Menyimpan…" : `Simpan ${dipilihKira} jadual`}
            </button>
            <span className="text-xs leading-relaxed text-slate-500">
              Hanya baris bertanda disimpan. Nama guru yang sudah ada dikekalkan
              untuk subjek yang fail baharu tidak menyebutnya.
            </span>
          </div>
        </>
      )}

      {hasil && (
        <p
          role="status"
          className={`mt-4 rounded-xl p-4 text-sm leading-relaxed ${
            hasil.ok ? "bg-[#e5f4ec] text-[#14603c]" : "bg-[#fbeaea] text-[#8f2424]"
          }`}
        >
          {hasil.mesej}
        </p>
      )}
    </section>
  );
}
