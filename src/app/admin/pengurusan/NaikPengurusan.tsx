"use client";

import { useState } from "react";
import { huraiMuka, huraiFail, simpanPengurusan, type SeksyenCadangan } from "@/lib/tindakan-pengurusan";
import { JENIS_SEKSYEN, type KodSeksyen } from "@/data/seksyen-pengurusan";
import { sediaMuatan } from "@/data/muatan-pelayar";
import { semakSaiz } from "@/data/had-fail";
import { mukaDariPdf } from "@/lib/muka-pdf";
import { bacaImbasan, failTeksOcr } from "@/data/ocr-pelayar";

/**
 * Muat naik dan semak Buku Pengurusan Tahunan.
 *
 * PDF DIBACA DALAM PELAYAR, bukan di pelayan. Buku sebenar ialah 14.3 MB;
 * sebagai base64 ia menjadi 19.0 MB — melebihi had badan permintaan DAN had
 * saiz fail portal, jadi ia tidak akan pernah sampai. Teks yang ditarik
 * daripadanya pula 0.44 MB. Maka pelayar membaca, pelayan menghurai, dan fail
 * itu sendiri tidak pernah meninggalkan peranti admin.
 *
 * TIADA APA DISIMPAN SEHINGGA ADMIN MENEKAN SIMPAN. Sistem mencadangkan;
 * admin membetulkan jenis seksyen yang tersilap dan membuang yang tidak
 * dikehendaki. Itu sebabnya pemilih jenis di bawah wujud: dalam edisi 2025,
 * dua seksyen dikesan sebagai bentuk yang salah, dan tanpa pemilih itu
 * satu-satunya jalan ialah menunggu kod dikemas kini.
 */

interface Pilihan extends SeksyenCadangan {
  pilih: boolean;
  kodPilih: KodSeksyen;
  awam: boolean;
}

const KEYAKINAN_RENDAH = 30;

export default function NaikPengurusan() {
  const [fasa, setFasa] = useState<"pilih" | "baca" | "semak">("pilih");
  const [kemajuan, setKemajuan] = useState<{ kini: number; jumlah: number } | null>(null);
  const [mesej, setMesej] = useState<{ ok: boolean; teks: string } | null>(null);
  const [seksyen, setSeksyen] = useState<Pilihan[]>([]);
  const [meta, setMeta] = useState<
    { nama: string; muka: number; jenis: string; gambar: number[]; amaran: string[] } | null
  >(null);
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [buka, setBuka] = useState<number | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function proses(borang: HTMLFormElement) {
    const fail = new FormData(borang).get("fail");
    if (!(fail instanceof File) || fail.size === 0) {
      setMesej({ ok: false, teks: "Tiada fail dipilih." });
      return;
    }

    setFasa("baca");
    setMesej(null);
    setSeksyen([]);
    setKemajuan(null);

    try {
      const pdf = /\.pdf$/i.test(fail.name) || fail.type === "application/pdf";
      let hasil;

      if (pdf) {
        // Had saiz TIDAK dikenakan di sini: fail tidak dihantar ke mana-mana,
        // ia dibaca dalam tab ini. Yang dihantar hanyalah teksnya.
        const { getDocumentProxy } = await import("unpdf");
        // Kita menarik TEKS, bukan melukis muka surat. Kerja fon ialah kerja
        // melukis, jadi ia dimatikan — disahkan dalam Chrome sebenar: buku
        // 174 muka dibaca dalam 1.8 saat.
        const dok = await getDocumentProxy(new Uint8Array(await fail.arrayBuffer()), {
          disableFontFace: true, useSystemFonts: false,
        });
        const muka = await mukaDariPdf(dok, (kini, jumlah) => setKemajuan({ kini, jumlah }));
        setKemajuan({ kini: muka.length, jumlah: muka.length });
        hasil = await huraiMuka(muka);
        if (!hasil.ok && muka.every((m) => m.bilItem <= 3)) {
          const teksOcr = await bacaImbasan(fail, (teks) => setMesej({ ok: true, teks }), 100);
          if (!teksOcr) throw new Error("OCR selesai tetapi tiada teks dapat dikenal pasti.");
          hasil = await huraiFail(await sediaMuatan(failTeksOcr(fail, teksOcr)));
        }
      } else {
        const terlalu = semakSaiz(fail);
        if (terlalu) {
          setMesej({ ok: false, teks: terlalu });
          setFasa("pilih");
          return;
        }
        hasil = await huraiFail(await sediaMuatan(fail));
      }

      setMesej({ ok: hasil.ok, teks: hasil.mesej });
      if (!hasil.ok || !hasil.seksyen) { setFasa("pilih"); return; }

      setMeta({
        nama: fail.name,
        muka: hasil.jumlahMuka ?? 0,
        jenis: pdf ? "pdf" : fail.name.split(".").pop()?.toLowerCase() ?? "lain",
        gambar: hasil.mukaGambar ?? [],
        amaran: hasil.amaran ?? [],
      });
      // Tahun dari nama fail kalau ada — "BUKU PENGURUSAN SKTD25" atau "2025".
      const dijumpa = fail.name.match(/20\d{2}/)?.[0];
      if (dijumpa) setTahun(dijumpa);

      setSeksyen(
        hasil.seksyen.map((s) => ({
          ...s,
          // Seksyen kosong tidak ditanda secara lalai — menyimpannya hanya
          // mencipta seksyen tanpa isi yang admin perlu buang kemudian.
          pilih: s.baris.length > 0,
          kodPilih: s.kod,
          awam: false,
        })),
      );
      setFasa("semak");
    } catch (e) {
      setMesej({ ok: false, teks: jelaskanRalat(e) });
      setFasa("pilih");
    }
  }

  async function simpan() {
    if (!meta) return;
    setSibuk(true);
    try {
      const hasil = await simpanPengurusan(
        { tahun: Number(tahun), namaFail: meta.nama, muka: meta.muka, jenisFail: meta.jenis },
        seksyen.filter((s) => s.pilih).map((s) => ({
          kod: s.kodPilih,
          tajuk: s.tajuk,
          muka: `${s.mukaMula}–${s.mukaAkhir}`,
          keyakinan: s.keyakinan,
          paparan: s.awam ? "awam" : "dalaman",
          amaran: s.amaran,
          lajur: s.lajur,
          baris: s.baris,
        })),
      );
      setMesej({ ok: hasil.ok, teks: hasil.mesej });
      if (hasil.ok) { setFasa("pilih"); setSeksyen([]); setMeta(null); }
    } finally {
      setSibuk(false);
    }
  }

  function ubah(i: number, tukar: Partial<Pilihan>) {
    setSeksyen((lama) => lama.map((s, n) => (n === i ? { ...s, ...tukar } : s)));
  }

  const dipilih = seksyen.filter((s) => s.pilih);
  const jumlahBaris = dipilih.reduce((a, s) => a + s.baris.length, 0);

  return (
    <section className="mt-6">
      {fasa !== "semak" && (
        <form
          onSubmit={(e) => { e.preventDefault(); void proses(e.currentTarget); }}
          className="rounded-xl border border-garis bg-white p-5"
        >
          <label className="block text-sm font-semibold text-navy-800" htmlFor="fail">
            Fail Buku Pengurusan
          </label>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            PDF, DOCX, XLSX atau CSV. <b>Saiz PDF tidak menjadi masalah.</b>
          </p>
          <input
            id="fail" name="fail" type="file" required
            accept=".pdf,.docx,.xlsx,.xlsm,.csv"
            className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <button
            type="submit" disabled={fasa === "baca"}
            className="mt-4 rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {fasa === "baca" ? "Membaca…" : "Baca fail"}
          </button>

          {kemajuan && (
            <div className="mt-4">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Membaca muka surat</span>
                <span>{kemajuan.kini} / {kemajuan.jumlah}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-50">
                <div
                  className={`h-full transition-[width] duration-150 ${
                    kemajuan.kini === kemajuan.jumlah ? "bg-[#167a4b]" : "bg-navy-700"
                  }`}
                  style={{ width: `${(kemajuan.kini / kemajuan.jumlah) * 100}%` }}
                />
              </div>
            </div>
          )}
        </form>
      )}

      {mesej && (
        <p
          className={`mt-4 rounded-xl border p-4 text-sm leading-relaxed ${
            mesej.ok
              ? "border-[#bfe3ce] bg-[#eef8f2] text-[#15693f]"
              : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
          }`}
        >
          {mesej.teks}
        </p>
      )}

      {fasa === "semak" && meta && (
        <>
          {meta.amaran.length > 0 && (
            <div className="mt-4 rounded-xl border border-garis bg-white p-4 text-sm leading-relaxed text-slate-700">
              <p className="font-semibold text-navy-800">Apa yang sistem betulkan sendiri</p>
              <ul className="mt-1.5 space-y-1 text-xs">
                {meta.amaran.map((a) => <li key={a}>· {a}</li>)}
              </ul>
            </div>
          )}

          {meta.gambar.length > 0 && (
            <p className="mt-4 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
              <b>{meta.gambar.length} muka surat ialah gambar</b>, bukan teks —
              m.{ringkasJulat(meta.gambar)}. Carta organisasi dan muka yang
              diimbas disimpan sebagai imej dalam fail ini, jadi tiada teks
              untuk dibaca. Isi muka itu perlu dimasukkan sendiri.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-end gap-4 rounded-xl border border-garis bg-white p-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="tahun">
                Tahun edisi
              </label>
              <input
                id="tahun" value={tahun} inputMode="numeric"
                onChange={(e) => setTahun(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1 w-28 rounded-lg border border-garis px-3 py-2 text-sm"
              />
            </div>
            <p className="min-w-0 flex-1 text-sm text-slate-600">
              {meta.nama} · {meta.muka} muka · {dipilih.length} seksyen dipilih ·{" "}
              {jumlahBaris.toLocaleString("ms-MY")} baris
            </p>
            <button
              onClick={() => void simpan()}
              disabled={sibuk || dipilih.length === 0 || tahun.length !== 4}
              className="rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sibuk ? "Menyimpan…" : "Simpan edisi"}
            </button>
          </div>

          <ul className="mt-4 space-y-3">
            {seksyen.map((s, i) => (
              <li
                key={i}
                className={`rounded-xl border bg-white p-4 ${
                  s.pilih ? "border-garis" : "border-dashed border-slate-300 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox" checked={s.pilih} aria-label={`Simpan ${s.tajuk}`}
                    onChange={(e) => ubah(i, { pilih: e.target.checked })}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-800">{s.tajuk}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      m.{s.mukaMula}–{s.mukaAkhir} · {s.baris.length} baris ·{" "}
                      <span className={s.keyakinan < KEYAKINAN_RENDAH ? "font-bold text-[#8f2b2b]" : ""}>
                        keyakinan {s.keyakinan}%
                      </span>
                    </p>
                    {s.suapan && <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{s.suapan}</p>}
                    {s.amaran.map((a) => (
                      <p key={a} className="mt-1.5 text-xs leading-relaxed text-[#8f2b2b]">⚠ {a}</p>
                    ))}

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="text-xs text-slate-600">
                        Jenis{" "}
                        <select
                          value={s.kodPilih}
                          onChange={(e) => ubah(i, { kodPilih: e.target.value as KodSeksyen, awam: false })}
                          className="ml-1 rounded-lg border border-garis px-2 py-1.5 text-xs"
                        >
                          {JENIS_SEKSYEN.map((j) => (
                            <option key={j.kod} value={j.kod}>{j.nama}</option>
                          ))}
                          <option value="lain">Lain-lain</option>
                        </select>
                      </label>

                      {JENIS_SEKSYEN.find((j) => j.kod === s.kodPilih)?.bolehAwam && (
                        <label className="flex items-center gap-1.5 text-xs text-slate-600">
                          <input
                            type="checkbox" checked={s.awam}
                            onChange={(e) => ubah(i, { awam: e.target.checked })}
                            className="h-3.5 w-3.5"
                          />
                          Boleh dipapar di laman awam
                        </label>
                      )}

                      <button
                        type="button"
                        onClick={() => setBuka(buka === i ? null : i)}
                        className="text-xs font-semibold text-navy-700 underline"
                      >
                        {buka === i ? "Tutup" : `Lihat ${Math.min(10, s.baris.length)} baris pertama`}
                      </button>
                    </div>

                    {buka === i && s.baris.length > 0 && (
                      <div className="mt-3 overflow-x-auto rounded-lg border border-garis">
                        <table className="w-full min-w-[32rem] text-xs">
                          {s.lajur.length > 0 && (
                            <thead className="bg-navy-50 text-left">
                              <tr>{s.lajur.map((l, c) => <th key={c} className="px-2 py-1.5 font-semibold">{l}</th>)}</tr>
                            </thead>
                          )}
                          <tbody className="divide-y divide-garis">
                            {s.baris.slice(0, 10).map((b, r) => (
                              <tr key={r}>
                                {b.map((c, n) => <td key={n} className="px-2 py-1.5 align-top">{c}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={() => { setFasa("pilih"); setSeksyen([]); setMeta(null); setMesej(null); }}
            className="mt-4 text-sm text-slate-500 underline"
          >
            Batal dan pilih fail lain
          </button>
        </>
      )}
    </section>
  );
}

/**
 * Terangkan kegagalan membuka fail dalam bahasa yang admin boleh bertindak.
 *
 * "PasswordException" memberitahu admin tiada apa. "PDF ini berkunci kata
 * laluan" memberitahu mereka apa yang perlu dibuat seterusnya.
 */
function jelaskanRalat(e: unknown): string {
  const nama = e instanceof Error ? e.name : "";
  const mesej = e instanceof Error ? e.message : String(e);
  if (/password/i.test(nama) || /password/i.test(mesej)) {
    return "PDF ini berkunci kata laluan. Buka kuncinya dahulu (Fail → Cetak → " +
      "Simpan sebagai PDF tanpa kata laluan), kemudian cuba lagi.";
  }
  if (/InvalidPDF|structure|corrupt/i.test(nama + mesej)) {
    return "Fail ini bukan PDF yang sah, atau sebahagiannya rosak. Cuba buka " +
      "dan simpan semula fail itu, kemudian muat naik versi baharu.";
  }
  return "Fail itu tidak dapat dibuka: " + mesej;
}

/** "1, 8, 14–18, 44" — senarai 33 nombor tidak berguna kepada sesiapa. */
function ringkasJulat(n: number[]): string {
  if (n.length === 0) return "";
  const susun = [...n].sort((a, b) => a - b);
  const bahagian: string[] = [];
  let mula = susun[0];
  let akhir = susun[0];
  for (const x of susun.slice(1)) {
    if (x === akhir + 1) { akhir = x; continue; }
    bahagian.push(mula === akhir ? `${mula}` : `${mula}–${akhir}`);
    mula = akhir = x;
  }
  bahagian.push(mula === akhir ? `${mula}` : `${mula}–${akhir}`);
  return bahagian.join(", ");
}
