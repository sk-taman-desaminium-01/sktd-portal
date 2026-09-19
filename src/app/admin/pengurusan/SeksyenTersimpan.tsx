"use client";

import { useState } from "react";
import {
  tukarSeksyenTindakan, padamDokumenTindakan, lihatBaris,
  suntingBarisTindakan, padamBarisTindakan,
} from "@/lib/tindakan-pengurusan";
import type { JenisPindaan } from "@/lib/pindaan";
import { JENIS_SEKSYEN, type KodSeksyen } from "@/data/seksyen-pengurusan";

export interface BarisSeksyen {
  id: string;
  kod: KodSeksyen;
  tajuk: string;
  muka: string | null;
  keyakinan: number | null;
  paparan: "awam" | "dalaman";
  status: "draf" | "disahkan";
  amaran: string | null;
  bilBaris: number;
}

/**
 * Seksyen yang SUDAH disimpan — sahkan, tukar jenis, padam edisi.
 *
 * "Draf" dan "disahkan" bukan hiasan. Hanya seksyen DISAHKAN yang disuapkan
 * ke bahagian lain sistem (guru kelas, panitia, takwim). Seksyen draf duduk
 * dalam pangkalan data tanpa memberi kesan kepada sesiapa, jadi memuat naik
 * buku yang salah tidak pernah merosakkan apa-apa sehingga seseorang membaca
 * dan menekan Sahkan.
 *
 * Setiap baris ada keadaan SIBUKNYA SENDIRI. Satu keadaan sibuk yang dikongsi
 * pernah membekukan seluruh senarai apabila satu tindakan gagal — pepijat itu
 * berlaku dalam skrin Akses dan tidak akan diulang di sini.
 */
export default function SeksyenTersimpan({
  dokumenId, seksyen, namaFail,
}: {
  dokumenId: string;
  seksyen: BarisSeksyen[];
  namaFail: string;
}) {
  const [baris, setBaris] = useState(seksyen);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [ralat, setRalat] = useState<string | null>(null);
  const [dipadam, setDipadam] = useState(false);
  const [sahPadam, setSahPadam] = useState(false);

  /**
   * Baris yang sedang disemak, dan seksyen mana yang PERNAH dibuka.
   *
   * Yang kedua penting: butang "Sahkan" pada seksyen yang belum pernah
   * dilihat dipaparkan sebagai cadangan lembut, bukan tindakan utama.
   * Pengguna melaporkan mereka menekan Sahkan pada data yang mereka tidak
   * pernah lihat — kerana tiada apa pun untuk dilihat. Sekarang ada, dan
   * skrin menggalakkan membacanya dahulu tanpa menghalang sesiapa.
   */
  const [buka, setBuka] = useState<string | null>(null);
  const [isi, setIsi] = useState<Record<string, { baris: BarisIsi[]; mesej: string }>>({});
  const [memuat, setMemuat] = useState<string | null>(null);
  const [dilihat, setDilihat] = useState<Set<string>>(new Set());
  const [cari, setCari] = useState("");

  /**
   * Baris yang sedang disunting, dan draf selnya.
   *
   * Pengguna menyebutnya terus: "edit terus dalam web untuk sesi ini".
   * Muat naik semula seluruh buku kerana satu jawatan tersalah baca ialah
   * sepuluh minit untuk membetulkan tiga perkataan.
   */
  const [sunting, setSunting] = useState<string | null>(null);
  const [draf, setDraf] = useState<string[]>([]);
  /**
   * Jadikan pembetulan ini KEKAL. Lalai: hidup.
   *
   * Dahulu lalainya mati, dan akibatnya senyap: admin membetulkan baris,
   * melihat ia betul, dan buku tahun depan membawa kesilapan yang sama
   * semula. Pembetulan yang tidak berulang ialah yang dikehendaki hampir
   * setiap kali; yang sekali sahaja ialah kes luar biasa, jadi itu yang
   * perlu ditanda, bukan sebaliknya.
   */
  const [kekal, setKekal] = useState(true);
  const [simpan, setSimpan] = useState(false);
  const [nota, setNota] = useState<string | null>(null);

  function mulaSunting(b: BarisIsi) {
    setSunting(b.id);
    setDraf([...b.sel]);
    setKekal(true);
    setNota(null);
  }

  /**
   * SETIAP sel yang berubah menjadi pindaannya sendiri.
   *
   * Versi pertama hanya menerima satu sel, dan menyembunyikan pilihan
   * "kekal" apabila dua sel disunting serentak — jadi pembetulan yang
   * menyentuh jawatan DAN nama tetap perlu diulang tahun depan. Padanan
   * setiap pindaan masih SELURUH SEL, jadi memecahkannya kepada beberapa
   * pindaan tidak melemahkan pagar itu.
   */
  function senaraiBerubah(asal: string[]): { dari: string; kepada: string }[] {
    return asal
      .map((c, i) => ({ dari: c ?? "", kepada: draf[i] ?? "" }))
      .filter((x) => x.dari.trim() !== x.kepada.trim() && x.dari.trim() !== "");
  }

  async function simpanSunting(seksyenId: string, asal: BarisIsi) {
    const beza = senaraiBerubah(asal.sel);
    const tajukSeksyen = baris.find((x) => x.id === seksyenId)?.tajuk ?? "seksyen";
    setSimpan(true);
    setNota(null);
    try {
      const hasil = await suntingBarisTindakan(
        asal.id,
        draf,
        kekal && beza.length > 0
          ? beza.map((x) => ({
              jenis: jenisPindaanUntuk(x.kepada),
              dari: x.dari,
              kepada: x.kepada,
              sebab: `Dibetulkan dalam ${tajukSeksyen}`,
            }))
          : undefined,
      );
      if (!hasil.ok) { setNota(hasil.mesej); return; }
      setIsi((lama) => ({
        ...lama,
        [seksyenId]: {
          ...lama[seksyenId],
          baris: lama[seksyenId].baris.map((r) =>
            r.id === asal.id ? { ...r, sel: draf.map((c) => c.trim()), disunting: true } : r,
          ),
        },
      }));
      setSunting(null);
      setNota(hasil.mesej);
    } finally {
      setSimpan(false);
    }
  }

  /**
   * Padam satu baris — dan, bila `kekal`, ingat bahawa ia dipadam.
   *
   * Baris sampah (ayat pelan strategik yang terbaca sebagai orang, kepala
   * jadual yang menyelit) dicetak SEMULA dalam edisi tahun depan. Tanpa
   * pindaan `buang_baris`, kerja memadamnya bermula dari kosong setiap
   * tahun.
   */
  async function buangBaris(seksyenId: string, id: string, sel: string[]) {
    setSimpan(true);
    try {
      const hasil = await padamBarisTindakan(
        id,
        kekal
          ? {
              sel,
              sebab: `Dipadam dari ${baris.find((x) => x.id === seksyenId)?.tajuk ?? "seksyen"}`,
            }
          : undefined,
      );
      if (!hasil.ok) { setNota(hasil.mesej); return; }
      setIsi((lama) => ({
        ...lama,
        [seksyenId]: {
          ...lama[seksyenId],
          baris: lama[seksyenId].baris.filter((r) => r.id !== id),
        },
      }));
      setBaris((lama) =>
        lama.map((b) => (b.id === seksyenId ? { ...b, bilBaris: Math.max(0, b.bilBaris - 1) } : b)),
      );
      setSunting(null);
      setNota(hasil.mesej);
    } finally {
      setSimpan(false);
    }
  }

  async function togol(id: string) {
    if (buka === id) { setBuka(null); return; }
    setBuka(id);
    setCari("");
    setDilihat((s) => new Set(s).add(id));
    if (isi[id]) return;
    setMemuat(id);
    try {
      const r = await lihatBaris(id);
      if (r.ok && r.baris) {
        setIsi((lama) => ({ ...lama, [id]: { baris: r.baris!, mesej: r.mesej } }));
      } else {
        setRalat(r.mesej);
      }
    } finally {
      setMemuat(null);
    }
  }

  async function ubah(id: string, tukar: Parameters<typeof tukarSeksyenTindakan>[1]) {
    setSibuk(id);
    setRalat(null);
    try {
      const hasil = await tukarSeksyenTindakan(id, tukar);
      if (!hasil.ok) { setRalat(hasil.mesej); return; }
      setBaris((lama) => lama.map((b) => (b.id === id ? { ...b, ...tukar } : b)));
    } catch (e) {
      setRalat(e instanceof Error ? e.message : String(e));
    } finally {
      setSibuk(null);
    }
  }

  async function padam() {
    setSibuk(dokumenId);
    try {
      const hasil = await padamDokumenTindakan(dokumenId);
      if (hasil.ok) setDipadam(true);
      else setRalat(hasil.mesej);
    } finally {
      setSibuk(null);
    }
  }

  if (dipadam) return null;

  const disahkan = baris.filter((b) => b.status === "disahkan").length;

  return (
    <div>
      {nota && (
        <p className="mb-3 rounded-lg border border-[#c6e2d1] bg-[#eef8f2] p-3 text-xs text-[#167a4b]">
          {nota}
        </p>
      )}

      {ralat && (
        <p className="mb-3 rounded-lg border border-[#e9c4c4] bg-[#fdf1f1] p-3 text-xs text-[#8f2b2b]">
          {ralat}
        </p>
      )}

      <ul className="divide-y divide-garis">
        {baris.map((b) => (
          <li key={b.id} className="py-3">
            {/* Susunan MENURUN pada telefon, melintang pada skrin lebar.
                Susunan melintang sahaja memicit tajuk seksyen menjadi lajur
                selebar satu perkataan pada telefon — setiap tajuk menjadi
                enam baris teks bertindan dengan dropdown di sebelahnya. */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-navy-800">{b.tajuk}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {NAMA[b.kod] ?? b.kod} · m.{b.muka ?? "?"} · {b.bilBaris.toLocaleString("ms-MY")} baris
                  {b.paparan === "awam" && " · dipapar awam"}
                </span>
                {b.amaran && <span className="mt-1 block text-xs text-[#8f2b2b]">⚠ {b.amaran}</span>}
              </span>

              <span className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void togol(b.id)}
                  disabled={memuat === b.id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    buka === b.id
                      ? "bg-navy-700 text-white"
                      : "border border-garis text-navy-700 hover:border-navy-700"
                  }`}
                >
                  {memuat === b.id ? "Memuat…" : buka === b.id ? "Tutup" : "Semak isi"}
                </button>

                <select
                  value={b.kod} disabled={sibuk === b.id}
                  onChange={(e) => void ubah(b.id, { kod: e.target.value as KodSeksyen })}
                  className="rounded-lg border border-garis px-2 py-1.5 text-xs"
                  aria-label={`Jenis untuk ${b.tajuk}`}
                >
                  {JENIS_SEKSYEN.map((j) => <option key={j.kod} value={j.kod}>{j.nama}</option>)}
                  <option value="lain">Lain-lain</option>
                </select>

                <button
                  onClick={() => void ubah(b.id, { status: b.status === "disahkan" ? "draf" : "disahkan" })}
                  disabled={sibuk === b.id}
                  title={
                    b.status !== "disahkan" && !dilihat.has(b.id)
                      ? "Semak isinya dahulu — tekan “Semak isi”."
                      : undefined
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                    b.status === "disahkan"
                      ? "bg-[#e5f4ec] text-[#167a4b]"
                      : dilihat.has(b.id)
                        ? "bg-navy-700 text-white"
                        : "border border-garis text-slate-400"
                  }`}
                >
                  {sibuk === b.id ? "…" : b.status === "disahkan" ? "✓ Disahkan" : "Sahkan"}
                </button>
              </span>
            </div>

            {buka === b.id && isi[b.id] && (
              <div className="mt-3 rounded-xl border border-garis bg-navy-50/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={cari}
                    onChange={(e) => setCari(e.target.value)}
                    placeholder="Cari dalam seksyen ini…"
                    aria-label={`Cari dalam ${b.tajuk}`}
                    className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-1.5 text-xs"
                  />
                  <span className="text-xs text-slate-500">{isi[b.id].mesej}</span>
                  <span className="w-full text-[11px] text-slate-400">
                    Klik mana-mana baris untuk membetulkannya. Bacaan asal PDF disimpan.
                  </span>
                </div>

                <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-garis bg-white">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-garis">
                      {tapisBaris(isi[b.id].baris, cari).map((r) =>
                        sunting === r.id ? (
                          <tr key={r.id} className="bg-navy-50/60">
                            <td colSpan={Math.max(1, r.sel.length)} className="px-2 py-2">
                              <div className="flex flex-wrap gap-1.5">
                                {r.sel.map((_, n) => (
                                  <input
                                    key={n}
                                    value={draf[n] ?? ""}
                                    onChange={(e) =>
                                      setDraf((d) => d.map((c, j) => (j === n ? e.target.value : c)))
                                    }
                                    aria-label={`Lajur ${n + 1}`}
                                    className="min-w-0 flex-1 rounded border border-garis px-2 py-1 text-xs"
                                  />
                                ))}
                              </div>

                              {/* Pilihan KEKAL sentiasa kelihatan, dan lalainya
                                  hidup — termasuk sebelum apa-apa disunting,
                                  kerana ia juga mengawal butang Padam di bawah. */}
                              <label className="mt-2 flex items-start gap-2 text-xs text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={kekal}
                                  onChange={(e) => setKekal(e.target.checked)}
                                  className="mt-0.5"
                                />
                                <span>
                                  Jangan ulang tahun depan — kenakan pembetulan ini pada{" "}
                                  <b>muat naik akan datang</b> juga.
                                  {senaraiBerubah(r.sel).length > 0 && (
                                    <span className="mt-0.5 block text-[11px] text-slate-500">
                                      {senaraiBerubah(r.sel)
                                        .map((x) => `“${x.dari}” → “${x.kepada || "(dibuang)"}”`)
                                        .join(" · ")}
                                    </span>
                                  )}
                                  <span className="mt-0.5 block text-[11px] text-slate-400">
                                    Padanan ialah seluruh sel, bukan sebahagian perkataan — nama
                                    khas seperti <i>Bilik i-Shabariah</i> tidak akan tersentuh.
                                    Menekan <i>Padam baris ini</i> dengan kotak ini bertanda
                                    menggugurkan baris yang sama pada setiap edisi seterusnya.
                                  </span>
                                </span>
                              </label>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => void simpanSunting(b.id, r)}
                                  disabled={simpan}
                                  className="rounded-lg bg-navy-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  {simpan ? "…" : "Simpan"}
                                </button>
                                <button
                                  onClick={() => setSunting(null)}
                                  className="text-xs text-slate-500 underline"
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={() => void buangBaris(b.id, r.id, r.sel)}
                                  disabled={simpan}
                                  className="ml-auto text-xs text-[#8f2b2b] underline disabled:opacity-50"
                                >
                                  Padam baris ini
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr
                            key={r.id}
                            onClick={() => mulaSunting(r)}
                            title="Klik untuk membetulkan baris ini"
                            className="cursor-text hover:bg-navy-50/50"
                          >
                            {r.sel.map((c, n) => (
                              <td key={n} className="px-2 py-1.5 align-top text-slate-700">
                                {c}
                                {n === r.sel.length - 1 && r.disunting && (
                                  <span className="ml-1 text-[10px] text-[#167a4b]">· disunting</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ),
                      )}
                      {tapisBaris(isi[b.id].baris, cari).length === 0 && (
                        <tr>
                          <td className="px-3 py-4 text-center text-slate-500">
                            Tiada baris sepadan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-garis pt-3">
        <p className="text-xs leading-relaxed text-slate-500">
          {disahkan} daripada {baris.length} seksyen disahkan. Hanya seksyen
          yang <b>disahkan</b> disuapkan ke bahagian lain portal — carta
          organisasi, takwim, guru kelas.
          <br />
          Tekan <b>Semak isi</b> untuk melihat baris sebenar sebelum mengesahkan.
        </p>
        {sahPadam ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-[#8f2b2b]">Padam {namaFail} dan semua barisnya?</span>
            <button
              onClick={() => void padam()} disabled={sibuk === dokumenId}
              className="rounded-lg bg-[#8f2b2b] px-3 py-1.5 font-bold text-white disabled:opacity-50"
            >
              Ya, padam
            </button>
            <button onClick={() => setSahPadam(false)} className="text-slate-500 underline">Batal</button>
          </span>
        ) : (
          <button onClick={() => setSahPadam(true)} className="text-xs text-slate-400 underline hover:text-[#8f2b2b]">
            Padam edisi ini
          </button>
        )}
      </div>
    </div>
  );
}

export interface BarisIsi {
  id: string;
  sel: string[];
  disunting: boolean;
}

/** Tapis baris mengikut carian — semua lajur, huruf besar diabaikan. */
function tapisBaris(baris: BarisIsi[], cari: string): BarisIsi[] {
  const t = cari.trim().toLowerCase();
  if (!t) return baris;
  return baris.filter((r) => r.sel.some((c) => (c ?? "").toLowerCase().includes(t)));
}

/**
 * Teka jenis pindaan dari teks gantian.
 *
 * Gantian KOSONG bermakna orang itu sudah tiada — baris yang menamakannya
 * digugurkan pada muat naik akan datang. Teks yang mengandungi penanda
 * nasab ialah nama orang; selebihnya ialah jawatan atau tajuk, yang
 * dibetulkan sebagai teks biasa.
 */
function jenisPindaanUntuk(kepada: string): JenisPindaan {
  if (kepada.trim() === "") return "buang_nama";
  return /\b(BIN|BINTI|BT|A\/L|A\/P)\b/i.test(kepada) ? "ganti_nama" : "ganti_teks";
}

const NAMA: Record<string, string> = Object.fromEntries(
  JENIS_SEKSYEN.map((j) => [j.kod, j.nama]),
);
