"use client";

import { useState } from "react";
import { bacaJadualPukal, bacaJadualPukalBanyak, type HasilPukal } from "@/lib/baca-jadual";
import { simpanJadualBanyak } from "@/lib/jadual";
import { sediaMuatan, normalkanFail } from "@/data/muatan-pelayar";
import { semakSaiz } from "@/data/had-fail";
import { bacaImbasanJadual, failOcrJadual, pdfTanpaTeks } from "@/data/ocr-pelayar";
import { HARI, NAMA_HARI, type KelasJadual, type Waktu } from "@/data/jadual-jenis";
import { namaSubjek } from "@/data/subjek";

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
  /** Kunci stabil — satu zip boleh mengandungi nama fail yang berulang. */
  kunci: string;
}

export default function PukalJadual() {
  const [baris, setBaris] = useState<Baris[]>([]);
  /**
   * Kad mana yang terbuka.
   *
   * Keputusan pengguna: satu lajur kad, tetingkapnya buka-tutup, dan
   * jadual kelas itu dipapar DI DALAMNYA sebelum disahkan. 57 grid yang
   * terbuka serentak ialah 3,000 sel — pentadbir menatal melepasi kelas
   * yang mereka cari dan tidak menemuinya lagi.
   */
  const [buka, setBuka] = useState<Set<string>>(new Set());
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
      const { bukaZip } = await import("@/data/buka-zip");
      const isi = bukaZip(new Uint8Array(await f.arrayBuffer()));
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
          keputusan.push({
            nama, kelas: null, ok: false, mesej: terlalu, pilih: false, kunci: `${nama}-${i}`,
          });
          setBaris([...keputusan]);
          continue;
        }
        try {
          const f = await normalkanFail(fail);
          const imbasan = f.type.startsWith("image/") || (/\.pdf$/i.test(f.name) && await pdfTanpaTeks(f));
          // SATU FAIL BOLEH MENGANDUNGI BANYAK KELAS.
          //
          // Pentadbir sekolah tidak menerima 57 fail — mereka menerima satu
          // PDF dengan semua kelas, dicetak oleh perisian jadual waktu, satu
          // kelas satu muka. `bacaJadualPukalBanyak` membaca setiap muka
          // berasingan dan memulangkan satu baris bagi setiap satu. Untuk
          // fail satu-kelas ia memulangkan tepat satu baris, jadi laluan lama
          // tidak berubah.
          let r = imbasan ? null : await bacaJadualPukalBanyak(await sediaMuatan(f));
          const pertama = r?.[0];
          if (!r || (r.length === 1 && pertama && (/\.pdf$/i.test(f.name) || f.type.startsWith("image/")) && !pertama.ok && /imbasan|gambar|teks/i.test(pertama.mesej))) {
            const hasil = await bacaImbasanJadual(f, (teks) =>
              setHasil({ ok: true, mesej: `${nama}: ${teks}` }),
            );
            if (!hasil.teks.trim() && hasil.item.length === 0) throw new Error("OCR selesai tetapi tiada teks dapat dikenal pasti.");
            r = [await bacaJadualPukal(await sediaMuatan(failOcrJadual(f, hasil)))];
          }
          r.forEach((satu, n) => {
            keputusan.push({ ...satu, pilih: satu.ok, kunci: `${nama}-${i}-${n}` });
          });
        } catch (e) {
          keputusan.push({
            nama, kelas: null, ok: false, pilih: false, kunci: `${nama}-${i}`,
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
        Tiga cara, semuanya berfungsi: <b>satu PDF yang mengandungi semua
        kelas</b> (satu kelas satu muka surat), <b>banyak fail sekaligus</b>,
        atau satu fail <b>.zip</b>. Sistem mengesan kelas dari isi setiap muka,
        membacanya satu demi satu, dan menunjukkan hasilnya untuk anda semak
        sebelum apa-apa disimpan. Muka tanpa nama kelas dilangkau.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); proses(e.currentTarget); }}
        className="mt-3 flex flex-wrap items-center gap-3"
      >
        <input
          type="file" name="fail" multiple required
          accept=".pdf,.docx,.xlsx,.xlsm,.csv,.zip,application/pdf,application/octet-stream,image/png,image/jpeg,image/webp"
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

          {/* SATU LAJUR KAD. Setiap kad satu kelas; tekan untuk melihat
              jadualnya sebelum ia disahkan. */}
          <ul className="mt-2 space-y-2">
            {baris.map((b, i) => (
              <li
                key={b.kunci}
                className={`rounded-xl border ${
                  b.ok ? "border-garis bg-white" : "border-[#e9c4c4] bg-[#fdf7f7]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                  <input
                    type="checkbox"
                    checked={b.pilih}
                    disabled={!b.ok}
                    onChange={(e) =>
                      setBaris((s) =>
                        s.map((x, j) => (j === i ? { ...x, pilih: e.target.checked } : x)),
                      )
                    }
                    aria-label={`Simpan ${b.kelas ?? b.nama}`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setBuka((s) => {
                        const n = new Set(s);
                        if (n.has(b.kunci)) n.delete(b.kunci);
                        else n.add(b.kunci);
                        return n;
                      })
                    }
                    disabled={!b.draf || !b.waktu?.length}
                    aria-expanded={buka.has(b.kunci)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
                  >
                    <span className="w-5 shrink-0 text-xs text-slate-500">
                      {b.draf && b.waktu?.length ? (buka.has(b.kunci) ? "▾" : "▸") : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-navy-800">
                        {b.kelas ?? "Kelas tidak dikesan"}
                        {b.keyakinan && (
                          <span className="ml-2 font-semibold text-slate-500">
                            {b.keyakinan.dikenal}/{b.keyakinan.jumlah} slot
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                        {b.nama}
                      </span>
                      <span
                        className={`mt-0.5 block text-xs ${
                          b.ok ? "text-slate-600" : "text-[#8f2424]"
                        }`}
                      >
                        {b.mesej}
                      </span>
                    </span>
                  </button>
                </div>

                {buka.has(b.kunci) && b.draf && b.waktu && (
                  <div className="border-t border-garis px-3 pb-3 pt-2">
                    <GridDraf draf={b.draf} waktu={b.waktu} />
                  </div>
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

/**
 * Pratonton draf satu kelas: waktu menegak, hari melintang.
 *
 * Bentuknya sama seperti jadual harian yang guru sudah biasa membaca —
 * bukan senarai slot. Slot yang tersasar kelihatan serta-merta dalam grid
 * (satu subjek pada hari yang salah menonjol), dan tidak pernah kelihatan
 * dalam ayat "44 slot dibaca".
 *
 * Waktu REHAT dikelabukan supaya bilangan baris sepadan dengan jadual
 * bercetak; membuangnya bermakna waktu ke-6 di skrin bukan waktu ke-6 di
 * dinding bilik guru.
 */
function GridDraf({ draf, waktu }: { draf: KelasJadual; waktu: Waktu[] }) {
  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-garis bg-white">
      <table className="w-full min-w-[30rem] border-collapse text-left text-[11px]">
        <thead className="sticky top-0 bg-navy-50">
          <tr>
            <th className="px-2 py-1.5 font-semibold text-slate-500">Waktu</th>
            {HARI.map((h) => (
              <th key={h} className="px-2 py-1.5 font-semibold text-navy-800">
                {NAMA_HARI[h]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-garis">
          {waktu.map((w) => (
            <tr key={w.id} className={w.rehat ? "bg-slate-50" : undefined}>
              <td className="whitespace-nowrap px-2 py-1 font-mono text-slate-500">
                {w.mula}–{w.tamat}
              </td>
              {HARI.map((h) => {
                const slot = draf.hari[h]?.[w.id];
                return (
                  <td key={h} className="px-2 py-1">
                    {w.rehat ? (
                      <span className="text-slate-500">{w.label ?? "Rehat"}</span>
                    ) : slot?.subjek ? (
                      <span className="font-semibold text-navy-800">
                        {namaSubjek(slot.subjek)}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
