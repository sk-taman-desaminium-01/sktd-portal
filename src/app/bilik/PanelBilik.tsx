"use client";

import { useEffect, useMemo, useState } from "react";
import PilihCari from "@/components/PilihCari";
import {
  simpanBilikTindakan, padamBilikTindakan,
  tambahTetapTindakan, padamTetapTindakan, petakanSubjekTindakan,
  janaSemulaTindakan, type PapanBilik,
} from "@/lib/tindakan-bilik";
import { sebabTetap } from "@/data/bilik-tetap";
import { HARI, NAMA_HARI } from "@/data/jadual-jenis";
import { SUBJEK } from "@/data/subjek";
import { keMinit, keJam } from "@/data/bilik";
import GridBilik from "./GridBilik";

/**
 * Tempahan Bilik Khas.
 *
 * Papan kenyataan di bilik guru menyelesaikan masalah ini selama bertahun —
 * sehingga dua orang menulis pada baris yang sama, atau seseorang memadam
 * tempahan orang lain untuk menulis tempahannya sendiri. Skrin ini
 * menggantikan papan itu dan tidak cuba melakukan apa-apa lagi.
 */
export default function PanelBilik({ papan, barangIct }: {
  papan: PapanBilik;
  /** Barang ICT yang boleh diminta bersama tempahan. Kosong bila modul belum dipasang. */
  barangIct: { id: string; nama: string; baki: number }[];
}) {
  /**
   * Nota dikongsi dengan bahagian pentadbir (waktu tetap, urus bilik).
   *
   * Tempahan sendiri kini duduk dalam `GridBilik`, yang membawa notanya
   * sendiri — dua keadaan sibuk yang dikongsi pernah membekukan seluruh
   * skrin apabila satu tindakan gagal, dan pepijat itu tidak akan diulang.
   */
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);

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
        /* GRID ialah cara utama menempah sekarang.
           Borang lama (pilih bilik → taip jam mula → taip jam tamat)
           menjawab soalan yang salah: guru bertanya "bila saya boleh dapat
           bilik?", dan borang itu hanya menjawab "adakah bilik ini bebas
           pada jam ini" — satu tekaan pada satu masa. */
        <GridBilik papan={papan} barangIct={barangIct} />
      )}

      {papan.bolehUrus && <WaktuTetap papan={papan} setNota={setNota} />}

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

  const [sumberSenarai, setSumberSenarai] = useState(bilik);
  if (sumberSenarai !== bilik) { setSumberSenarai(bilik); setSenarai(bilik); }

  /**
   * Tutup menu bila diketuk di luarnya.
   *
   * SASARAN DIPERIKSA, BUKAN PENYEBARAN DIHENTIKAN. Versi pertama bergantung
   * pada `stopPropagation()` dalam menu, dan ia GAGAL sepenuhnya: dalam App
   * Router, React melekatkan pendengar terwakilnya pada `document` — nod yang
   * SAMA dengan pendengar penutup ini. `stopPropagation` menghentikan
   * penyebaran ke nod INDUK; ia tidak menghentikan pendengar lain pada nod
   * yang sama (itu kerja `stopImmediatePropagation`).
   *
   * Akibatnya: `pointerdown` pada "Sunting" menutup menu, React membuang
   * butang itu daripada DOM, dan `click` yang menyusul tidak pernah sampai
   * kepada sesiapa. Menu terbuka, ketukan hilang, butang kelihatan mati.
   *
   * Memeriksa `closest("[data-menu]")` tidak bergantung pada susunan
   * pendengar langsung, jadi ia betul tanpa mengira cara React mewakilkan.
   */
  useEffect(() => {
    if (!menu) return;
    const tutup = (e: PointerEvent) => {
      const sasaran = e.target as Element | null;
      if (sasaran?.closest?.("[data-menu]")) return;
      setMenu(null);
    };
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
          : r.rekod
            ? [...l, { id: r.rekod.id, aktif: true, ...bersih }]
            : l,
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
        <span className="text-xs text-slate-500">{buka ? "▴" : "▾"}</span>
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
                      <span className={`block text-sm ${b.aktif ? "text-navy-800" : "text-slate-500 line-through"}`}>
                        {b.nama}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {[
                          b.muatan ? `${b.muatan} orang` : "",
                          b.nota ?? "",
                          b.aktif ? "" : "tidak boleh ditempah",
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </span>

                    {/* Menu tiga titik. `shrink-0` supaya ia tidak pernah
                        dipicit keluar dari kad pada skrin sempit. */}
                    <span data-menu className="relative shrink-0">
                      <button
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


/**
 * WAKTU TETAP — sekatan pukal, dan pemetaan subjek ke bilik.
 *
 * Dua kerja pentadbir yang berkongsi satu bentuk: waktu yang sudah
 * "dimiliki" sebelum sesiapa menempah. Satu ditulis dengan tangan, satu
 * dijana dari jadual waktu sekolah.
 */
function WaktuTetap({ papan, setNota }: {
  papan: PapanBilik;
  setNota: (n: { ok: boolean; teks: string }) => void;
}) {
  const [buka, setBuka] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [tetap, setTetap] = useState(papan.tetap);
  const [peta, setPeta] = useState(papan.petaSubjek);

  const [bilikId, setBilikId] = useState(papan.bilik[0]?.id ?? "");
  const [hari, setHari] = useState<Set<string>>(new Set());
  const [mula, setMula] = useState("08:00");
  const [tamat, setTamat] = useState("10:00");
  const [sebab, setSebab] = useState("");
  const [dari, setDari] = useState("");
  const [hingga, setHingga] = useState("");

  const nama = useMemo(() => new Map(papan.bilik.map((b) => [b.id, b.nama])), [papan.bilik]);

  async function tambah() {
    setSibuk(true);
    try {
      const r = await tambahTetapTindakan({
        bilik_id: bilikId, hari: [...hari], mula, tamat, sebab,
        dari_tarikh: dari, hingga_tarikh: hingga,
      });
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) { setSebab(""); setHari(new Set()); }
    } finally { setSibuk(false); }
  }

  async function buang(id: string) {
    setSibuk(true);
    try {
      const r = await padamTetapTindakan(id);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) setTetap((l) => l.filter((x) => x.id !== id));
    } finally { setSibuk(false); }
  }

  async function petakan(subjek: string, bilik: string) {
    setSibuk(true);
    try {
      const r = await petakanSubjekTindakan(subjek, bilik || null);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setPeta((p) => {
          const b = { ...p };
          if (bilik) b[subjek] = bilik; else delete b[subjek];
          return b;
        });
      }
    } finally { setSibuk(false); }
  }

  async function janaSemula() {
    setSibuk(true);
    try {
      const r = await janaSemulaTindakan();
      setNota({ ok: r.ok, teks: r.mesej });
    } finally { setSibuk(false); }
  }

  const dariJadual = tetap.filter((t) => t.sumber === "jadual");
  const manual = tetap.filter((t) => t.sumber !== "jadual");

  return (
    <section className="mt-8 rounded-2xl border border-garis bg-white p-4 sm:p-5">
      <button onClick={() => setBuka((b) => !b)}
        className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="block text-sm font-bold text-navy-800">
            Waktu tetap ({tetap.length})
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
            Waktu yang sudah dimiliki sebelum sesiapa menempah — kelas mengikut
            jadual waktu, dan waktu yang anda tutup sendiri.
          </span>
        </span>
        <span className="shrink-0 text-xs text-slate-500">{buka ? "▴" : "▾"}</span>
      </button>

      {buka && (
        <div className="mt-3 space-y-6 border-t border-garis pt-4">
          {/* ---- Pemetaan subjek ---- */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-emas-gelap">
              Subjek yang menggunakan bilik tetap
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Contoh: Pendidikan Moral belajar di Makmal 2. Sistem membaca jadual
              waktu sekolah dan menutup waktu itu sendiri — dan mengemas kininya
              setiap kali jadual dimuat naik semula. Tukar biliknya bila-bila masa;
              waktu lama dibuka, waktu baharu ditutup.
            </p>

            <ul className="mt-2 space-y-2">
              {SUBJEK.filter((x) => x.panitia).map((x) => (
                <li key={x.kod} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm text-navy-800">{x.nama}</span>
                  <div className="w-full min-w-0 sm:w-60">
                    <PilihCari id={`bilik-${x.kod}`} label={`Bilik untuk ${x.nama}`} sembunyiLabel disabled={sibuk}
                      nilai={peta[x.kod] ?? ""} tukar={(v) => void petakan(x.kod, v)} placeholder="Taip nama bilik…"
                      pilihan={[{ nilai: "", label: "— tiada bilik tetap —" }, ...papan.bilik.map((b) => ({ nilai: b.id, label: b.nama }))]} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={() => void janaSemula()} disabled={sibuk}
                className="rounded-lg border border-garis px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-700 disabled:opacity-50">
                Segarkan dari jadual waktu
              </button>
              <span className="text-[11px] text-slate-500">
                {dariJadual.length} waktu ditutup mengikut jadual.
              </span>
            </div>
          </div>

          {/* ---- Tutup waktu secara pukal ---- */}
          <div className="border-t border-garis pt-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-emas-gelap">
              Tutup waktu secara pukal
            </h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <PilihCari
                id="bilik-tetap" label="Bilik"
                pilihan={papan.bilik.map((b) => ({ nilai: b.id, label: b.nama }))}
                nilai={bilikId} tukar={setBilikId} placeholder="Cari bilik…"
              />
              <label>
                <span className="block text-xs font-semibold text-slate-500">Sebab</span>
                <input value={sebab} onChange={(e) => setSebab(e.target.value)}
                  placeholder="Penyelenggaraan komputer"
                  className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500">Mula</span>
                <input type="time" value={mula} step={300} onChange={(e) => setMula(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm text-navy-800" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500">Tamat</span>
                <input type="time" value={tamat} step={300} onChange={(e) => setTamat(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm text-navy-800" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500">
                  Dari tarikh <span className="font-normal text-slate-500">(pilihan)</span>
                </span>
                <input type="date" value={dari} onChange={(e) => setDari(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm text-navy-800" />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-500">
                  Hingga tarikh <span className="font-normal text-slate-500">(pilihan)</span>
                </span>
                <input type="date" value={hingga} onChange={(e) => setHingga(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm text-navy-800" />
              </label>
            </div>

            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-500">Hari</span>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {HARI.map((h) => (
                  <li key={h}>
                    <button type="button"
                      onClick={() => setHari((x) => {
                        const b = new Set(x);
                        if (b.has(h)) b.delete(h); else b.add(h);
                        return b;
                      })}
                      aria-pressed={hari.has(h)}
                      className={`rounded-lg border px-3 py-1 text-xs transition ${
                        hari.has(h)
                          ? "border-navy-700 bg-navy-700 text-white"
                          : "border-garis text-slate-600 hover:border-navy-700"
                      }`}>
                      {NAMA_HARI[h]}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Tarikh kosong bermakna sepanjang tahun.
              </p>
            </div>

            <button onClick={() => void tambah()}
              disabled={sibuk || hari.size === 0 || sebab.trim().length < 3}
              className="mt-3 rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
              {sibuk ? "…" : `Tutup ${hari.size || ""} hari`}
            </button>

            {manual.length > 0 && (
              <ul className="mt-3 divide-y divide-garis border-t border-garis text-sm">
                {manual.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-baseline gap-2 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block text-navy-800">
                        {nama.get(t.bilik_id) ?? "Bilik"} · {NAMA_HARI[t.hari]} {t.mula}–{t.tamat}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {t.sebab}
                        {(t.dari_tarikh || t.hingga_tarikh) &&
                          ` · ${t.dari_tarikh ?? "mula"} → ${t.hingga_tarikh ?? "akhir"}`}
                      </span>
                    </span>
                    <button onClick={() => void buang(t.id)} disabled={sibuk}
                      className="shrink-0 text-xs text-[#8f2b2b] underline disabled:opacity-50">
                      Buka semula
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {dariJadual.length > 0 && (
            <div className="border-t border-garis pt-4">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-emas-gelap">
                Dari jadual waktu ({dariJadual.length})
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Dijana semula setiap kali jadual waktu dimuat naik. Untuk
                mengubahnya, tukar pemetaan subjek di atas.
              </p>
              <ul className="mt-2 max-h-64 space-y-0.5 overflow-auto text-xs text-slate-600">
                {dariJadual.map((t) => (
                  <li key={t.id}>
                    {nama.get(t.bilik_id) ?? "Bilik"} · {NAMA_HARI[t.hari]} {t.mula}–{t.tamat}
                    <span className="text-slate-500"> · {t.sebab}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
