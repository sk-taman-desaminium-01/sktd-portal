"use client";

import { useEffect, useMemo, useState } from "react";
import PilihCari from "@/components/PilihCari";
import {
  tempahTindakan, batalTindakan, simpanBilikTindakan, padamBilikTindakan,
  type PapanBilik,
} from "@/lib/tindakan-bilik";
import { ikutHari, keMinit, keJam, semakTempahan, type Tempahan } from "@/data/bilik";

/**
 * Tempahan Bilik Khas.
 *
 * Papan kenyataan di bilik guru menyelesaikan masalah ini selama bertahun —
 * sehingga dua orang menulis pada baris yang sama, atau seseorang memadam
 * tempahan orang lain untuk menulis tempahannya sendiri. Skrin ini
 * menggantikan papan itu dan tidak cuba melakukan apa-apa lagi.
 */
export default function PanelBilik({ papan }: { papan: PapanBilik }) {
  const [tempahan, setTempahan] = useState(papan.tempahan);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const [bilikId, setBilikId] = useState(papan.bilik[0]?.id ?? "");
  const [tarikh, setTarikh] = useState(papan.hariIni);
  const [mula, setMula] = useState("08:00");
  const [tamat, setTamat] = useState("09:00");
  const [tujuan, setTujuan] = useState("");

  const namaBilik = useMemo(
    () => new Map(papan.bilik.map((b) => [b.id, b.nama])),
    [papan.bilik],
  );

  /**
   * Semakan yang sama seperti pelayan, dijalankan semasa menaip.
   *
   * Ia bukan pengganti semakan pelayan — ia menjawab lebih awal. Guru yang
   * mengetahui bilik itu penuh SEBELUM menekan Tempah menukar waktu dalam
   * tiga saat; guru yang mengetahuinya selepas menekan menganggap sistem
   * itu rosak.
   */
  const bentrok = useMemo(() => {
    if (!bilikId) return null;
    const sama = tempahan.filter((t) => t.bilik_id === bilikId && t.tarikh === tarikh);
    const s = semakTempahan({ tarikh, mula, tamat }, sama, papan.hariIni);
    return s.ok ? null : s;
  }, [bilikId, tarikh, mula, tamat, tempahan, papan.hariIni]);

  async function tempah() {
    setSibuk(true);
    setNota(null);
    try {
      const r = await tempahTindakan({ bilik_id: bilikId, tarikh, mula, tamat, tujuan });
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        // Baris sementara supaya papan bergerak serta-merta. Ia digantikan
        // oleh data sebenar pada muat semula seterusnya.
        setTempahan((l) => [
          ...l,
          {
            id: `baharu-${Date.now()}`, bilik_id: bilikId, tarikh, mula, tamat,
            tujuan: tujuan.trim(), oleh: papan.sayaEmel, nama: "Anda",
            dibatalkan: false, dicipta: new Date().toISOString(),
          },
        ]);
        setTujuan("");
      }
    } finally {
      setSibuk(false);
    }
  }

  async function batal(t: Tempahan) {
    setSibuk(true);
    try {
      const r = await batalTindakan(t.id);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) setTempahan((l) => l.filter((x) => x.id !== t.id));
    } finally {
      setSibuk(false);
    }
  }

  const hari = ikutHari(tempahan, papan.hariIni);

  return (
    <>
      {nota && (
        <p
          className={`mt-5 rounded-xl border p-3 text-sm leading-relaxed ${
            nota.ok
              ? "border-[#c6e2d1] bg-[#eef8f2] text-[#167a4b]"
              : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
          }`}
        >
          {nota.teks}
        </p>
      )}

      {papan.bilik.length === 0 ? (
        <p className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
          <b>Belum ada bilik.</b>{" "}
          {papan.bolehUrus
            ? "Tambah bilik di bawah sebelum sesiapa boleh menempah."
            : "Pentadbir perlu menambah senarai bilik dahulu."}
        </p>
      ) : (
        <section className="mt-5 rounded-2xl border border-garis bg-white p-4 sm:p-5">
          <h2 className="text-base font-bold text-navy-800">Tempah bilik</h2>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <PilihCari
              id="bilik"
              label="Bilik"
              pilihan={papan.bilik.filter((b) => b.aktif).map((b) => ({
                nilai: b.id,
                label: b.nama,
                nota: [b.muatan ? `${b.muatan} orang` : "", b.nota ?? ""]
                  .filter(Boolean).join(" · "),
              }))}
              nilai={bilikId}
              tukar={setBilikId}
              placeholder="Cari bilik…"
            />

            <label>
              <span className="block text-xs font-semibold text-slate-500">Tarikh</span>
              <input
                type="date" value={tarikh} min={papan.hariIni}
                onChange={(e) => setTarikh(e.target.value)}
                className="mt-1 w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm text-navy-800"
              />
            </label>

            <label>
              <span className="block text-xs font-semibold text-slate-500">Mula</span>
              <input
                type="time" value={mula} step={300}
                onChange={(e) => {
                  setMula(e.target.value);
                  // Waktu tamat mengikut ke hadapan supaya julat sentiasa
                  // sah. Julat songsang ialah ralat yang paling kerap, dan
                  // ia tidak perlu wujud langsung.
                  const m = keMinit(e.target.value);
                  const t = keMinit(tamat);
                  if (m !== null && (t === null || t <= m)) setTamat(keJam(Math.min(m + 60, 22 * 60)));
                }}
                className="mt-1 w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm text-navy-800"
              />
            </label>

            <label>
              <span className="block text-xs font-semibold text-slate-500">Tamat</span>
              <input
                type="time" value={tamat} step={300}
                onChange={(e) => setTamat(e.target.value)}
                className="mt-1 w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm text-navy-800"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="block text-xs font-semibold text-slate-500">Tujuan</span>
              <input
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                placeholder="Mesyuarat Panitia Matematik"
                className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Guru lain membaca ini sebelum bertanya sama ada bilik boleh dikongsi.
              </span>
            </label>
          </div>

          {bentrok && (
            <p className="mt-3 rounded-lg border border-[#e9d9ae] bg-[#fdf9f0] p-2.5 text-xs leading-relaxed text-[#7a5a12]">
              {bentrok.sebab}
            </p>
          )}

          <button
            onClick={() => void tempah()}
            disabled={sibuk || !!bentrok || tujuan.trim().length < 3}
            className="mt-3 rounded-lg bg-navy-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {sibuk ? "…" : "Tempah"}
          </button>
        </section>
      )}

      {/* ------------------------------------------------------ papan --- */}

      <h2 className="mt-8 text-base font-bold text-navy-800">
        Tempahan · {papan.dari} hingga {papan.hingga}
      </h2>

      {hari.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          Tiada tempahan dalam tempoh ini. Bilik kosong.
        </p>
      ) : (
        hari.map((h) => (
          <section key={h.tarikh} className="mt-4">
            <h3
              className={`text-[11px] font-bold uppercase tracking-widest ${
                h.lalu ? "text-[#2f7d57]" : h.tarikh === papan.hariIni ? "text-[#7a5a12]" : "text-emas"
              }`}
            >
              {h.label}
              {h.tarikh === papan.hariIni && " · hari ini"}
            </h3>

            <ul className="mt-1.5 space-y-1.5">
              {h.tempahan.map((t) => {
                const milikSaya = t.oleh === papan.sayaEmel && t.oleh !== "";
                return (
                  <li
                    key={t.id}
                    className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border p-2.5 text-sm ${
                      // Hijau = telah berlalu, seperti di kad Takwim.
                      h.lalu ? "border-[#cfe9db] bg-[#f2faf5]" : "border-garis bg-white"
                    }`}
                  >
                    <span className={`shrink-0 font-mono text-xs ${h.lalu ? "text-[#167a4b]" : "text-navy-800"}`}>
                      {t.mula}–{t.tamat}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-navy-800">
                        {namaBilik.get(t.bilik_id) ?? "Bilik"}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {t.tujuan} · {t.nama}
                        {milikSaya && <span className="ml-1 text-navy-700">(anda)</span>}
                      </span>
                    </span>
                    {(milikSaya || papan.bolehUrus) && !h.lalu && (
                      <button
                        onClick={() => void batal(t)}
                        disabled={sibuk}
                        className="shrink-0 text-xs text-[#8f2b2b] underline disabled:opacity-50"
                      >
                        Batal
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {papan.bolehUrus && <UrusBilik bilik={papan.bilik} />}
    </>
  );
}

/**
 * Senarai bilik — hanya pentadbir.
 *
 * Setiap bilik boleh disunting dan dibuang. Tindakan itu duduk di sebalik
 * menu tiga titik dan bukan sebagai butang berderet: satu baris bilik pada
 * telefon hanya selebar ibu jari, dan dua butang di hujungnya memicit nama
 * bilik sehingga terpotong. Menu membuka ke bawah dan boleh ditutup di
 * mana-mana.
 */
function UrusBilik({ bilik }: { bilik: PapanBilik["bilik"] }) {
  const [mesej, setMesej] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [buka, setBuka] = useState(bilik.length === 0);
  const [senarai, setSenarai] = useState(bilik);

  /** Bilik yang sedang disunting; "baharu" bermakna borang tambah. */
  const [sunting, setSunting] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [muatan, setMuatan] = useState("");
  const [nota, setNota] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [sahPadam, setSahPadam] = useState<string | null>(null);

  useEffect(() => setSenarai(bilik), [bilik]);

  useEffect(() => {
    if (!menu) return;
    const tutup = () => setMenu(null);
    document.addEventListener("pointerdown", tutup);
    return () => document.removeEventListener("pointerdown", tutup);
  }, [menu]);

  function mulaTambah() {
    setSunting("baharu");
    setNama(""); setMuatan(""); setNota("");
    setMesej(null);
  }

  function mulaSunting(b: PapanBilik["bilik"][number]) {
    setSunting(b.id);
    setNama(b.nama);
    setMuatan(b.muatan === null ? "" : String(b.muatan));
    setNota(b.nota ?? "");
    setMenu(null);
    setMesej(null);
  }

  async function simpan() {
    setSibuk(true);
    try {
      const id = sunting === "baharu" ? undefined : sunting ?? undefined;
      const asal = senarai.find((x) => x.id === id);
      const r = await simpanBilikTindakan({
        id, nama, muatan, nota, aktif: asal?.aktif ?? true,
      });
      setMesej({ ok: r.ok, teks: r.mesej });
      if (!r.ok) return;
      const bersih = {
        nama: nama.trim(),
        muatan: muatan.trim() === "" ? null : Number(muatan),
        nota: nota.trim() || null,
      };
      setSenarai((l) =>
        id
          ? l.map((x) => (x.id === id ? { ...x, ...bersih } : x))
          : [...l, { id: `baharu-${Date.now()}`, aktif: true, ...bersih }],
      );
      setSunting(null);
    } finally {
      setSibuk(false);
    }
  }

  async function padam(id: string) {
    setSibuk(true);
    try {
      const r = await padamBilikTindakan(id);
      setMesej({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        // "Dinyahaktif" bermakna baris itu masih ada — ia cuma tidak boleh
        // ditempah lagi. Memadamnya dari skrin akan berbohong.
        setSenarai((l) =>
          r.mesej.includes("DISEMBUNYIKAN")
            ? l.map((x) => (x.id === id ? { ...x, aktif: false } : x))
            : l.filter((x) => x.id !== id),
        );
      }
      setSahPadam(null);
      setMenu(null);
    } finally {
      setSibuk(false);
    }
  }

  async function togolAktif(b: PapanBilik["bilik"][number]) {
    setSibuk(true);
    setMenu(null);
    try {
      const r = await simpanBilikTindakan({
        id: b.id, nama: b.nama,
        muatan: b.muatan === null ? "" : String(b.muatan),
        nota: b.nota ?? "", aktif: !b.aktif,
      });
      setMesej({ ok: r.ok, teks: r.ok ? (b.aktif ? "Bilik disembunyikan." : "Bilik boleh ditempah semula.") : r.mesej });
      if (r.ok) setSenarai((l) => l.map((x) => (x.id === b.id ? { ...x, aktif: !b.aktif } : x)));
    } finally {
      setSibuk(false);
    }
  }

  const borang = (
    <div className="mt-3 rounded-lg border border-navy-700/30 bg-navy-50/40 p-3">
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <input
          value={nama} onChange={(e) => setNama(e.target.value)}
          placeholder="Nama bilik — contoh: Bilik i-Shabariah"
          aria-label="Nama bilik"
          className="min-w-0 rounded-lg border border-garis px-3 py-2 text-sm"
        />
        <input
          value={muatan} onChange={(e) => setMuatan(e.target.value)}
          placeholder="Muatan" inputMode="numeric" aria-label="Muatan"
          className="min-w-0 rounded-lg border border-garis px-3 py-2 text-sm"
        />
        <input
          value={nota} onChange={(e) => setNota(e.target.value)}
          placeholder="Nota — contoh: ada projektor" aria-label="Nota"
          className="min-w-0 rounded-lg border border-garis px-3 py-2 text-sm sm:col-span-2"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void simpan()}
          disabled={sibuk || nama.trim().length < 2}
          className="rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          {sibuk ? "…" : sunting === "baharu" ? "Tambah bilik" : "Simpan"}
        </button>
        <button onClick={() => setSunting(null)} className="text-xs text-slate-500 underline">
          Batal
        </button>
      </div>
    </div>
  );

  return (
    <section className="mt-8 rounded-2xl border border-garis bg-white p-4 sm:p-5">
      <button
        onClick={() => setBuka((b) => !b)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-bold text-navy-800">
          Senarai bilik ({senarai.length})
        </span>
        <span className="text-xs text-slate-400">{buka ? "▴" : "▾"}</span>
      </button>

      {buka && (
        <div className="mt-3 border-t border-garis pt-3">
          {mesej && (
            <p
              className={`mb-2 rounded-lg border p-2.5 text-xs leading-relaxed ${
                mesej.ok
                  ? "border-[#c6e2d1] bg-[#eef8f2] text-[#167a4b]"
                  : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
              }`}
            >
              {mesej.teks}
            </p>
          )}

          {sunting === "baharu" ? borang : (
            <button
              onClick={mulaTambah}
              className="rounded-lg border border-navy-700 px-4 py-2 text-xs font-semibold text-navy-700"
            >
              + Tambah bilik
            </button>
          )}

          {senarai.length > 0 && (
            <ul className="mt-3 divide-y divide-garis border-t border-garis">
              {senarai.map((b) => (
                <li key={b.id} className="py-2">
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${b.aktif ? "text-navy-800" : "text-slate-400 line-through"}`}>
                        {b.nama}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {[
                          b.muatan ? `${b.muatan} orang` : "",
                          b.nota ?? "",
                          b.aktif ? "" : "tidak boleh ditempah",
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </span>

                    {/* Menu tiga titik. `shrink-0` supaya ia tidak pernah
                        dipicit keluar dari kad pada skrin sempit. */}
                    <span className="relative shrink-0">
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setMenu((m) => (m === b.id ? null : b.id))}
                        aria-label={`Tindakan untuk ${b.nama}`}
                        aria-haspopup="menu"
                        aria-expanded={menu === b.id}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-garis text-slate-500 hover:border-navy-700 hover:text-navy-700"
                      >
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="currentColor">
                          <circle cx="8" cy="3" r="1.4" />
                          <circle cx="8" cy="8" r="1.4" />
                          <circle cx="8" cy="13" r="1.4" />
                        </svg>
                      </button>

                      {menu === b.id && (
                        <span
                          role="menu"
                          onPointerDown={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full z-20 mt-1 flex w-44 flex-col overflow-hidden rounded-xl border border-garis bg-white py-1 shadow-lg"
                        >
                          <button
                            role="menuitem"
                            onClick={() => mulaSunting(b)}
                            className="px-3 py-2 text-left text-xs text-navy-800 hover:bg-navy-50"
                          >
                            Sunting
                          </button>
                          <button
                            role="menuitem"
                            onClick={() => void togolAktif(b)}
                            className="px-3 py-2 text-left text-xs text-navy-800 hover:bg-navy-50"
                          >
                            {b.aktif ? "Sembunyikan" : "Benarkan tempahan"}
                          </button>
                          <button
                            role="menuitem"
                            onClick={() => { setSahPadam(b.id); setMenu(null); }}
                            className="px-3 py-2 text-left text-xs text-[#8f2b2b] hover:bg-[#fdf1f1]"
                          >
                            Padam
                          </button>
                        </span>
                      )}
                    </span>
                  </div>

                  {sahPadam === b.id && (
                    <p className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[#fdf1f1] p-2.5 text-xs text-[#8f2b2b]">
                      <span className="min-w-0 flex-1">
                        Padam <b>{b.nama}</b>? Kalau ia pernah ditempah, ia akan
                        disembunyikan dan bukan dipadam — rekod tempahan lamanya kekal.
                      </span>
                      <button
                        onClick={() => void padam(b.id)}
                        disabled={sibuk}
                        className="shrink-0 rounded-lg bg-[#8f2b2b] px-3 py-1.5 font-bold text-white disabled:opacity-50"
                      >
                        Ya, padam
                      </button>
                      <button onClick={() => setSahPadam(null)} className="shrink-0 underline">
                        Batal
                      </button>
                    </p>
                  )}

                  {sunting === b.id && borang}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
