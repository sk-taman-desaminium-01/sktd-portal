"use client";

import { useEffect, useMemo, useState } from "react";
import { importMuridKelas, type HasilImportKelas } from "@/lib/import-murid";
import { importFailMurid, type HasilFail } from "@/lib/fail-murid";
import { failKeMuatan } from "@/data/fail-base64";
import {
  tugaskanGuruSubjek, buangTugasanGuruSubjek, naikTahunTindakan, cubaNaikTahun,
  undoNaikTahunTindakan, senaraiSesiTindakan, jadikanSesiAktif,
  muridKelasTindakan, suntingMuridTindakan,
  buangMuridTindakan, tukarKelasTindakan, type MuridRingkas,
} from "@/lib/tindakan-pbd";
import type { RancanganNaik } from "@/data/naik-tahun";
import PilihCari from "@/components/PilihCari";
import { SUBJEK, namaSubjek } from "@/data/subjek";

/**
 * Urus ePBD — sesi, murid, dan siapa mengajar apa.
 *
 * TIGA PEMBETULAN DARI MAKLUM BALAS PENGGUNA (17 Sep 2026):
 *
 *  1. Import murid tidak lagi menuntut CSV. Kelas dipilih dari senarai yang
 *     sistem sudah tahu; hanya nama dan No. KP ditampal, dalam apa jua
 *     bentuk ia datang. Jantina dikira dari digit terakhir No. KP.
 *  2. Setiap pemilih panjang boleh dicari. 57 kelas dan 130 nama guru dalam
 *     `<select>` bermakna menatal dengan ibu jari, dan memilih yang salah.
 *  3. Seorang guru mengajar BANYAK subjek merentas banyak kelas. Menugaskan
 *     satu demi satu bermakna dua belas klik untuk seorang guru; subjek dan
 *     kelas kini kedua-duanya boleh dipilih berbilang.
 */

export interface Tugasan {
  id: string;
  emel: string;
  subjek: string;
  tahun: number;
  kelas: string;
}

export default function PanelUrusPbd({
  tugasanAwal, senaraiGuru, senaraiKelas, semuaKelas, tahunSesi, jumlahMurid,
}: {
  tugasanAwal: Tugasan[];
  senaraiGuru: { emel: string; nama: string }[];
  senaraiKelas: { tahun: number; kelas: string }[];
  /** Setiap kelas sekolah, termasuk yang belum ada murid. */
  semuaKelas: string[];
  tahunSesi: number;
  jumlahMurid: number;
}) {
  /* --------------------------------------------------------------- sesi */
  const [sahNaik, setSahNaik] = useState(false);
  const [sibukSesi, setSibukSesi] = useState(false);
  const [mesejSesi, setMesejSesi] = useState<{ ok: boolean; teks: string } | null>(null);

  const [cuba, setCuba] = useState<
    { rancangan: RancanganNaik; gerak: { label: string; bil: number }[] } | null
  >(null);

  /**
   * Larian kering. Tidak menulis apa-apa, boleh diulang.
   *
   * Butang sebenar dikunci sehingga ini dijalankan — naik tahun berlaku
   * sekali setahun kepada setiap murid sekali, dan orang yang menekannya
   * tidak akan pernah cukup biasa dengannya untuk perasan bila ia salah.
   */
  async function cubaDahulu() {
    setSibukSesi(true);
    setMesejSesi(null);
    try {
      const r = await cubaNaikTahun();
      setMesejSesi({ ok: r.ok, teks: r.mesej });
      setCuba(r.ok && r.rancangan ? { rancangan: r.rancangan, gerak: r.gerak ?? [] } : null);
    } finally {
      setSibukSesi(false);
    }
  }

  const [sahUndo, setSahUndo] = useState(false);

  /**
   * Senarai sesi, untuk berpindah antara tahun tanpa memadam apa-apa.
   *
   * Ini jalan pulang yang paling ringan, dan yang paling kerap diperlukan:
   * pengguna yang menguji naik tahun mahu berdiri semula di tahun yang
   * betul, bukan semestinya membuang tahun yang baharu.
   */
  const [sesi, setSesi] = useState<{ tahun_sesi: number; status: string }[] | null>(null);

  useEffect(() => {
    void senaraiSesiTindakan().then((r) => setSesi(r.sesi ?? null));
  }, []);

  async function pindahSesi(tahun: number) {
    setSibukSesi(true);
    try {
      const r = await jadikanSesiAktif(tahun);
      setMesejSesi({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setSesi((l) =>
          (l ?? []).map((s) => ({ ...s, status: s.tahun_sesi === tahun ? "aktif" : "tutup" })),
        );
      }
    } finally {
      setSibukSesi(false);
    }
  }

  /**
   * Patah balik selepas ujian.
   *
   * Operasi yang tiada jalan pulang bermakna orang takut mengujinya — dan
   * operasi yang tidak pernah diuji ialah operasi yang gagal pada 1 Januari.
   */
  async function undoNaik() {
    setSibukSesi(true);
    try {
      const r = await undoNaikTahunTindakan();
      setMesejSesi({ ok: r.ok, teks: r.mesej });
      if (r.ok) { setSahUndo(false); setCuba(null); }
    } finally {
      setSibukSesi(false);
    }
  }

  async function naikTahun() {
    setSibukSesi(true);
    try {
      const r = await naikTahunTindakan();
      setMesejSesi({ ok: r.ok, teks: r.mesej });
      if (r.ok) setSahNaik(false);
    } finally {
      setSibukSesi(false);
    }
  }

  /* ------------------------------------------------------------- import */
  const [kelasImport, setKelasImport] = useState(semuaKelas[0] ?? "");
  const [teks, setTeks] = useState("");
  const [hasil, setHasil] = useState<HasilImportKelas | null>(null);
  const [sibukImport, setSibukImport] = useState(false);

  /* ------------------------------------------------- import dari fail */
  const [fail, setFail] = useState<File | null>(null);
  const [hasilFail, setHasilFail] = useState<HasilFail | null>(null);
  const [sibukFail, setSibukFail] = useState(false);

  /**
   * Baca fail senarai kelas terus, tanpa menampal.
   *
   * Fail iDMe jarang lurus — ia terbalik, berputar, senget. Pelayan membaca
   * fail yang sama beberapa cara dan memilih yang menghasilkan No. KP sah
   * paling banyak, kemudian memberitahu cara mana yang menang.
   */
  async function jalanFail(simpan: boolean) {
    if (!fail) return;
    const [tahunStr, ...sisa] = kelasImport.split(" ");
    const tahun = Number(tahunStr);
    if (!tahun || sisa.length === 0) {
      setHasilFail({ ok: false, kering: true, mesej: "Pilih kelas dahulu." });
      return;
    }
    const k = sisa.join(" ");
    setSibukFail(true);
    try {
      const r = await importFailMurid(tahun, k, await failKeMuatan(fail), simpan);
      setHasilFail(r);
      // Teks yang dipilih dimasukkan ke kotak tampal, supaya pentadbir boleh
      // membetulkan baris yang tersasar sebelum menyimpan.
      if (r.teks && !simpan) setTeks(r.teks);
    } finally {
      setSibukFail(false);
    }
  }

  async function jalanImport(simpan: boolean) {
    const [tahunStr, ...sisa] = kelasImport.split(" ");
    const tahun = Number(tahunStr);
    if (!tahun || sisa.length === 0) {
      setHasil({ ok: false, kering: true, mesej: "Pilih kelas dahulu." });
      return;
    }
    if (teks.trim() === "") {
      setHasil({ ok: false, kering: true, mesej: "Tampal senarai nama dahulu." });
      return;
    }
    setSibukImport(true);
    try {
      const r = await importMuridKelas(tahun, sisa.join(" "), teks, simpan);
      setHasil(r);
      if (r.ok && !r.kering) setTeks("");
    } finally {
      setSibukImport(false);
    }
  }

  /* ------------------------------------------------------------ tugasan */
  const [tugasan, setTugasan] = useState(tugasanAwal);
  const [emel, setEmel] = useState(senaraiGuru[0]?.emel ?? "");
  const [subjekPilih, setSubjekPilih] = useState<Set<string>>(new Set());
  const [kelasPilih, setKelasPilih] = useState<Set<string>>(new Set());
  const [mesejTugas, setMesejTugas] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibukTugas, setSibukTugas] = useState<string | null>(null);
  const [cari, setCari] = useState("");

  function togolSet(set: Set<string>, nilai: string): Set<string> {
    const baharu = new Set(set);
    if (baharu.has(nilai)) baharu.delete(nilai);
    else baharu.add(nilai);
    return baharu;
  }

  async function tambah() {
    if (subjekPilih.size === 0 || kelasPilih.size === 0) {
      setMesejTugas({ ok: false, teks: "Pilih sekurang-kurangnya satu subjek dan satu kelas." });
      return;
    }
    setSibukTugas("tambah");
    const baharu: Tugasan[] = [];
    try {
      for (const s of subjekPilih) {
        for (const k of kelasPilih) {
          const [tahunStr, ...sisa] = k.split(" ");
          const kelas = sisa.join(" ");
          const r = await tugaskanGuruSubjek(emel, s, Number(tahunStr), kelas);
          if (r.ok) {
            baharu.push({
              id: `sementara-${s}-${k}-${Date.now()}`,
              emel, subjek: s, tahun: Number(tahunStr), kelas,
            });
          } else {
            setMesejTugas({ ok: false, teks: r.mesej });
          }
        }
      }
      if (baharu.length > 0) {
        setTugasan((lama) => [
          ...lama.filter(
            (t) =>
              !baharu.some(
                (b) =>
                  b.emel === t.emel && b.subjek === t.subjek &&
                  b.tahun === t.tahun && b.kelas === t.kelas,
              ),
          ),
          ...baharu,
        ]);
        setMesejTugas({ ok: true, teks: `${baharu.length} tugasan disimpan untuk ${emel}.` });
        setSubjekPilih(new Set());
        setKelasPilih(new Set());
      }
    } finally {
      setSibukTugas(null);
    }
  }

  async function buang(t: Tugasan) {
    setSibukTugas(t.id);
    try {
      const r = await buangTugasanGuruSubjek(t.id);
      setMesejTugas({ ok: r.ok, teks: r.mesej });
      if (r.ok) setTugasan((s) => s.filter((x) => x.id !== t.id));
    } finally {
      setSibukTugas(null);
    }
  }

  const carian = cari.trim().toLowerCase();
  const ditapis = carian
    ? tugasan.filter(
        (t) =>
          t.emel.toLowerCase().includes(carian) ||
          namaSubjek(t.subjek).toLowerCase().includes(carian) ||
          `${t.tahun} ${t.kelas}`.toLowerCase().includes(carian),
      )
    : tugasan;

  // Tugasan dikumpul MENGIKUT GURU. Seorang guru boleh memegang dua belas
  // tugasan; senarai rata bermakna namanya berulang dua belas kali dan tiada
  // sesiapa dapat melihat beban siapa.
  const ikutGuru = useMemo(() => {
    const peta = new Map<string, Tugasan[]>();
    for (const t of ditapis) {
      const ada = peta.get(t.emel);
      if (ada) ada.push(t);
      else peta.set(t.emel, [t]);
    }
    return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ditapis]);

  const namaGuru = (e: string) => senaraiGuru.find((g) => g.emel === e)?.nama || e;

  return (
    <>
      {/* ---------------- Hujung sesi ---------------- */}
      <section className="mt-8 rounded-xl border border-garis bg-white p-5">
        <h2 className="text-base font-bold text-navy-800">Hujung sesi</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Menutup sesi {tahunSesi}, membuka sesi {tahunSesi + 1}, dan menaikkan
          semua murid satu tahun. Murid Tahun 6 ditandakan tamat.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-navy-800">
          <b>Keputusan sesi {tahunSesi} tidak disentuh.</b> Murid mendapat
          pendaftaran baharu; yang lama kekal, jadi slip sesi {tahunSesi} boleh
          dicetak selamanya. Menekan dua kali tidak mencipta murid pendua.
        </p>

        {mesejSesi && <div className="mt-3"><Mesej ok={mesejSesi.ok} teks={mesejSesi.teks} /></div>}

        {/* TUKAR SESI — jalan pulang yang tidak memadam apa-apa.
            Dipaparkan sebelum butang naik tahun kerana ia jawapan kepada
            soalan yang lebih kerap: "saya di tahun yang salah". */}
        {sesi && sesi.length > 1 && (
          <div className="mt-4 rounded-xl border border-garis bg-navy-50/40 p-3">
            <p className="text-xs font-semibold text-slate-500">Sesi persekolahan</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
              Satu sesi aktif pada satu masa. Menukarnya <b>tidak memadam apa-apa</b> —
              pendaftaran dan nilai setiap sesi kekal seperti sedia ada.
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {[...sesi].sort((a, b) => b.tahun_sesi - a.tahun_sesi).map((x) => (
                <li key={x.tahun_sesi}>
                  <button
                    onClick={() => void pindahSesi(x.tahun_sesi)}
                    disabled={sibukSesi || x.status === "aktif"}
                    aria-pressed={x.status === "aktif"}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      x.status === "aktif"
                        ? "border-navy-700 bg-navy-700 text-white"
                        : "border-garis text-slate-600 hover:border-navy-700 disabled:opacity-50"
                    }`}
                  >
                    {x.tahun_sesi}
                    {x.status === "aktif" && " · aktif"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {cuba && <SemakanNaik {...cuba} tahunSesi={tahunSesi} />}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => void cubaDahulu()}
            disabled={sibukSesi}
            className="rounded-lg border border-garis px-4 py-2 text-sm font-semibold text-navy-700 hover:border-navy-700 disabled:opacity-50"
          >
            {sibukSesi && !sahNaik ? "Menyemak…" : "Semak dahulu"}
          </button>

          {/* PATAH BALIK. Ia bukan butang utama dan tidak sepatutnya kelihatan
              seperti satu — tetapi ia mesti ada, kalau tidak naik tahun
              menjadi operasi yang orang takut menguji. */}
          {sahUndo ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[#8f2b2b]">
                Buang pendaftaran sesi terbaharu dan buka semula sesi sebelumnya?
                Nilai PBD yang sudah diisi akan menghentikan operasi ini.
              </span>
              <button
                onClick={() => void undoNaik()}
                disabled={sibukSesi}
                className="rounded-lg bg-[#8f2b2b] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {sibukSesi ? "…" : "Ya, patah balik"}
              </button>
              <button onClick={() => setSahUndo(false)} className="text-sm text-slate-500 underline">
                Batal
              </button>
            </span>
          ) : (
            <button
              onClick={() => setSahUndo(true)}
              disabled={sibukSesi}
              className="text-sm text-slate-500 underline hover:text-[#8f2b2b] disabled:opacity-50"
            >
              Patah balik naik tahun
            </button>
          )}
        </div>

        <div className="mt-3">
          {sahNaik ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[#8f2b2b]">
                Naikkan {jumlahMurid} murid ke sesi {tahunSesi + 1}?
              </span>
              <button
                onClick={() => void naikTahun()}
                disabled={sibukSesi}
                className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sibukSesi ? "Menjalankan…" : "Ya, naikkan"}
              </button>
              <button onClick={() => setSahNaik(false)} className="text-sm text-slate-500 underline">
                Batal
              </button>
            </span>
          ) : (
            <button
              onClick={() => setSahNaik(true)}
              disabled={!cuba}
              title={cuba ? undefined : "Tekan Semak dahulu."}
              className="rounded-lg border border-navy-700 px-4 py-2 text-sm font-semibold text-navy-700 disabled:border-garis disabled:text-slate-400"
            >
              Tutup sesi {tahunSesi} &amp; naik tahun
            </button>
          )}
          {!cuba && (
            <p className="mt-2 text-xs text-slate-400">
Tekan <b>Semak dahulu</b> sebelum ini boleh digunakan.
            </p>
          )}
        </div>
      </section>

      {/* ---------------- Masukkan murid ---------------- */}
      <section className="mt-10">
        <h2 className="text-base font-bold text-navy-800">Masukkan murid</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Pilih kelas, kemudian tampal senarai nama dan No. KP — dalam apa jua
          bentuk ia datang. Sistem mengenal No. KP walaupun ditulis dengan
          sempang, ruang atau titik, dan mengira jantina dari digit terakhirnya.
          Kelas tidak perlu ditaip.
        </p>

        <div className="mt-3 rounded-xl border border-garis bg-white p-4">
          <div className="max-w-xs">
            <PilihCari
              id="kelas-import"
              label="Kelas"
              pilihan={semuaKelas.map((k) => {
                const ada = senaraiKelas.some((x) => `${x.tahun} ${x.kelas}` === k);
                return { nilai: k, label: k, nota: ada ? "sudah ada murid" : undefined };
              })}
              nilai={kelasImport}
              tukar={setKelasImport}
              placeholder="Cari kelas…"
            />
          </div>

          <textarea
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            rows={8}
            aria-label="Senarai nama dan No. KP"
            placeholder={
              "AHMAD BIN ALI 060101101233\n" +
              "2. NUR AISYAH BINTI OMAR, 070202-10-5678\n" +
              "051212105566 MUHAMMAD DANIAL BIN ZAKARIA"
            }
            className="mt-4 w-full rounded-xl border border-garis p-3 font-mono text-xs"
          />

          {/* ---- Muat naik fail ---- */}
          <div className="mt-4 rounded-xl border border-dashed border-garis bg-navy-50/30 p-3">
            <p className="text-xs font-semibold text-slate-500">
              Atau muat naik fail senarai kelas
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              PDF dari iDMe, Excel, Word atau CSV. Fail dibaca beberapa cara —
              baris, lajur menegak, jadual — dan cara yang menghasilkan No. KP
              sah paling banyak dipilih. Fail yang terbalik atau senget tidak
              perlu dibetulkan dahulu.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.txt"
                onChange={(e) => { setFail(e.target.files?.[0] ?? null); setHasilFail(null); }}
                aria-label="Fail senarai kelas"
                className="max-w-full text-xs file:mr-2 file:rounded-lg file:border file:border-garis file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-navy-700"
              />
              {fail && (
                <button
                  onClick={() => void jalanFail(false)}
                  disabled={sibukFail}
                  className="rounded-lg border border-navy-700 px-4 py-2 text-xs font-semibold text-navy-700 disabled:opacity-50"
                >
                  {sibukFail ? "Membaca…" : "Baca fail"}
                </button>
              )}
            </div>

            {hasilFail && (
              <div className="mt-2">
                <Mesej ok={hasilFail.ok} teks={hasilFail.mesej} />
                {hasilFail.calon && hasilFail.calon.length > 1 && (
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Skor setiap cara:{" "}
                    {hasilFail.calon
                      .map((c) => `${c.cara} ${c.skor}`)
                      .join(" · ")}
                  </p>
                )}
                {hasilFail.teks && (
                  <p className="mt-1.5 text-[11px] text-[#167a4b]">
                    Teksnya dimasukkan ke kotak di atas — semak dan betulkan
                    baris yang tersasar sebelum menyimpan.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void jalanImport(false)}
              disabled={sibukImport}
              className="rounded-lg border border-navy-700 px-4 py-2 text-sm font-semibold text-navy-700 disabled:opacity-50"
            >
              {sibukImport ? "Menyemak…" : "Semak dahulu"}
            </button>
            {hasil?.ok && hasil.kering && (
              <button
                onClick={() => void jalanImport(true)}
                disabled={sibukImport}
                className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Simpan {hasil.jumlah} murid ke {kelasImport}
              </button>
            )}
          </div>
        </div>

        {hasil && (
          <div className="mt-3">
            <Mesej ok={hasil.ok} teks={hasil.mesej} />

            {hasil.ralat && hasil.ralat.length > 0 && (
              <ul className="mt-2 space-y-0.5 rounded-lg border border-[#e9d9ae] bg-[#fdf9f0] p-3 text-xs leading-relaxed text-[#7a5a12]">
                {hasil.ralat.slice(0, 12).map((r, i) => <li key={i}>⚠ {r}</li>)}
                {hasil.ralat.length > 12 && <li>… {hasil.ralat.length - 12} lagi</li>}
              </ul>
            )}

            {hasil.murid && hasil.murid.length > 0 && (
              <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-garis bg-white">
                <table className="w-full min-w-[30rem] text-left text-xs">
                  <thead className="sticky top-0 bg-navy-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Nama</th>
                      <th className="px-3 py-2 font-semibold">No. KP</th>
                      <th className="px-3 py-2 font-semibold">Jantina</th>
                      <th className="px-3 py-2 font-semibold">Lahir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-garis">
                    {hasil.murid.map((m, i) => (
                      <tr key={i} className={m.amaran.length ? "bg-[#fffdf5]" : undefined}>
                        <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium text-navy-800">{m.nama}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-600">{m.no_kp ?? "—"}</td>
                        <td className="px-3 py-1.5">{m.jantina ?? "—"}</td>
                        <td className="px-3 py-1.5 text-slate-500">{m.lahir ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------------- Betulkan murid ---------------- */}
      <SemakMurid senaraiKelas={senaraiKelas} />

      {/* ---------------- Guru subjek ---------------- */}
      <section className="mt-10">
        <h2 className="text-base font-bold text-navy-800">Guru subjek</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Menentukan siapa boleh mengisi TP bagi subjek dan kelas mana. Seorang
          guru selalunya mengajar beberapa subjek merentas beberapa kelas —
          pilih semuanya sekali gus.
        </p>

        {senaraiKelas.length === 0 ? (
          <p className="mt-3 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm text-[#7a5a12]">
            Belum ada murid dimasukkan, jadi belum ada kelas untuk ditugaskan.
          </p>
        ) : (
          <div className="mt-3 rounded-xl border border-garis bg-white p-4">
            <div className="max-w-sm">
              <PilihCari
                id="guru-tugas"
                label="Guru"
                pilihan={senaraiGuru.map((g) => ({
                  nilai: g.emel,
                  label: g.nama || g.emel,
                  nota: g.nama ? g.emel : undefined,
                }))}
                nilai={emel}
                tukar={setEmel}
                placeholder="Cari nama atau emel…"
              />
            </div>

            <Berbilang
              tajuk="Subjek"
              pilihan={SUBJEK.map((s) => ({ nilai: s.kod, label: s.nama }))}
              dipilih={subjekPilih}
              togol={(v) => setSubjekPilih((s) => togolSet(s, v))}
            />
            <Berbilang
              tajuk="Kelas"
              pilihan={senaraiKelas.map((k) => ({
                nilai: `${k.tahun} ${k.kelas}`,
                label: `${k.tahun} ${k.kelas}`,
              }))}
              dipilih={kelasPilih}
              togol={(v) => setKelasPilih((s) => togolSet(s, v))}
            />

            <button
              onClick={() => void tambah()}
              disabled={sibukTugas !== null || !emel}
              className="mt-4 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sibukTugas === "tambah"
                ? "Menyimpan…"
                : `Tugaskan ${subjekPilih.size} subjek × ${kelasPilih.size} kelas`}
            </button>
          </div>
        )}

        {mesejTugas && <div className="mt-3"><Mesej ok={mesejTugas.ok} teks={mesejTugas.teks} /></div>}

        {tugasan.length > 8 && (
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari guru, subjek atau kelas…"
            aria-label="Cari tugasan"
            className="mt-4 w-full rounded-lg border border-garis px-3 py-2 text-sm"
          />
        )}

        {ikutGuru.length > 0 && (
          <ul className="mt-3 space-y-3">
            {ikutGuru.map(([e, senarai]) => (
              <li key={e} className="rounded-xl border border-garis bg-white p-4">
                <p className="font-semibold text-navy-800">{namaGuru(e)}</p>
                <p className="text-xs text-slate-500">{e} · {senarai.length} tugasan</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {senarai.map((t) => (
                    <li key={t.id}>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-garis px-2 py-1 text-xs">
                        <span className="text-navy-800">
                          {namaSubjek(t.subjek)} · {t.tahun} {t.kelas}
                        </span>
                        <button
                          onClick={() => void buang(t)}
                          disabled={sibukTugas === t.id}
                          aria-label={`Buang ${namaSubjek(t.subjek)} ${t.tahun} ${t.kelas}`}
                          className="text-slate-400 hover:text-[#8f2b2b] disabled:opacity-50"
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Mesej({ ok, teks }: { ok: boolean; teks: string }) {
  return (
    <p
      className={`rounded-lg border p-3 text-sm leading-relaxed ${
        ok
          ? "border-[#bfe3ce] bg-[#eef8f2] text-[#15693f]"
          : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
      }`}
    >
      {teks}
    </p>
  );
}

/** Pemilih berbilang berbentuk cip — untuk subjek dan kelas. */
/**
 * Pilihan berbilang, dengan CARIAN.
 *
 * Peraturan tetap dalam portal ini: apa-apa senarai yang boleh menjadi
 * panjang mesti boleh dicari. Lima puluh tujuh kelas sebagai cip berderet
 * bermakna guru mengimbas dengan mata sehingga jumpa — dan memilih kelas
 * yang salah berlaku sekurang-kurangnya sekali setiap sesi.
 *
 * Kotak carian disembunyikan bila pilihannya lapan atau kurang; mencari
 * antara tiga perkara bukan masalah yang perlu diselesaikan. Ambang yang
 * sama dengan `PilihCari`, supaya kedua-duanya berkelakuan serupa.
 */
function Berbilang({
  tajuk, pilihan, dipilih, togol,
}: {
  tajuk: string;
  pilihan: { nilai: string; label: string }[];
  dipilih: Set<string>;
  togol: (nilai: string) => void;
}) {
  const [cari, setCari] = useState("");

  const ditapis = useMemo(() => {
    const t = cari.trim().toLowerCase();
    if (!t) return pilihan;
    return pilihan.filter((p) => p.label.toLowerCase().includes(t));
  }, [pilihan, cari]);

  // Yang SUDAH dipilih sentiasa kelihatan, walaupun ditapis keluar oleh
  // carian. Cip yang hilang semasa menaip kelihatan seperti pilihan yang
  // terbatal, dan pengguna menekannya semula.
  const papar = useMemo(() => {
    const nampak = new Set(ditapis.map((p) => p.nilai));
    return [...ditapis, ...pilihan.filter((p) => dipilih.has(p.nilai) && !nampak.has(p.nilai))];
  }, [ditapis, pilihan, dipilih]);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">
          {tajuk}
          {dipilih.size > 0 && <span className="ml-1.5 text-navy-700">· {dipilih.size} dipilih</span>}
        </span>
        {dipilih.size > 0 && (
          <button
            type="button"
            onClick={() => pilihan.filter((p) => dipilih.has(p.nilai)).forEach((p) => togol(p.nilai))}
            className="text-xs text-slate-500 underline hover:text-navy-700"
          >
            Kosongkan
          </button>
        )}
      </div>

      {pilihan.length > 8 && (
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder={`Cari ${tajuk.toLowerCase()}…`}
          aria-label={`Cari ${tajuk}`}
          className="mt-1.5 w-full max-w-xs rounded-lg border border-garis px-3 py-1.5 text-xs"
        />
      )}

      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {papar.map((p) => {
          const aktif = dipilih.has(p.nilai);
          return (
            <li key={p.nilai}>
              <button
                type="button"
                onClick={() => togol(p.nilai)}
                aria-pressed={aktif}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  aktif
                    ? "border-navy-700 bg-navy-700 text-white"
                    : "border-garis text-slate-600 hover:border-navy-700"
                }`}
              >
                {p.label}
              </button>
            </li>
          );
        })}
        {papar.length === 0 && (
          <li className="py-1 text-xs text-slate-400">Tiada yang sepadan.</li>
        )}
      </ul>
    </div>
  );
}


/**
 * Apa yang AKAN berlaku — dibaca sebelum apa-apa ditulis.
 *
 * Taburan per tahun ialah semakan mata kasar yang paling berkesan: guru yang
 * tahu sekolahnya ada kira-kira 120 murid setiap tahun akan nampak "Tahun 4:
 * 12" dalam sesaat, sedangkan mereka tidak akan pernah membaca 700 nama.
 */
function SemakanNaik({ rancangan, gerak, tahunSesi }: {
  rancangan: RancanganNaik;
  gerak: { label: string; bil: number }[];
  tahunSesi: number;
}) {
  return (
    <div className="mt-3 rounded-xl border border-garis bg-navy-50/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
Semakan · sesi {tahunSesi} → {tahunSesi + 1}
      </p>

      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <span><b className="text-navy-800">{rancangan.naik.length}</b> naik</span>
        <span><b className="text-navy-800">{rancangan.tamat.length}</b> tamat (Tahun 6)</span>
        {rancangan.sudahAda.length > 0 && (
          <span><b className="text-navy-800">{rancangan.sudahAda.length}</b> dilangkau</span>
        )}
        {rancangan.ditolak.length > 0 && (
          <span className="text-[#8f2b2b]"><b>{rancangan.ditolak.length}</b> ditolak</span>
        )}
      </div>

      {rancangan.taburan.length > 0 && (
        <p className="mt-2 text-xs text-slate-600">
          Selepas naik:{" "}
          {rancangan.taburan.map((t) => `Tahun ${t.tahun}: ${t.bil}`).join(" · ")}
        </p>
      )}

      {rancangan.amaran.length > 0 && (
        <ul className="mt-2 space-y-1">
          {rancangan.amaran.map((a, i) => (
            <li key={i} className="text-xs leading-relaxed text-[#7a5a12]">⚠ {a}</li>
          ))}
        </ul>
      )}

      {rancangan.ditolak.length > 0 && (
        <ul className="mt-2 max-h-32 space-y-0.5 overflow-auto text-xs text-[#8f2b2b]">
          {rancangan.ditolak.slice(0, 40).map((d, i) => (
            <li key={i}>{d.murid_id} — {d.sebab}</li>
          ))}
        </ul>
      )}

      {gerak.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-500">
            Pergerakan setiap kelas ({gerak.length})
          </summary>
          <ul className="mt-1 max-h-48 space-y-0.5 overflow-auto text-xs text-slate-600">
            {gerak.map((g) => <li key={g.label}>{g.label} · {g.bil} murid</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}


/**
 * SEMAK & BETULKAN MURID.
 *
 * Nama tersalah eja dan No. KP tersalah taip berlaku pada setiap import,
 * kerana sumbernya ialah senarai yang ditaip manusia. Tanpa skrin ini,
 * jalan keluar satu-satunya ialah memadam kelas dan mengimport semula — dan
 * itu memusnahkan nilai PBD yang guru sudah isi.
 *
 * Tindakan duduk di sebalik menu tiga titik, bukan butang berderet: pada
 * telefon, dua butang di hujung baris memicit nama murid sehingga terpotong.
 */
function SemakMurid({ senaraiKelas }: {
  senaraiKelas: { tahun: number; kelas: string; bil?: number }[];
}) {
  const [kelas, setKelas] = useState("");
  const [murid, setMurid] = useState<MuridRingkas[] | null>(null);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [sunting, setSunting] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [noKp, setNoKp] = useState("");
  const [sahBuang, setSahBuang] = useState<string | null>(null);
  const [pindah, setPindah] = useState<string | null>(null);
  const [cari, setCari] = useState("");

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

  const pecah = (v: string) => {
    const [t, ...k] = v.split(" ");
    return { tahun: Number(t), kelas: k.join(" ") };
  };

  async function muat(v: string) {
    setKelas(v);
    setMurid(null);
    setNota(null);
    if (!v) return;
    setSibuk(true);
    try {
      const { tahun, kelas: k } = pecah(v);
      const r = await muridKelasTindakan(tahun, k);
      setNota({ ok: r.ok, teks: r.mesej });
      setMurid(r.murid ?? null);
    } finally {
      setSibuk(false);
    }
  }

  async function simpan(m: MuridRingkas) {
    setSibuk(true);
    try {
      const r = await suntingMuridTindakan(m.murid_id, nama, noKp);
      setNota({ ok: r.ok, teks: r.mesej });
      if (!r.ok) return;
      setMurid((l) =>
        (l ?? []).map((x) =>
          x.murid_id === m.murid_id
            ? { ...x, nama: nama.trim().toUpperCase(), no_kp: noKp.replace(/\D/g, "") || null }
            : x,
        ),
      );
      setSunting(null);
    } finally {
      setSibuk(false);
    }
  }

  async function buang(m: MuridRingkas) {
    setSibuk(true);
    try {
      const r = await buangMuridTindakan(m.pendaftaran_id);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) setMurid((l) => (l ?? []).filter((x) => x.pendaftaran_id !== m.pendaftaran_id));
      setSahBuang(null);
    } finally {
      setSibuk(false);
    }
  }

  async function pindahkan(m: MuridRingkas, v: string) {
    setSibuk(true);
    try {
      const { tahun, kelas: k } = pecah(v);
      const r = await tukarKelasTindakan(m.pendaftaran_id, tahun, k);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) setMurid((l) => (l ?? []).filter((x) => x.pendaftaran_id !== m.pendaftaran_id));
      setPindah(null);
    } finally {
      setSibuk(false);
    }
  }

  const papar = (murid ?? []).filter((m) => {
    const t = cari.trim().toLowerCase();
    if (!t) return true;
    return m.nama.toLowerCase().includes(t) || (m.no_kp ?? "").includes(t);
  });

  if (senaraiKelas.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-base font-bold text-navy-800">Betulkan murid</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Nama tersalah eja, No. KP tersalah taip, murid yang masuk kelas yang
        salah. Betulkan di sini — tidak perlu memadam kelas dan mengimport
        semula, yang akan memusnahkan nilai PBD yang sudah diisi.
      </p>

      <div className="mt-3 rounded-xl border border-garis bg-white p-4">
        <div className="max-w-sm">
          <PilihCari
            id="kelas-semak"
            label="Kelas"
            pilihan={senaraiKelas.map((k) => ({
              nilai: `${k.tahun} ${k.kelas}`,
              label: `${k.tahun} ${k.kelas}`,
              nota: k.bil ? `${k.bil} murid` : undefined,
            }))}
            nilai={kelas}
            tukar={(v) => void muat(v)}
            placeholder="Cari kelas…"
          />
        </div>

        {nota && <div className="mt-3"><Mesej ok={nota.ok} teks={nota.teks} /></div>}

        {murid && murid.length > 0 && (
          <>
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama atau No. KP…"
              aria-label="Cari murid"
              className="mt-3 w-full max-w-xs rounded-lg border border-garis px-3 py-1.5 text-xs"
            />

            <ul className="mt-2 divide-y divide-garis border-t border-garis">
              {papar.map((m, i) => (
                <li key={m.pendaftaran_id} className="py-2">
                  <div className="flex items-start gap-2">
                    <span className="w-6 shrink-0 pt-0.5 text-xs text-slate-400">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-navy-800">{m.nama}</span>
                      <span className="mt-0.5 block font-mono text-xs text-slate-400">
                        {m.no_kp ?? "tiada No. KP"}
                      </span>
                    </span>

                    <span data-menu className="relative shrink-0">
                      <button
                        onClick={() => setMenu((x) => (x === m.pendaftaran_id ? null : m.pendaftaran_id))}
                        aria-label={`Tindakan untuk ${m.nama}`}
                        aria-haspopup="menu"
                        aria-expanded={menu === m.pendaftaran_id}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-garis text-slate-500 hover:border-navy-700 hover:text-navy-700"
                      >
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="currentColor">
                          <circle cx="8" cy="3" r="1.4" />
                          <circle cx="8" cy="8" r="1.4" />
                          <circle cx="8" cy="13" r="1.4" />
                        </svg>
                      </button>

                      {menu === m.pendaftaran_id && (
                        <span
                          role="menu"
                            className="absolute right-0 top-full z-20 mt-1 flex w-44 flex-col overflow-hidden rounded-xl border border-garis bg-white py-1 shadow-lg"
                        >
                          <button
                            role="menuitem"
                            onClick={() => {
                              setSunting(m.pendaftaran_id);
                              setNama(m.nama); setNoKp(m.no_kp ?? "");
                              setMenu(null);
                            }}
                            className="px-3 py-2 text-left text-xs text-navy-800 hover:bg-navy-50"
                          >
                            Sunting nama &amp; No. KP
                          </button>
                          <button
                            role="menuitem"
                            onClick={() => { setPindah(m.pendaftaran_id); setMenu(null); }}
                            className="px-3 py-2 text-left text-xs text-navy-800 hover:bg-navy-50"
                          >
                            Pindah kelas
                          </button>
                          <button
                            role="menuitem"
                            onClick={() => { setSahBuang(m.pendaftaran_id); setMenu(null); }}
                            className="px-3 py-2 text-left text-xs text-[#8f2b2b] hover:bg-[#fdf1f1]"
                          >
                            Keluarkan dari kelas
                          </button>
                        </span>
                      )}
                    </span>
                  </div>

                  {sunting === m.pendaftaran_id && (
                    <div className="mt-2 rounded-lg border border-navy-700/30 bg-navy-50/40 p-3">
                      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                        <input
                          value={nama} onChange={(e) => setNama(e.target.value)}
                          aria-label="Nama murid"
                          className="min-w-0 rounded-lg border border-garis px-3 py-2 text-sm"
                        />
                        <input
                          value={noKp} onChange={(e) => setNoKp(e.target.value)}
                          inputMode="numeric" aria-label="No. KP"
                          placeholder="12 digit"
                          className="min-w-0 rounded-lg border border-garis px-3 py-2 font-mono text-sm"
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => void simpan(m)}
                          disabled={sibuk || nama.trim().length < 3}
                          className="rounded-lg bg-navy-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                        >
                          {sibuk ? "…" : "Simpan"}
                        </button>
                        <button onClick={() => setSunting(null)} className="text-xs text-slate-500 underline">
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  {pindah === m.pendaftaran_id && (
                    <div className="mt-2 max-w-xs rounded-lg border border-navy-700/30 bg-navy-50/40 p-3">
                      <PilihCari
                        id={`pindah-${m.pendaftaran_id}`}
                        label={`Pindahkan ${m.nama} ke`}
                        pilihan={senaraiKelas
                          .filter((k) => `${k.tahun} ${k.kelas}` !== kelas)
                          .map((k) => ({ nilai: `${k.tahun} ${k.kelas}`, label: `${k.tahun} ${k.kelas}` }))}
                        nilai=""
                        tukar={(v) => void pindahkan(m, v)}
                        placeholder="Cari kelas…"
                      />
                      <button onClick={() => setPindah(null)} className="mt-2 text-xs text-slate-500 underline">
                        Batal
                      </button>
                    </div>
                  )}

                  {sahBuang === m.pendaftaran_id && (
                    <p className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[#fdf1f1] p-2.5 text-xs text-[#8f2b2b]">
                      <span className="min-w-0 flex-1">
                        Keluarkan <b>{m.nama}</b> dari kelas ini? Rekod muridnya kekal
                        — hanya pendaftaran kelas ini dibuang.
                      </span>
                      <button
                        onClick={() => void buang(m)}
                        disabled={sibuk}
                        className="shrink-0 rounded-lg bg-[#8f2b2b] px-3 py-1.5 font-bold text-white disabled:opacity-50"
                      >
                        Ya, keluarkan
                      </button>
                      <button onClick={() => setSahBuang(null)} className="shrink-0 underline">
                        Batal
                      </button>
                    </p>
                  )}
                </li>
              ))}
              {papar.length === 0 && (
                <li className="py-3 text-sm text-slate-400">Tiada murid sepadan.</li>
              )}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
