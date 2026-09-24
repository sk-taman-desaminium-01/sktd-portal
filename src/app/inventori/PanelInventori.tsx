"use client";

import { useEffect, useMemo, useState } from "react";
import PilihCari from "@/components/PilihCari";
import CetakLaporan from "@/components/CetakLaporan";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import {
  mohonTindakan, putuskanTindakan, batalTindakan, simpanBarangTindakan,
  padamBarangTindakan, tambahPenyeliaTindakan, buangPenyeliaTindakan,
  type PapanInventori,
} from "@/lib/tindakan-inventori";
import {
  baki, ikutKategori, semakPermohonan, NAMA_STATUS, WARNA_STATUS,
  type Barang, type Permohonan, type StatusPermohonan,
} from "@/data/inventori";
import { masaLalu } from "@/data/notifikasi";

/**
 * Inventori unit ICT dan permohonan barang.
 *
 * Dua khalayak dalam satu skrin: guru yang memohon, dan unit yang
 * memutuskan. Bahagian unit disembunyikan sepenuhnya daripada guru biasa —
 * bukan dimatikan, disembunyikan, kerana butang berkunci hanya memberitahu
 * orang apa yang mereka tidak boleh buat.
 */
export default function PanelInventori({ papan }: { papan: PapanInventori }) {
  const [barang, setBarang] = useState(papan.barang);
  const [mohon, setMohon] = useState(papan.permohonan);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const [pilih, setPilih] = useState("");
  const [kuantiti, setKuantiti] = useState("1");
  const [tujuan, setTujuan] = useState("");
  const [perluPada, setPerluPada] = useState("");

  const dipilih = barang.find((b) => b.id === pilih);
  const amaran = useMemo(() => {
    if (!dipilih) return null;
    const s = semakPermohonan({ kuantiti: Number(kuantiti), tujuan }, dipilih);
    return s.sebab ?? null;
  }, [dipilih, kuantiti, tujuan]);

  const bolehHantar =
    !!dipilih && Number(kuantiti) >= 1 && tujuan.trim().length >= 3 && !sibuk;

  async function hantar() {
    setSibuk(true);
    setNota(null);
    try {
      const r = await mohonTindakan({
        barang_id: pilih, kuantiti: Number(kuantiti), tujuan, perlu_pada: perluPada,
      });
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setTujuan(""); setKuantiti("1"); setPerluPada("");
      }
      if (r.ok && r.rekod) {
        setMohon((l) => [
          {
            id: r.rekod!.id, barang_id: pilih, kuantiti: Number(kuantiti),
            tujuan: tujuan.trim(), perlu_pada: perluPada || null,
            oleh: papan.sayaEmel, nama: "Anda", status: "baharu", tempahan_id: null,
            catatan: null, diputuskan_oleh: null, dicipta: new Date().toISOString(),
          },
          ...l,
        ]);
      }
    } finally { setSibuk(false); }
  }

  const namaBarang = useMemo(
    () => new Map(barang.map((b) => [b.id, b.nama])),
    [barang],
  );

  return (
    <>
      {nota && (
        <p className={`mt-5 rounded-xl border p-3 text-sm leading-relaxed ${
          nota.ok ? "border-[#c6e2d1] bg-[#eef8f2] text-[#167a4b]"
                  : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"}`}>
          {nota.teks}
        </p>
      )}

      {/* ---------------- Mohon ---------------- */}
      {barang.filter((b) => b.aktif).length === 0 ? (
        <p className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
          <b>Belum ada barang direkodkan.</b>{" "}
          {papan.bolehUrus
            ? "Tambah barang di bawah sebelum guru boleh memohon."
            : "Unit ICT perlu merekodkan senarai barang dahulu."}
        </p>
      ) : (
        <section className="mt-5 rounded-2xl border border-garis bg-white p-4 sm:p-5">
          <h2 className="text-base font-bold text-navy-800">Mohon barang</h2>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <PilihCari
              id="barang"
              label="Barang"
              pilihan={barang.filter((b) => b.aktif).map((b) => ({
                nilai: b.id,
                label: b.nama,
                nota: `${baki(b)} daripada ${b.kuantiti} masih ada${b.lokasi ? ` · ${b.lokasi}` : ""}`,
              }))}
              nilai={pilih}
              tukar={setPilih}
              placeholder="Cari barang…"
            />

            <label>
              <span className="block text-xs font-semibold text-slate-500">Kuantiti</span>
              <input
                value={kuantiti} onChange={(e) => setKuantiti(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="block text-xs font-semibold text-slate-500">Tujuan</span>
              <input
                value={tujuan} onChange={(e) => setTujuan(e.target.value)}
                placeholder="Kelas TMK Tahun 5 — sesi PdP berkumpulan"
                className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                Unit membacanya sebelum memutuskan.
              </span>
            </label>

            <label>
              <span className="block text-xs font-semibold text-slate-500">
                Diperlukan pada <span className="font-normal text-slate-500">(pilihan)</span>
              </span>
              <input
                type="date" value={perluPada} onChange={(e) => setPerluPada(e.target.value)}
                className="mt-1 w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm text-navy-800"
              />
            </label>
          </div>

          {amaran && (
            <p className="mt-3 rounded-lg border border-[#e9d9ae] bg-[#fdf9f0] p-2.5 text-xs leading-relaxed text-[#7a5a12]">
              {amaran}
            </p>
          )}

          <button
            onClick={() => void hantar()}
            disabled={!bolehHantar}
            className="mt-3 rounded-lg bg-navy-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {sibuk ? "…" : "Hantar permohonan"}
          </button>
        </section>
      )}

      <Permohonanku
        papan={papan} mohon={mohon} setMohon={setMohon}
        namaBarang={namaBarang} setNota={setNota}
      />

      <SenaraiBarang papan={papan} barang={barang} setBarang={setBarang} setNota={setNota} />

      {papan.bolehLantik && <Penyelia papan={papan} setNota={setNota} />}
    </>
  );
}

/* ------------------------------------------------------------- permohonan */

function Permohonanku({ papan, mohon, setMohon, namaBarang, setNota }: {
  papan: PapanInventori;
  mohon: Permohonan[];
  setMohon: (f: (l: Permohonan[]) => Permohonan[]) => void;
  namaBarang: Map<string, string>;
  setNota: (n: { ok: boolean; teks: string }) => void;
}) {
  const [sibuk, setSibuk] = useState(false);
  const [buka, setBuka] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [tapis, setTapis] = useState<StatusPermohonan | "semua">(papan.bolehUrus ? "baharu" : "semua");

  async function putus(p: Permohonan, status: StatusPermohonan) {
    setSibuk(true);
    try {
      const r = await putuskanTindakan(p.id, status, catatan);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setMohon((l) => l.map((x) => (x.id === p.id ? { ...x, status, catatan: catatan.trim() || null } : x)));
        setBuka(null); setCatatan("");
      }
    } finally { setSibuk(false); }
  }

  async function batal(p: Permohonan) {
    setSibuk(true);
    try {
      const r = await batalTindakan(p.id);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) setMohon((l) => l.filter((x) => x.id !== p.id));
    } finally { setSibuk(false); }
  }

  const papar = tapis === "semua" ? mohon : mohon.filter((p) => p.status === tapis);
  const menunggu = mohon.filter((p) => p.status === "baharu").length;
  const [cetak, setCetak] = useState(false);

  /** "24 Sep 2026" waktu Malaysia. Pelayan Vercel berjalan pada UTC. */
  const tarikhPendek = (iso: string) =>
    new Intl.DateTimeFormat("ms-MY", {
      timeZone: "Asia/Kuala_Lumpur", day: "2-digit", month: "short", year: "numeric",
    }).format(new Date(iso));

  /**
   * REKOD PINJAMAN ASET — dokumen yang boleh diserahkan.
   *
   * Sekolah bertanggungjawab ke atas asetnya. Sebelum ini kelulusan pinjaman
   * hidup dalam skrin sahaja: bila auditor atau PPD bertanya "mana rekod
   * pinjaman", tiada apa untuk dihulurkan. Butang ini mencetak senarai yang
   * SEDANG dipapar — jadi tapisan status menentukan isinya: "Diluluskan"
   * memberi senarai barang yang masih dipegang, "Selesai" memberi rekod
   * pulangan.
   */
  function cetakRekod() {
    setCetak(true);
    // Render dahulu, kemudian cetak: kandungan mesti sudah ada dalam DOM.
    setTimeout(() => mulaCetak("inventori-cetak", "Rekod Pinjaman Aset"), 0);
  }

  const LAJUR_REKOD = [
    { tajuk: "Tarikh mohon", lebar: "22mm", tengah: true },
    { tajuk: "Pemohon" },
    { tajuk: "Barang" },
    { tajuk: "Kuantiti", lebar: "16mm", tengah: true },
    { tajuk: "Tujuan" },
    { tajuk: "Perlu pada", lebar: "22mm", tengah: true },
    { tajuk: "Status", lebar: "20mm", tengah: true },
  ];
  const barisRekod = papar.map((p) => [
    tarikhPendek(p.dicipta),
    p.nama,
    namaBarang.get(p.barang_id) ?? "(barang dipadam)",
    p.kuantiti,
    p.tujuan,
    p.perlu_pada ? tarikhPendek(p.perlu_pada) : "—",
    NAMA_STATUS[p.status],
  ]);

  if (mohon.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-navy-800">
          {papan.bolehUrus ? "Permohonan masuk" : "Permohonan saya"}
          {menunggu > 0 && (
            <span className="ml-2 rounded bg-[#fdf3dc] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9a6b06]">
              {menunggu} menunggu
            </span>
          )}
        </h2>
        <select
          value={tapis}
          onChange={(e) => setTapis(e.target.value as StatusPermohonan | "semua")}
          aria-label="Tapis mengikut status"
          className="rounded-lg border border-garis px-2 py-1 text-xs"
        >
          <option value="semua">Semua</option>
          <option value="baharu">Menunggu</option>
          <option value="lulus">Diluluskan</option>
          <option value="tolak">Ditolak</option>
          <option value="selesai">Selesai</option>
        </select>
        <button
          type="button" onClick={cetakRekod}
          className="min-h-11 touch-manipulation rounded-lg border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800"
        >
          Cetak rekod ({papar.length})
        </button>
      </div>

      <ul className="mt-2 space-y-1.5">
        {papar.map((p) => (
          <li key={p.id} className="rounded-xl border border-garis bg-white p-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-navy-800">
                {p.kuantiti} × {namaBarang.get(p.barang_id) ?? "Barang"}
              </span>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${WARNA_STATUS[p.status]}`}>
                {NAMA_STATUS[p.status]}
              </span>
              <span className="ml-auto text-[11px] text-slate-500">{masaLalu(p.dicipta)}</span>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-slate-600">{p.tujuan}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {papan.bolehUrus ? p.nama : "Anda"}
              {p.perlu_pada && ` · diperlukan ${p.perlu_pada}`}
            </p>
            {p.catatan && (
              <p className="mt-1 rounded-lg bg-navy-50/50 p-2 text-[11px] leading-relaxed text-slate-600">
                Catatan unit: {p.catatan}
              </p>
            )}

            {papan.bolehUrus && p.status === "baharu" && (
              buka === p.id ? (
                <div className="mt-2 rounded-lg border border-navy-700/25 bg-navy-50/40 p-2.5">
                  <input
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Catatan untuk pemohon — wajib bila menolak"
                    aria-label="Catatan"
                    className="w-full rounded-lg border border-garis px-3 py-1.5 text-xs"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => void putus(p, "lulus")}
                      disabled={sibuk}
                      className="rounded-lg bg-[#167a4b] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Luluskan
                    </button>
                    <button
                      onClick={() => void putus(p, "tolak")}
                      disabled={sibuk}
                      className="rounded-lg bg-[#8f2b2b] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Tolak
                    </button>
                    <button onClick={() => { setBuka(null); setCatatan(""); }} className="text-xs text-slate-500 underline">
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setBuka(p.id); setCatatan(""); }}
                  className="mt-2 rounded-lg border border-navy-700 px-3 py-1.5 text-xs font-semibold text-navy-700"
                >
                  Putuskan
                </button>
              )
            )}

            {papan.bolehUrus && p.status === "lulus" && (
              <button
                onClick={() => void putus(p, "selesai")}
                disabled={sibuk}
                className="mt-2 text-xs text-slate-500 underline disabled:opacity-50"
              >
                Tanda selesai — barang dipulangkan
              </button>
            )}

            {!papan.bolehUrus && p.status === "baharu" && (
              <button
                onClick={() => void batal(p)}
                disabled={sibuk}
                className="mt-2 text-xs text-[#8f2b2b] underline disabled:opacity-50"
              >
                Batalkan permohonan
              </button>
            )}
          </li>
        ))}
        {papar.length === 0 && (
          <li className="py-3 text-sm text-slate-500">Tiada permohonan dengan status itu.</li>
        )}
      </ul>

      {cetak && (
        <CetakLaporan
          id="inventori-cetak"
          tajuk="Rekod Pinjaman Aset"
          subtajuk="Unit ICT"
          maklumat={[
            { label: "Status", nilai: tapis === "semua" ? "Semua" : NAMA_STATUS[tapis] },
            { label: "Bilangan rekod", nilai: String(papar.length) },
          ]}
          lajur={LAJUR_REKOD}
          baris={barisRekod}
          nota="Barang yang diluluskan kekal di bawah tanggungjawab pemohon sehingga dipulangkan dan direkodkan sebagai Selesai."
          tandatangan={[
            { label: "Disediakan oleh" },
            { label: "Disahkan oleh", jawatan: "Penyelia Unit" },
          ]}
        />
      )}
    </section>
  );
}

/* ----------------------------------------------------------------- barang */

function SenaraiBarang({ papan, barang, setBarang, setNota }: {
  papan: PapanInventori;
  barang: Barang[];
  setBarang: (f: (l: Barang[]) => Barang[]) => void;
  setNota: (n: { ok: boolean; teks: string }) => void;
}) {
  const [buka, setBuka] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [sunting, setSunting] = useState<string | null>(null);
  const [sahPadam, setSahPadam] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState("");
  const [kuantiti, setKuantiti] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [notaB, setNotaB] = useState("");

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

  function mula(b?: Barang) {
    setSunting(b?.id ?? "baharu");
    setNama(b?.nama ?? ""); setKategori(b?.kategori ?? "");
    setKuantiti(b ? String(b.kuantiti) : "");
    setLokasi(b?.lokasi ?? ""); setNotaB(b?.nota ?? "");
    setMenu(null);
  }

  async function simpan() {
    setSibuk(true);
    try {
      const id = sunting === "baharu" ? undefined : sunting ?? undefined;
      const asal = barang.find((x) => x.id === id);
      const r = await simpanBarangTindakan({
        id, nama, kategori, kuantiti, lokasi, nota: notaB, aktif: asal?.aktif ?? true,
      });
      setNota({ ok: r.ok, teks: r.mesej });
      if (!r.ok) return;
      const bersih = {
        nama: nama.trim(), kategori: kategori.trim() || null,
        kuantiti: Number(kuantiti), lokasi: lokasi.trim() || null,
        nota: notaB.trim() || null,
      };
      setBarang((l) =>
        id
          ? l.map((x) => (x.id === id ? { ...x, ...bersih } : x))
          : r.rekod
            ? [...l, { id: r.rekod.id, unit: "ICT", aktif: true, dipinjam: 0, ...bersih }]
            : l,
      );
      setSunting(null);
    } finally { setSibuk(false); }
  }

  async function padam(id: string) {
    setSibuk(true);
    try {
      const r = await padamBarangTindakan(id);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setBarang((l) =>
          r.mesej.includes("DISEMBUNYIKAN")
            ? l.map((x) => (x.id === id ? { ...x, aktif: false } : x))
            : l.filter((x) => x.id !== id),
        );
      }
      setSahPadam(null);
    } finally { setSibuk(false); }
  }

  const borang = (
    <div className="mt-3 rounded-lg border border-navy-700/30 bg-navy-50/40 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={nama} onChange={(e) => setNama(e.target.value)}
          placeholder="Nama barang — contoh: Laptop Acer" aria-label="Nama barang"
          className="min-w-0 rounded-lg border border-garis px-3 py-2 text-sm" />
        <input value={kategori} onChange={(e) => setKategori(e.target.value)}
          placeholder="Kategori — contoh: Komputer" aria-label="Kategori"
          className="min-w-0 rounded-lg border border-garis px-3 py-2 text-sm" />
        <input value={kuantiti} onChange={(e) => setKuantiti(e.target.value)}
          placeholder="Kuantiti" inputMode="numeric" aria-label="Kuantiti"
          className="min-w-0 rounded-lg border border-garis px-3 py-2 text-sm" />
        <input value={lokasi} onChange={(e) => setLokasi(e.target.value)}
          placeholder="Lokasi — contoh: Bilik ICT" aria-label="Lokasi"
          className="min-w-0 rounded-lg border border-garis px-3 py-2 text-sm" />
        <input value={notaB} onChange={(e) => setNotaB(e.target.value)}
          placeholder="Nota — contoh: 3 unit rosak" aria-label="Nota"
          className="min-w-0 rounded-lg border border-garis px-3 py-2 text-sm sm:col-span-2" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={() => void simpan()} disabled={sibuk || nama.trim().length < 2}
          className="rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
          {sibuk ? "…" : sunting === "baharu" ? "Tambah barang" : "Simpan"}
        </button>
        <button onClick={() => setSunting(null)} className="text-xs text-slate-500 underline">Batal</button>
      </div>
    </div>
  );

  const kategoriBarang = ikutKategori(barang);

  return (
    <section className="mt-8 rounded-2xl border border-garis bg-white p-4 sm:p-5">
      <button onClick={() => setBuka((b) => !b)}
        className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="block text-sm font-bold text-navy-800">
            Rekod inventori ICT ({barang.length})
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Apa yang unit miliki, berapa banyak, dan berapa yang masih ada.
          </span>
        </span>
        <span className="shrink-0 text-xs text-slate-500">{buka ? "▴" : "▾"}</span>
      </button>

      {buka && (
        <div className="mt-3 border-t border-garis pt-3">
          {papan.bolehUrus && (sunting === "baharu" ? borang : (
            <button onClick={() => mula()}
              className="rounded-lg border border-navy-700 px-4 py-2 text-xs font-semibold text-navy-700">
              + Tambah barang
            </button>
          ))}

          {kategoriBarang.map((k) => (
            <div key={k.kategori} className="mt-4">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-emas-gelap">{k.kategori}</h3>
              <ul className="mt-1.5 divide-y divide-garis border-t border-garis">
                {k.barang.map((b) => (
                  <li key={b.id} className="py-2">
                    <div className="flex items-start gap-2">
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${b.aktif ? "text-navy-800" : "text-slate-500 line-through"}`}>
                          {b.nama}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {baki(b)} daripada {b.kuantiti} masih ada
                          {b.lokasi && ` · ${b.lokasi}`}
                          {b.nota && ` · ${b.nota}`}
                          {!b.aktif && " · tidak disediakan"}
                        </span>
                      </span>

                      {papan.bolehUrus && (
                        <span data-menu className="relative shrink-0">
                          <button
                                onClick={() => setMenu((m) => (m === b.id ? null : b.id))}
                            aria-label={`Tindakan untuk ${b.nama}`}
                            aria-haspopup="menu" aria-expanded={menu === b.id}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-garis text-slate-500 hover:border-navy-700 hover:text-navy-700"
                          >
                            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="currentColor">
                              <circle cx="8" cy="3" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="8" cy="13" r="1.4" />
                            </svg>
                          </button>
                          {menu === b.id && (
                            <span role="menu"
                              className="absolute right-0 top-full z-20 mt-1 flex w-40 flex-col overflow-hidden rounded-xl border border-garis bg-white py-1 shadow-lg">
                              <button role="menuitem" onClick={() => mula(b)}
                                className="px-3 py-2 text-left text-xs text-navy-800 hover:bg-navy-50">Sunting</button>
                              <button role="menuitem" onClick={() => { setSahPadam(b.id); setMenu(null); }}
                                className="px-3 py-2 text-left text-xs text-[#8f2b2b] hover:bg-[#fdf1f1]">Padam</button>
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {sahPadam === b.id && (
                      <p className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[#fdf1f1] p-2.5 text-xs text-[#8f2b2b]">
                        <span className="min-w-0 flex-1">
                          Padam <b>{b.nama}</b>? Kalau ia pernah dimohon, ia disembunyikan
                          dan bukan dipadam.
                        </span>
                        <button onClick={() => void padam(b.id)} disabled={sibuk}
                          className="shrink-0 rounded-lg bg-[#8f2b2b] px-3 py-1.5 font-bold text-white disabled:opacity-50">
                          Ya, padam
                        </button>
                        <button onClick={() => setSahPadam(null)} className="shrink-0 underline">Batal</button>
                      </p>
                    )}

                    {sunting === b.id && borang}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- penyelia */

function Penyelia({ papan, setNota }: {
  papan: PapanInventori;
  setNota: (n: { ok: boolean; teks: string }) => void;
}) {
  const [senarai, setSenarai] = useState(papan.penyelia);
  const [emel, setEmel] = useState("");
  const [sibuk, setSibuk] = useState(false);

  async function tambah() {
    setSibuk(true);
    try {
      const r = await tambahPenyeliaTindakan(emel);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) { setSenarai((l) => [...l, emel.trim().toLowerCase()]); setEmel(""); }
    } finally { setSibuk(false); }
  }

  async function buang(e: string) {
    setSibuk(true);
    try {
      const r = await buangPenyeliaTindakan(e);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) setSenarai((l) => l.filter((x) => x !== e));
    } finally { setSibuk(false); }
  }

  return (
    <section className="mt-8 rounded-2xl border border-garis bg-white p-4 sm:p-5">
      <h2 className="text-sm font-bold text-navy-800">Penyelia unit ICT</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Siapa menerima notifikasi permohonan dan boleh memutuskannya. Ini
        <b> bukan</b> kuasa pentadbiran — seorang guru boleh menguruskan
        inventori ICT tanpa menjadi pentadbir sekolah.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={emel} onChange={(e) => setEmel(e.target.value)}
          placeholder="emel@moe-dl.edu.my" aria-label="Emel penyelia"
          className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-2 text-sm"
        />
        <button onClick={() => void tambah()} disabled={sibuk || emel.trim() === ""}
          className="shrink-0 rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
          Tambah
        </button>
      </div>

      {senarai.length > 0 && (
        <ul className="mt-3 divide-y divide-garis border-t border-garis text-sm">
          {senarai.map((e) => (
            <li key={e} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-navy-800">{e}</span>
              <button onClick={() => void buang(e)} disabled={sibuk}
                className="shrink-0 text-xs text-[#8f2b2b] underline disabled:opacity-50">
                Buang
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
