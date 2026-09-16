"use client";

import { useState } from "react";
import { naikMedia, buangMedia, type Media } from "@/lib/media";
import { semakSaiz } from "@/data/had-fail";
import {
  kecilkanGambar, bolehDikecilkan, ceritaKecil, bait, HAD_GAMBAR_BAIT,
} from "@/lib/kecilkan-gambar";

function saizPapar(b: number | null) {
  if (!b) return "—";
  return b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

const GAMBAR = /\.(png|jpe?g|webp|avif)$/i;

export default function PanelMedia({ awal }: { awal: Media[] }) {
  const [media, setMedia] = useState(awal);
  const [hasil, setHasil] = useState<{ ok: boolean; mesej: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [disalin, setDisalin] = useState<string | null>(null);
  const [nota, setNota] = useState<string | null>(null);

  async function naik(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const borang = e.currentTarget;
    const fd = new FormData(borang);

    // GAMBAR DIKECILKAN DALAM PELAYAR DAHULU.
    //
    // Had 10 MB dikenakan pada apa yang DIHANTAR, bukan pada apa yang
    // dipilih. Telefon menghasilkan gambar 8–15 MB dan kamera sekolah lebih
    // besar lagi; menolaknya bermakna guru perlu mengecilkannya sendiri
    // dengan alat luar sebelum boleh memuat naik. Sebaliknya pelayar
    // mengecilkannya di sini, dan yang menyeberang rangkaian ialah
    // kira-kira 200–400 KB.
    const fail = fd.get("fail");
    if (fail instanceof File && fail.size > 0) {
      if (bolehDikecilkan(fail)) {
        if (fail.size > HAD_GAMBAR_BAIT) {
          setHasil({ ok: false, mesej: `Gambar ini ${bait(fail.size)} — had 1 GB.` });
          return;
        }
        setSibuk(true);
        setHasil({ ok: true, mesej: "Mengecilkan gambar…" });
        const kecil = await kecilkanGambar(fail);
        setSibuk(false);
        if (kecil.kekalAsal) {
          const ralat = semakSaiz(kecil.fail);
          if (ralat) { setHasil({ ok: false, mesej: ralat }); return; }
        }
        fd.set("fail", kecil.fail, kecil.fail.name);
        setNota(ceritaKecil(kecil));
      } else {
        const ralat = semakSaiz(fail);
        if (ralat) { setHasil({ ok: false, mesej: ralat }); return; }
      }
    }

    setSibuk(true);
    const r = await naikMedia(fd);
    setSibuk(false);
    setHasil(r.ok && nota ? { ok: true, mesej: `${r.mesej} ${nota}` } : r);
    if (r.ok) {
      borang.reset();
      // Muat semula senarai dari pelayan supaya id dan cap masa betul.
      location.reload();
    }
  }

  async function buang(m: Media) {
    setSibuk(true);
    const r = await buangMedia(m.id, m.url);
    setSibuk(false);
    setHasil(r);
    if (r.ok) setMedia((s) => s.filter((x) => x.id !== m.id));
  }

  async function salin(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setDisalin(url);
      window.setTimeout(() => setDisalin(null), 1800);
    } catch {
      setHasil({ ok: false, mesej: "Pelayar tidak benarkan salin automatik. Tekan lama pada URL untuk salin." });
    }
  }

  return (
    <>
      <form onSubmit={naik} className="mt-6 rounded-xl border border-garis bg-white p-5">
        <h2 className="text-base font-bold text-navy-800">Muat naik fail</h2>

        <label className="mt-3 block text-sm font-semibold text-slate-700">
          Fail
          <input
            type="file" name="fail" required
            accept="image/png,image/jpeg,image/webp,image/avif,application/pdf"
            className="mt-1 block w-full rounded-lg border border-garis px-3 py-2.5 text-sm font-normal"
          />
        </label>

        <label className="mt-3 block text-sm font-semibold text-slate-700">
          Rujukan kebenaran <span className="font-normal text-slate-500">(jika ada orang dalam gambar)</span>
          <input
            type="text" name="kebenaran"
            placeholder="cth: Surat Akuan Ibu Bapa 2026 — fail pejabat"
            className="mt-1 block w-full rounded-lg border border-garis px-3 py-2.5 text-sm font-normal"
          />
        </label>

        <button
          type="submit" disabled={sibuk}
          className="mt-4 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
        >
          {sibuk ? "Memuat naik…" : "Muat naik"}
        </button>
        <p className="mt-2 text-xs text-slate-500">PNG, JPEG, WebP, AVIF atau PDF. Had 10 MB.</p>
      </form>

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

      {media.length === 0 ? (
        <p className="mt-6 rounded-xl border border-garis bg-white p-6 text-center text-sm text-slate-500">
          Pustaka masih kosong.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {media.map((m) => (
            <li key={m.id} className="flex gap-3 rounded-xl border border-garis bg-white p-3">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy-50">
                {GAMBAR.test(m.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-navy-700">PDF</span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy-800">
                  {m.nama_fail ?? "(tanpa nama)"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {saizPapar(m.saiz)} · {new Date(m.created_at).toLocaleDateString("ms-MY")}
                </p>
                {m.kebenaran && (
                  <p className="mt-1 text-xs leading-snug text-[#7a5a12]">🔏 {m.kebenaran}</p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button" onClick={() => salin(m.url)}
                    className="rounded border border-garis px-2 py-1 text-xs font-semibold text-navy-700 hover:border-navy-700"
                  >
                    {disalin === m.url ? "Disalin ✓" : "Salin URL"}
                  </button>
                  <a
                    href={m.url} target="_blank" rel="noreferrer"
                    className="rounded border border-garis px-2 py-1 text-xs text-slate-600 hover:border-navy-700"
                  >
                    Buka ↗
                  </a>
                  <button
                    type="button" onClick={() => buang(m)} disabled={sibuk}
                    className="rounded border border-garis px-2 py-1 text-xs text-slate-500 hover:border-[#c78b8b] hover:text-[#8f2424] disabled:opacity-50"
                  >
                    Buang
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
