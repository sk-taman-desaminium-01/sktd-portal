"use client";

import { useState } from "react";
import Image from "next/image";
import { simpanPentadbir, naikGambarPentadbir } from "@/lib/pentadbir";
import PemotongWajah from "./PemotongWajah";
import { bait, HAD_GAMBAR_BAIT } from "@/lib/kecilkan-gambar";
import type { Pentadbir } from "@/data/sekolah";

/** Huruf awal nama — dipapar bila tiada gambar. Sama logik dengan mockup. */
function hurufAwal(nama: string): string {
  const buang = new Set(["BIN", "BINTI", "BT", "A/L", "A/P", "TN.", "HJ.", "HJH."]);
  const kata = nama.toUpperCase().split(/\s+/).filter((k) => k && !buang.has(k));
  return kata.slice(0, 2).map((k) => k[0]).join("") || "?";
}

export default function PanelPentadbir({ awal }: { awal: Pentadbir[] }) {
  const [senarai, setSenarai] = useState<Pentadbir[]>(awal);
  const [hasil, setHasil] = useState<{ ok: boolean; mesej: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [naik, setNaik] = useState<number | null>(null);
  // Gambar yang menunggu dipotong: indeks pentadbir + fail asal.
  const [potong, setPotong] = useState<{ i: number; fail: File } | null>(null);

  const ubah = (i: number, medan: keyof Pentadbir, nilai: string | null) =>
    setSenarai((s) => s.map((o, j) => (j === i ? { ...o, [medan]: nilai } : o)));

  const alih = (i: number, arah: -1 | 1) =>
    setSenarai((s) => {
      const j = i + arah;
      if (j < 0 || j >= s.length) return s;
      const baharu = [...s];
      [baharu[i], baharu[j]] = [baharu[j], baharu[i]];
      return baharu;
    });

  /**
   * Fail YANG SUDAH DIPOTONG dihantar, bukan fail asal.
   *
   * Dua sebab: potret keluar 400×400 supaya barisan pentadbir sekata di
   * laman awam, dan gambar kamera telefon yang 4–8 MB mengecil kepada
   * puluhan kilobait — jadi ia tidak pernah menghampiri had muat naik.
   */
  async function hantar(i: number, fail: File) {
    setNaik(i);
    const fd = new FormData();
    fd.set("fail", fail);
    const r = await naikGambarPentadbir(fd);
    setNaik(null);
    if (r.ok && r.url) ubah(i, "gambar", r.url);
    else setHasil({ ok: false, mesej: r.mesej });
  }

  async function simpan() {
    setSibuk(true);
    setHasil(await simpanPentadbir(senarai));
    setSibuk(false);
  }

  return (
    <>
      {potong && (
        <PemotongWajah
          fail={potong.fail}
          namaOrang={senarai[potong.i]?.nama || "Pentadbir"}
          onBatal={() => setPotong(null)}
          onSiap={(fail) => {
            const i = potong.i;
            setPotong(null);
            hantar(i, fail);
          }}
        />
      )}

      {hasil && (
        <p
          role="status"
          className={`mt-5 rounded-xl p-4 text-sm leading-relaxed ${
            hasil.ok ? "bg-[#e5f4ec] text-[#14603c]" : "bg-[#fbeaea] text-[#8f2424]"
          }`}
        >
          {hasil.mesej}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {senarai.map((o, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-garis bg-white p-4">
            <div className="shrink-0 text-center">
              {o.gambar ? (
                <Image
                  src={o.gambar}
                  alt=""
                  width={72}
                  height={72}
                  unoptimized
                  className="h-18 w-18 rounded-full object-cover"
                  style={{ width: 72, height: 72 }}
                />
              ) : (
                <span
                  title="Belum ada gambar"
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-navy-100 text-lg font-bold text-navy-700"
                >
                  {hurufAwal(o.nama)}
                </span>
              )}

              <label className="mt-2 block cursor-pointer text-xs font-semibold text-navy-700 underline underline-offset-2">
                {naik === i ? "Memuat naik…" : o.gambar ? "Tukar" : "Muat naik"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="sr-only"
                  disabled={naik !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    // Had di sini ialah 1 GB, bukan had muat naik.
                    // TIADA apa dihantar ke pelayan sebelum dipotong, dan
                    // pemotong mengeluarkan 400x400 — beberapa puluh kilobait.
                    // Menolak gambar 12 MB dari telefon di sini bermakna guru
                    // perlu mengecilkannya sendiri dengan alat luar dahulu.
                    if (f.size > HAD_GAMBAR_BAIT) {
                      setHasil({ ok: false, mesej: `Gambar ini ${bait(f.size)} — had 1 GB.` });
                      return;
                    }
                    // Buka pemotong dahulu — tiada apa dimuat naik sehingga
                    // pengguna melihat dan menerima potongannya.
                    setPotong({ i, fail: f });
                  }}
                />
              </label>
              {o.gambar && (
                <button
                  type="button"
                  onClick={() => ubah(i, "gambar", null)}
                  className="mt-1 block w-full text-xs text-slate-500 hover:text-[#8f2424]"
                >
                  Buang gambar
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Jawatan
                <input
                  value={o.jawatan}
                  onChange={(e) => ubah(i, "jawatan", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"
                />
              </label>
              <label className="mt-2 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Nama
                <input
                  value={o.nama}
                  onChange={(e) => ubah(i, "nama", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"
                />
              </label>

              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => alih(i, -1)} disabled={i === 0}
                  aria-label={`Naikkan ${o.nama}`}
                  className="rounded border border-garis px-2 py-1 text-xs disabled:opacity-40">↑</button>
                <button type="button" onClick={() => alih(i, 1)} disabled={i === senarai.length - 1}
                  aria-label={`Turunkan ${o.nama}`}
                  className="rounded border border-garis px-2 py-1 text-xs disabled:opacity-40">↓</button>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => setSenarai((s) => s.filter((_, j) => j !== i))}
                  className="rounded border border-garis px-2 py-1 text-xs text-slate-500 hover:border-[#c78b8b] hover:text-[#8f2424]"
                >
                  Buang
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            setSenarai((s) => [...s, { urutan: s.length + 1, jawatan: "", nama: "", gambar: null }])
          }
          className="rounded-lg border border-garis px-4 py-2.5 text-sm font-semibold text-navy-700 hover:border-navy-700"
        >
          + Tambah pentadbir
        </button>
        <button
          type="button"
          onClick={simpan}
          disabled={sibuk}
          className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
        >
          {sibuk ? "Menyimpan…" : "Simpan semua"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Urutan kad di atas ialah urutan yang dipapar di laman awam. Menyimpan
        juga mencetuskan binaan semula laman awam — perubahan muncul dalam 1–2 minit.
      </p>
    </>
  );
}
