"use client";

import { useState } from "react";
import { bacaMuridPukal, bacaTeksMuridPukal, type HasilPukalMurid } from "@/lib/pukal-murid";
import { importMuridKelas } from "@/lib/import-murid";
import { sediaMuatan } from "@/data/muatan-pelayar";
import { semakSaiz } from "@/data/had-fail";
import { ciptaPembacaImbasan, pdfTanpaTeks, kunciSkrin, type PembacaImbasan } from "@/data/ocr-pelayar";
import PilihCari from "@/components/PilihCari";

/**
 * Muat naik senarai murid SEMUA kelas sekaligus.
 *
 * BENTUKNYA SATU LAJUR KAD, BUKAN JADUAL LEBAR. Keputusan pengguna:
 * "kemaskan muat naik pukal di jadual dan seterusnya di epbd sebab data akan
 * banyak, jadikan 1 kolumn baris kad ikut kelas yang tetingkapnya boleh buka
 * dan tutup senarai nama dan i/c."
 *
 * Sebabnya kukuh. 57 kad × 30 murid ialah 1,700 baris; memaparkan semuanya
 * serentak bermakna pentadbir menatal melepasi kelas yang mereka mahu semak
 * dan tidak pernah menemuinya lagi. Kad tertutup memberi satu baris setiap
 * kelas — dan baris itu membawa nombor yang menjawab soalan sebenar:
 * "berapa murid dalam kelas ini, dan adakah nombornya munasabah?"
 *
 * TIADA APA DITULIS sehingga Simpan ditekan. Setiap kelas ditulis melalui
 * `importMuridKelas` yang sama seperti laluan satu kelas — pukal bukan
 * laluan tulis kedua.
 */
interface Kad extends HasilPukalMurid {
  /** Kunci stabil; nama fail boleh berulang dalam satu zip. */
  kunci: string;
  pilih: boolean;
  semakan?: { ok: boolean; teks: string };
  /** Kelas yang pentadbir tetapkan sendiri, menggantikan yang dikesan. */
  kelasPilih: string;
  /** Hasil simpanan kad ini, selepas Simpan ditekan. */
  simpan?: { ok: boolean; teks: string };
}

export default function PukalMurid({ semuaKelas }: { semuaKelas: string[] }) {
  const [kad, setKad] = useState<Kad[]>([]);
  const [buka, setBuka] = useState<Set<string>>(new Set());
  const [kemajuan, setKemajuan] = useState<{ kini: number; jumlah: number } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);

  /** Buka zip DALAM PELAYAR; fail lain dilalukan seadanya. */
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

  function jenisFail(nama: string): string {
    if (/\.pdf$/i.test(nama)) return "application/pdf";
    if (/\.png$/i.test(nama)) return "image/png";
    if (/\.jpe?g$/i.test(nama)) return "image/jpeg";
    if (/\.webp$/i.test(nama)) return "image/webp";
    if (/\.txt$/i.test(nama)) return "text/plain";
    return "";
  }

  async function proses(borang: HTMLFormElement) {
    const fd = new FormData(borang);
    const dipilih = fd.getAll("fail").filter((f): f is File => f instanceof File && f.size > 0);
    if (dipilih.length === 0) {
      setNota({ ok: false, teks: "Tiada fail dipilih." });
      return;
    }

    setSibuk(true);
    setNota(null);
    setKad([]);
    setBuka(new Set());

    let pembacaOcr: PembacaImbasan | null = null;
    const lepasSkrin = await kunciSkrin();
    try {
      const senarai = await kembangkan(dipilih);
      if (senarai.length === 0) {
        setNota({ ok: false, teks: "Tiada fail yang boleh dibaca dalam pilihan itu." });
        return;
      }

      const keputusan: Kad[] = [];
      for (let i = 0; i < senarai.length; i++) {
        setKemajuan({ kini: i + 1, jumlah: senarai.length });
        const { nama, bait } = senarai[i];
        // `bait.slice()` memberi salinan dengan bufernya sendiri — Uint8Array
        // dari unzip boleh menjadi paparan ke dalam buffer yang lebih besar.
        const fail = new File([bait.slice().buffer as ArrayBuffer], nama, { type: jenisFail(nama) });
        const kunci = `${nama}-${i}`;
        const terlalu = semakSaiz(fail);
        if (terlalu) {
          keputusan.push({
            kunci, nama, kelas: null, ok: false, mesej: terlalu, pilih: false, kelasPilih: "",
          });
          setKad([...keputusan]);
          continue;
        }
        try {
          // Imbasan (gambar, atau PDF tanpa lapisan teks) terus ke OCR peranti —
          // tiada muat naik fail. Hanya fail berteks dihantar ke pelayan.
          const imbasan = fail.type.startsWith("image/") ||
            (/\.pdf$/i.test(fail.name) && await pdfTanpaTeks(fail));
          let r = imbasan
            ? { nama, kelas: null, ok: false, mesej: "Tiada No. KP — imbasan" } as Awaited<ReturnType<typeof bacaMuridPukal>>
            : await bacaMuridPukal(await sediaMuatan(fail));
          if ((/\.pdf$/i.test(fail.name) || fail.type.startsWith("image/")) && !r.ok && /Tiada No\. KP|imbasan|gambar/i.test(r.mesej)) {
            pembacaOcr ??= await ciptaPembacaImbasan();
            const teksOcr = await pembacaOcr.baca(fail, (teks) =>
              setNota({ ok: true, teks: `${nama}: ${teks}` }),
            );
            if (!teksOcr) throw new Error("OCR selesai tetapi tiada teks dapat dikenal pasti.");
            // Hantar TEKS kecil terus. Laluan lama membungkusnya sebagai
            // `.ocr.txt`, tetapi pembaca fail tidak mengenali TXT lalu
            // setiap PDF dalam ZIP dilaporkan gagal selepas OCR 100%.
            r = await bacaTeksMuridPukal(fail.name, teksOcr);
          }
          keputusan.push({
            ...r, kunci, pilih: false, kelasPilih: r.kelas ?? "",
          });
        } catch (e) {
          keputusan.push({
            kunci, nama, kelas: null, ok: false, pilih: false, kelasPilih: "",
            mesej: e instanceof Error ? `${e.name}: ${e.message}` : "Gagal dibaca.",
          });
        }
        setKad([...keputusan]);
      }
    } catch (e) {
      setNota({ ok: false, teks: e instanceof Error ? e.message : "Proses gagal. Cuba semula." });
    } finally {
      await pembacaOcr?.tutup();
      lepasSkrin();
      setKemajuan(null);
      setSibuk(false);
      borang.reset();
    }
  }

  /**
   * Simpan kelas demi kelas, dan LAPORKAN setiap satu.
   *
   * Satu kelas yang gagal tidak menghentikan yang lain (peraturan keras
   * #10: kerja pukal mesti melangkau baris rosak, bukan abort). Kad yang
   * berjaya ditanda hijau, yang gagal kekal di tempatnya dengan sebabnya —
   * jadi pentadbir boleh menekan Simpan sekali lagi untuk yang tinggal
   * tanpa memuat naik semuanya semula.
   */
  async function simpanSemua(simpan = false) {
    const sasaran = kad.filter((k) => k.pilih && k.ok && k.kelasPilih && k.teks && !k.simpan?.ok);
    if (sasaran.length === 0) {
      setNota({ ok: false, teks: "Tiada kelas bertanda untuk disimpan." });
      return;
    }
    if (bertindih.length || konflikKp.length) {
      setNota({ ok: false, teks: "Selesaikan kelas atau No. KP bertindih dahulu." }); return;
    }
    if (simpan && sasaran.some((k) => !k.semakan?.ok)) {
      setNota({ ok: false, teks: "Jalankan semakan dahulu sebelum menyimpan." }); return;
    }
    setSibuk(true);
    setNota(null);
    let berjaya = 0;
    let gagal = 0;
    try {
      for (let i = 0; i < sasaran.length; i++) {
        const k = sasaran[i];
        setKemajuan({ kini: i + 1, jumlah: sasaran.length });
        const [tahunStr, ...sisa] = k.kelasPilih.split(" ");
        const tahun = Number(tahunStr);
        if (!tahun || sisa.length === 0) {
          tandakan(k.kunci, { ok: false, teks: "Kelas tidak sah." });
          gagal++;
          continue;
        }
        try {
          const r = await importMuridKelas(tahun, sisa.join(" "), k.teks!, simpan);
          if (simpan) tandakan(k.kunci, { ok: r.ok, teks: r.mesej });
          else setKad((lama) => lama.map((x) => x.kunci === k.kunci ? { ...x, semakan: { ok: r.ok, teks: r.mesej } } : x));
          if (r.ok) berjaya++;
          else gagal++;
        } catch (e) {
          tandakan(k.kunci, {
            ok: false,
            teks: e instanceof Error ? `${e.name}: ${e.message}` : "Gagal disimpan.",
          });
          gagal++;
        }
      }
      setNota({
        ok: gagal === 0,
        teks:
          `${berjaya} kelas ${simpan ? "disimpan" : "disemak tanpa menyimpan"}` +
          (gagal > 0 ? `, ${gagal} GAGAL — sebabnya pada kad masing-masing.` : "."),
      });
    } catch (e) {
      setNota({ ok: false, teks: e instanceof Error ? e.message : "Proses gagal. Cuba semula." });
    } finally {
      setKemajuan(null);
      setSibuk(false);
    }
  }

  function tandakan(kunci: string, simpan: { ok: boolean; teks: string }) {
    setKad((l) => l.map((x) => (x.kunci === kunci ? { ...x, simpan } : x)));
  }

  function togol(kunci: string) {
    setBuka((s) => {
      const b = new Set(s);
      if (b.has(kunci)) b.delete(kunci);
      else b.add(kunci);
      return b;
    });
  }

  const berjaya = kad.filter((k) => k.ok).length;
  const dipilih = kad.filter((k) => k.pilih && k.ok && k.kelasPilih);
  const jumlahMurid = dipilih.reduce((a, k) => a + (k.murid?.length ?? 0), 0);

  /**
   * DUA FAIL, SATU KELAS — ini hampir selalu kesilapan.
   *
   * Ia berlaku bila satu zip mengandungi senarai lama dan senarai baharu
   * kelas yang sama. Kedua-duanya akan ditulis, yang kedua menindih yang
   * pertama, dan tiada siapa tahu versi mana yang menang. Jadi ia
   * diberitahu sebelum apa-apa ditulis.
   */
  const bertindih = (() => {
    const kira = new Map<string, number>();
    for (const k of kad) {
      if (!k.pilih || !k.ok || !k.kelasPilih) continue;
      kira.set(k.kelasPilih, (kira.get(k.kelasPilih) ?? 0) + 1);
    }
    return [...kira.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  })();

  const konflikKp = (() => {
    const lihat = new Map<string, string>(); const konflik = new Set<string>();
    for (const k of kad.filter((x) => x.pilih)) for (const m of k.murid ?? []) {
      if (!m.no_kp) continue;
      const dahulu = lihat.get(m.no_kp);
      if (dahulu && dahulu !== k.kunci) konflik.add(m.no_kp);
      lihat.set(m.no_kp, k.kunci);
    }
    return [...konflik];
  })();

  return (
    <section className="mt-5 rounded-xl border-2 border-navy-100 bg-white p-4">
      <h3 className="text-base font-bold text-navy-800">Muat naik pukal — semua kelas</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Pilih <b>banyak fail sekaligus</b>, atau satu fail <b>.zip</b> yang
        mengandungi semuanya. Sistem mengesan kelas setiap fail dari isinya,
        membacanya satu demi satu, dan menunjukkan senarai nama untuk anda semak
        sebelum apa-apa disimpan.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); void proses(e.currentTarget); }}
        className="mt-3 flex flex-wrap items-center gap-3"
      >
        <input
          type="file" name="fail" multiple required
          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.zip,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-2.5 text-sm"
        />
        <button
          type="submit" disabled={sibuk}
          className="rounded-lg border border-navy-800 px-4 py-2.5 text-sm font-semibold text-navy-800 disabled:opacity-60"
        >
          {sibuk ? "Membaca…" : "Baca semua"}
        </button>
      </form>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        PDF berteks dibaca terus. PDF imbasan dan gambar menjalankan OCR automatik
        dalam portal, termasuk fail yang mengiring atau terbalik. Satu enjin OCR
        digunakan semula untuk seluruh ZIP supaya lebih pantas pada telefon.
      </p>

      {/* Bar kemajuan: tanpa ini, memproses 57 fail kelihatan seperti skrin
          yang tergantung. */}
      {kemajuan && (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-600">
              {kemajuan.kini} daripada {kemajuan.jumlah}…
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
          <p className="mt-1.5 text-xs text-slate-500">
            Biarkan halaman ini terbuka sehingga selesai. Fail imbasan dibaca di peranti ini
            (±10–40 saat setiap fail); bertukar app atau mengunci telefon akan menghentikannya.
          </p>
        </div>
      )}

      {nota && (
        <p
          role="status"
          className={`mt-4 rounded-xl p-3 text-sm leading-relaxed ${
            nota.ok ? "bg-[#e5f4ec] text-[#14603c]" : "bg-[#fbeaea] text-[#8f2424]"
          }`}
        >
          {nota.teks}
        </p>
      )}

      {kad.length > 0 && (
        <>
          <p className="mt-4 text-sm text-slate-600">
            <b>{berjaya} daripada {kad.length}</b> fail berjaya dibaca ·{" "}
            {dipilih.length} kelas bertanda · {jumlahMurid.toLocaleString("ms-MY")} murid
          </p>

          {konflikKp.length > 0 && <p role="alert">{konflikKp.length} No. KP muncul dalam lebih satu fail. Buang tanda pada fail yang salah.</p>}
          {bertindih.length > 0 && (
            <p className="mt-2 rounded-lg border border-[#e9d9ae] bg-[#fdf9f0] p-3 text-xs leading-relaxed text-[#7a5a12]">
              ⚠ <b>{bertindih.join(", ")}</b> ditanda lebih sekali. Fail kedua akan
              menindih yang pertama — buang tanda pada salah satu supaya anda tahu
              versi mana yang disimpan.
            </p>
          )}

          {/* SATU LAJUR KAD. Setiap kad satu kelas; tetingkapnya buka-tutup. */}
          <ul className="mt-3 space-y-2">
            {kad.map((k) => (
              <li
                key={k.kunci}
                className={`rounded-xl border ${
                  k.simpan?.ok
                    ? "border-[#bfe3ce] bg-[#f4fbf7]"
                    : k.simpan && !k.simpan.ok
                      ? "border-[#e9c4c4] bg-[#fdf7f7]"
                      : k.ok
                        ? "border-garis bg-white"
                        : "border-[#e9c4c4] bg-[#fdf7f7]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                  <input
                    type="checkbox"
                    checked={k.pilih}
                    disabled={sibuk || !k.ok || k.simpan?.ok}
                    onChange={(e) =>
                      setKad((l) =>
                        l.map((x) => (x.kunci === k.kunci ? { ...x, pilih: e.target.checked } : x)),
                      )
                    }
                    aria-label={`Simpan ${k.kelasPilih || k.nama}`}
                  />

                  <button
                    type="button"
                    onClick={() => togol(k.kunci)}
                    disabled={!k.murid?.length}
                    aria-expanded={buka.has(k.kunci)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
                  >
                    <span className="w-5 shrink-0 text-xs text-slate-400">
                      {k.murid?.length ? (buka.has(k.kunci) ? "▾" : "▸") : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-navy-800">
                        {k.kelasPilih || k.kelas || "Kelas tidak dikesan"}
                        {k.murid?.length ? (
                          <span className="ml-2 font-semibold text-slate-500">
                            {k.murid.length} murid
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                        {k.nama}
                        {k.cara ? ` · dibaca sebagai “${k.cara}”` : ""}
                      </span>
                      <span
                        className={`mt-0.5 block text-xs leading-relaxed ${
                          k.ok ? "text-slate-600" : "text-[#8f2424]"
                        }`}
                      >
                        {k.mesej}
                      </span>
                      {k.semakan && <span className="block text-xs text-navy-800">{k.semakan.teks}</span>}
                      {k.simpan && (
                        <span
                          className={`mt-1 block text-xs font-semibold ${
                            k.simpan.ok ? "text-[#167a4b]" : "text-[#8f2424]"
                          }`}
                        >
                          {k.simpan.ok ? "✓ " : "✗ "}
                          {k.simpan.teks}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Kelas boleh DIBETULKAN di sini. Fail yang tidak menyebut
                      kelasnya tidak perlu dimuat naik semula seorang diri —
                      itu keseluruhan sebab pukal wujud. */}
                  {k.ok && !k.simpan?.ok && !sibuk && (
                    <span className="w-full sm:w-52">
                      <PilihCari
                        id={`kelas-${k.kunci}`}
                        label="Betulkan kelas"
                        pilihan={semuaKelas.map((x) => ({ nilai: x, label: x }))}
                        nilai={k.kelasPilih}
                        tukar={(v) =>
                          setKad((l) =>
                            l.map((x) =>
                              x.kunci === k.kunci ? { ...x, kelasPilih: v, pilih: true, semakan: undefined } : x,
                            ),
                          )
                        }
                        placeholder="Pilih kelas…"
                      />
                    </span>
                  )}
                </div>

                {buka.has(k.kunci) && k.murid && k.murid.length > 0 && (
                  <div className="border-t border-garis px-3 pb-3 pt-2">
                    <div className="max-h-80 overflow-auto rounded-lg border border-garis bg-white">
                      <table className="w-full min-w-[22rem] text-left text-xs">
                        <thead className="sticky top-0 bg-navy-50">
                          <tr>
                            <th className="px-2 py-1.5 font-semibold">#</th>
                            <th className="px-2 py-1.5 font-semibold">Nama</th>
                            <th className="px-2 py-1.5 font-semibold">No. KP</th>
                            <th className="px-2 py-1.5 font-semibold">J</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-garis">
                          {k.murid.map((m, i) => (
                            <tr key={i} className={m.amaran.length ? "bg-[#fffdf5]" : undefined}>
                              <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                              <td className="px-2 py-1 font-medium text-navy-800">{m.nama}</td>
                              <td className="px-2 py-1 font-mono text-slate-600">
                                {m.no_kp ?? "—"}
                              </td>
                              <td className="px-2 py-1">{m.jantina ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {k.amaran && k.amaran.length > 0 && (
                      <ul className="mt-2 space-y-0.5 rounded-lg border border-[#e9d9ae] bg-[#fdf9f0] p-2 text-[11px] leading-relaxed text-[#7a5a12]">
                        {k.amaran.slice(0, 8).map((a, i) => <li key={i}>⚠ {a}</li>)}
                        {k.amaran.length > 8 && <li>… {k.amaran.length - 8} lagi</li>}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" disabled={sibuk || !dipilih.length || bertindih.length > 0 || konflikKp.length > 0}
              onClick={() => void simpanSemua(false)} className="rounded-lg border px-4 py-2.5 text-sm disabled:opacity-50">Semak kelas terpilih</button>
            <button
              type="button"
              onClick={() => void simpanSemua(true)}
              disabled={sibuk || bertindih.length > 0 || konflikKp.length > 0 || dipilih.some((k) => !k.simpan?.ok && !k.semakan?.ok) || dipilih.filter((k) => !k.simpan?.ok).length === 0}
              className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sibuk
                ? "Menyimpan…"
                : `Simpan ${dipilih.filter((k) => !k.simpan?.ok).length} kelas`}
            </button>
            <span className="text-xs leading-relaxed text-slate-500">
              Hanya kad bertanda disimpan. Murid dipadankan mengikut <b>No. KP</b>,
              dan murid tanpa No. KP perlu disemak berasingan sebelum import.
            </span>
          </div>
        </>
      )}
    </section>
  );
}
