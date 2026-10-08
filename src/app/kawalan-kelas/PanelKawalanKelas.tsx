"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  hantarKawalanKelas, padamKawalanKelas, suntingKawalanKelas,
  type BarisKawalanKelas,
} from "@/lib/kawalan-kelas";
import { padamKehadiranMurid, type LogKehadiranMurid } from "@/lib/kehadiran-murid";
import { cartaKehadiranHarian } from "@/lib/kawalan-kelas-carta";
import PilihCari from "@/components/PilihCari";
import { SUBJEK } from "@/data/subjek";
import CetakLaporan from "@/components/CetakLaporan";
import CetakKawalanBilikDarjah, { barisDariWaktu } from "@/components/CetakKawalanBilikDarjah";
import { setUntukKelas, NAMA_HARI, HARI, type Jadual } from "@/data/jadual-jenis";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import PanelKehadiranMurid from "./PanelKehadiranMurid";

export default function PanelKawalanKelas({
  tahunSesi, kelas, namaGuruKelas, namaGuru, jadual, senarai, senaraiKehadiran, tarikhAwal,
}: {
  tahunSesi: number;
  kelas: string[];
  namaGuruKelas: Record<string, string>;
  /** Nama guru untuk senarai pilihan — elak nama yang sama dieja empat cara. */
  namaGuru: string[];
  /** Untuk waktu kelas pada Borang Kawalan Bilik Darjah. Null = belum ada. */
  jadual: Jadual | null;
  senarai: BarisKawalanKelas[];
  /**
   * Hari Kehadiran Murid yang SUDAH DISAHKAN — digabung ke Log Terkini
   * sekali (permintaan pengguna 2 Okt 2026: "ia kena sentiasa tally").
   * Jadual DB berasingan sepenuhnya daripada `senarai` (pbd_kawalan_kelas);
   * lihat senaraiKehadiranMuridLog() untuk kenapa.
   */
  senaraiKehadiran: LogKehadiranMurid[];
  tarikhAwal: string;
}) {
  const router = useRouter();
  const [kelasPilih, setKelasPilih] = useState(kelas[0] ?? "");
  const [tarikh, setTarikh] = useState(tarikhAwal);
  const [subjek, setSubjek] = useState("");
  const [masaMasuk, setMasaMasuk] = useState("");
  const [relief, setRelief] = useState(false);
  const [reliefUntuk, setReliefUntuk] = useState("");
  const [masalah, setMasalah] = useState("");
  const [bilHadir, setBilHadir] = useState("");
  const [bilMurid, setBilMurid] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);
  /** Kad log yang sedang disunting/dipadam, dan rekod mana di dalamnya yang dipilih. */
  const [tindakan, setTindakan] = useState<{ kunci: string; mod: "sunting" | "padam"; tab: TabLog; pilih: string } | null>(null);
  /** Kunci kad log yang menunya sedang terbuka — satu sahaja pada satu masa. */
  const [menuBuka, setMenuBuka] = useState<string | null>(null);
  /** Nota bagi tindakan dari Log Terkini — dipapar DI SITU, bukan di borang atas yang di luar skrin. */
  const [notaLog, setNotaLog] = useState<{ ok: boolean; teks: string } | null>(null);
  /** Dinaikkan selepas padam, supaya panel Kehadiran Murid memuat semula hari yang sama. */
  const [versiKehadiran, setVersiKehadiran] = useState(0);

  const carta = useMemo(() => cartaKehadiranHarian(senarai, kelasPilih), [senarai, kelasPilih]);

  /**
   * Log Terkini — SATU KAD "REKOD KELAS" bagi setiap kelas + tarikh
   * (permintaan pengguna 8 Okt 2026). Kad itu membawa SEMUA guru yang masuk
   * kelas hari itu DAN kehadiran muridnya, supaya kedua-duanya "sentiasa
   * tally" (2 Okt 2026) pada satu tempat. Dahulu setiap rekod ialah kad
   * sendiri dan hanya kehadiran yang berlabel.
   *
   * Dua jadual DB kekal berasingan (lihat senaraiKehadiranMuridLog());
   * ia dikumpulkan di sini untuk paparan sahaja.
   */
  const logKelas = useMemo<KumpulanLog[]>(() => {
    const peta = new Map<string, KumpulanLog>();
    const ambil = (kelas: string, tarikh: string) => {
      const kunci = `${tarikh}|${kelas}`;
      let k = peta.get(kunci);
      if (!k) { k = { kunci, kelas, tarikh, masuk: [], kehadiran: null }; peta.set(kunci, k); }
      return k;
    };
    for (const b of senarai) ambil(b.kelas, b.tarikh).masuk.push(b);
    for (const h of senaraiKehadiran) ambil(h.kelas, h.tarikh).kehadiran = h;
    for (const k of peta.values()) k.masuk.sort((a, b) => (a.masa_masuk ?? "99").localeCompare(b.masa_masuk ?? "99") || a.dicipta.localeCompare(b.dicipta));
    return [...peta.values()].sort((x, y) => y.tarikh.localeCompare(x.tarikh) || x.kelas.localeCompare(y.kelas, "ms", { numeric: true }));
  }, [senarai, senaraiKehadiran]);

  /**
   * BORANG KAWALAN BILIK DARJAH — tiruan borang kertas sekolah.
   *
   * Waktu diambil daripada set kelas itu sendiri, bukan disenaraikan tetap:
   * sesi pagi ada 11 waktu, sesi petang 10, dan rehatnya pada waktu berbeza
   * mengikut tahun. Borang yang memaksa satu susunan akan salah untuk
   * separuh sekolah.
   */
  const borang = useMemo(() => {
    const set = jadual ? setUntukKelas(jadual, kelasPilih) : null;
    const rekod = senarai.filter((b) => b.kelas === kelasPilih && b.tarikh === tarikh);
    const hadir = rekod.find((r) => r.bil_murid !== null);
    const hariMY = HARI[(new Date(`${tarikh}T00:00:00`).getDay() + 6) % 7] ?? null;
    return {
      baris: set ? barisDariWaktu(set.senarai, rekod) : [],
      hari: hariMY ? NAMA_HARI[hariMY] : "",
      hadirJumlah: hadir?.bil_hadir ?? null,
      muridJumlah: hadir?.bil_murid ?? null,
    };
  }, [jadual, kelasPilih, tarikh, senarai]);

  async function hantar() {
    try {
      setSibuk(true);
      setNota(null);
      const input = {
        tahun_sesi: tahunSesi, tarikh, kelas: kelasPilih, subjek,
        masa_masuk: masaMasuk, relief, guru_relief_untuk: reliefUntuk,
        masalah_disiplin: masalah,
        bil_hadir: bilHadir ? Number(bilHadir) : undefined,
        bil_murid: bilMurid ? Number(bilMurid) : undefined,
      };
      const r = await hantarKawalanKelas(input);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setSubjek(""); setMasaMasuk(""); setRelief(false); setReliefUntuk("");
        setMasalah(""); setBilHadir(""); setBilMurid(""); router.refresh();
      }
      setSibuk(false);
    } catch {
      setNota({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  async function padam(b: BarisKawalanKelas) {
    if (!window.confirm(`Padam rekod ${b.subjek} untuk ${b.kelas}?`)) return;
    try {
      setSibuk(true); setNotaLog(null);
      const r = await padamKawalanKelas(b.id);
      setNotaLog({ ok: r.ok, teks: r.mesej });
      if (r.ok) { setTindakan(null); router.refresh(); }
      setSibuk(false);
    } catch {
      setNotaLog({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  async function padamKehadiran(h: LogKehadiranMurid) {
    const tarikhMY = new Date(h.tarikh).toLocaleDateString("ms-MY");
    if (!window.confirm(`Padam rekod kehadiran ${h.kelas} pada ${tarikhMY}? Tindakan ini tidak boleh dipatah balik.`)) return;
    try {
      setSibuk(true); setNotaLog(null);
      const r = await padamKehadiranMurid(h.tarikh, h.kelas);
      setNotaLog({ ok: r.ok, teks: r.ok ? `Rekod kehadiran ${h.kelas} pada ${tarikhMY} dipadam.` : r.mesej });
      if (r.ok) { setTindakan(null); setVersiKehadiran((v) => v + 1); router.refresh(); }
    } catch {
      setNotaLog({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mt-6 space-y-10">
      <section className="rounded-xl border border-garis bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-navy-800">Rekod Masuk Kelas</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Medan label="Tarikh">
            <input type="date" value={tarikh} onChange={(e) => setTarikh(e.target.value)}
              className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
          </Medan>
          <Medan label="Kelas">
            <PilihCari id="kawalan-kelas" label="Kelas" sembunyiLabel nilai={kelasPilih} tukar={setKelasPilih} placeholder="Taip kelas, cth: 4 bes" pilihan={kelas.map((k) => ({ nilai: k, label: k }))} />
            {namaGuruKelas[kelasPilih] && (
              <p className="mt-1 text-xs text-slate-500">Guru kelas semasa: {namaGuruKelas[kelasPilih]}</p>
            )}
          </Medan>
          <Medan label="Subjek">
            {/* SENARAI PILIHAN, seperti nama guru. Subjek yang ditaip bebas
                menghasilkan "BM", "B.M.", "Bahasa Melayu" untuk perkara yang
                sama, dan Borang Kawalan Bilik Darjah yang dicetak daripadanya
                kelihatan tidak kemas. Taipan bebas masih diterima untuk
                aktiviti yang bukan mata pelajaran. */}
            <PilihCari
              id="kawalan-subjek" label="Mata pelajaran" sembunyiLabel
              nilai={subjek} tukar={setSubjek}
              placeholder="Taip mata pelajaran…"
              pilihan={SUBJEK.map((x) => ({ nilai: x.nama, label: x.nama, nota: x.kod }))}
            />
          </Medan>
          <Medan label="Masa Masuk">
            <input type="time" value={masaMasuk} onChange={(e) => setMasaMasuk(e.target.value)}
              className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
          </Medan>
          <Medan label="Bilangan Hadir">
            <input type="number" min={0} value={bilHadir} onChange={(e) => setBilHadir(e.target.value)}
              className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
          </Medan>
          <Medan label="Jumlah Murid Kelas">
            <input type="number" min={0} value={bilMurid} onChange={(e) => setBilMurid(e.target.value)}
              className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
          </Medan>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={relief} onChange={(e) => setRelief(e.target.checked)} />
          Ganti/Relief guru yang tidak hadir
        </label>
        {relief && (
          <div className="mt-2">
            {/* SENARAI PILIHAN, BUKAN TEKS BEBAS.
                Sebagai medan bebas, nama yang sama ditulis empat cara —
                "Hamidi", "En. Hamidi", "HAMIDI B." — dan laporan relief tidak
                boleh dijumlahkan. Kalau nama tiada dalam senarai (guru baharu
                belum diluluskan akses), taipan bebas masih diterima. */}
            <PilihCari
              id="kawalan-relief" label="Ganti untuk guru"
              nilai={reliefUntuk} tukar={setReliefUntuk}
              placeholder="Taip nama guru…"
              pilihan={namaGuru.map((n) => ({ nilai: n, label: n }))}
            />
          </div>
        )}

        <div className="mt-4">
          <Medan label="Masalah Disiplin Dalam Kelas (jika ada)">
            <textarea value={masalah} onChange={(e) => setMasalah(e.target.value)} rows={2}
              className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
          </Medan>
        </div>

        {nota && <p className={`mt-3 text-sm ${nota.ok ? "text-[#167a4b]" : "text-red-600"}`}>{nota.teks}</p>}
        <button type="button" disabled={sibuk || !subjek.trim()} onClick={hantar}
          className="mt-4 min-h-11 touch-manipulation rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Simpan Rekod
        </button>
      </section>

      {kelasPilih && (
        <section id="kehadiran-murid" className="scroll-mt-4">
          <h2 className="text-lg font-bold text-navy-800">Kehadiran Murid — {kelasPilih}</h2>
          <div className="mt-4">
            <PanelKehadiranMurid key={`${kelasPilih}-${tarikh}-${versiKehadiran}`} kelas={kelasPilih} tarikh={tarikh} />
          </div>
        </section>
      )}

      {carta.length > 0 && (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-navy-800">Carta Kehadiran Harian — {kelasPilih}</h2>
            <button
              type="button"
              onClick={() => mulaCetak("kawalan-borang", "Borang Kawalan Bilik Darjah")}
              className="min-h-11 touch-manipulation rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Cetak Borang Kawalan Bilik Darjah
            </button>
            <button
              type="button"
              onClick={() => mulaCetak("kehadiran-cetak", "Rekod Kehadiran Harian")}
              className="min-h-11 touch-manipulation rounded-lg border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800"
            >
              Cetak rekod kehadiran
            </button>
          </div>

          {/* DUA BORANG, SATU PENERIMA.
              Kedua-duanya diserahkan kepada PK HEM (disahkan pengguna,
              25 Sep 2026) — tetapi ia kekal DUA dokumen kerana bentuknya
              berbeza: kehadiran ialah rekod SATU KELAS merentas hari,
              manakala kawalan kelas ialah log SEMUA kelas merentas guru.
              Menggabungkannya bermakna satu jadual yang tidak boleh
              disusun mengikut mana-mana satu daripadanya, dan difailkan
              di bawah dua tajuk yang berlainan.

              DELIMa memang ada rekod kehadiran, tetapi borangnya tidak kemas
              — itu sebab ia dibina di sini juga (pembetulan pengguna,
              25 Sep 2026; nota lama menyangka ia tidak perlu). */}
          <CetakKawalanBilikDarjah
            kelas={kelasPilih}
            hari={borang.hari}
            tarikh={new Date(`${tarikh}T00:00:00`).toLocaleDateString("ms-MY")}
            guruKelas={namaGuruKelas[kelasPilih] ?? ""}
            lelaki="" perempuan=""
            tidakHadir={
              borang.muridJumlah !== null && borang.hadirJumlah !== null
                ? String(Math.max(0, borang.muridJumlah - borang.hadirJumlah))
                : ""
            }
            jumlah={borang.muridJumlah !== null ? String(borang.muridJumlah) : ""}
            baris={borang.baris}
          />

          <CetakLaporan
            id="kehadiran-cetak"
            tajuk="Rekod Kehadiran Harian"
            subtajuk={`Kelas ${kelasPilih}`}
            maklumat={[
              { label: "Sesi", nilai: String(tahunSesi) },
              { label: "Guru Kelas", nilai: namaGuruKelas[kelasPilih] ?? "—" },
              { label: "Hari direkod", nilai: String(carta.length) },
            ]}
            lajur={[
              { tajuk: "Tarikh", lebar: "30mm", tengah: true },
              { tajuk: "Jumlah Murid", lebar: "28mm", tengah: true },
              { tajuk: "Hadir", lebar: "24mm", tengah: true },
              { tajuk: "Tidak Hadir", lebar: "26mm", tengah: true },
              { tajuk: "Peratus", lebar: "22mm", tengah: true },
            ]}
            baris={carta.map((c) => [
              new Date(c.tarikh).toLocaleDateString("ms-MY"),
              c.murid, c.hadir, Math.max(0, c.murid - c.hadir), `${c.peratus}%`,
            ])}
            nota="Bilangan hadir direkod oleh guru yang masuk kelas pada hari berkenaan."
            tandatangan={[
              { label: "Disediakan oleh", nama: namaGuruKelas[kelasPilih], jawatan: "Guru Kelas" },
              { label: "Disahkan oleh", jawatan: "Penolong Kanan HEM" },
            ]}
          />
          <div className="mt-3 space-y-1.5">
            {carta.map((c) => (
              <div key={c.tarikh} className="flex items-center gap-3 text-xs">
                <span className="w-24 shrink-0 text-slate-500">{new Date(c.tarikh).toLocaleDateString("ms-MY")}</span>
                <div className="h-3 flex-1 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-navy-700" style={{ width: `${c.peratus}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right text-slate-500">{c.hadir}/{c.murid} ({c.peratus}%)</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-garis pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-navy-800">Log Terkini ({logKelas.length})</h2>
          {senarai.length > 0 && (
            <button
              type="button"
              onClick={() => mulaCetak("kawalan-cetak", "Rekod Kawalan Kelas")}
              className="min-h-11 touch-manipulation rounded-lg border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800"
            >
              Cetak rekod kawalan kelas
            </button>
          )}
        </div>

        <CetakLaporan
          id="kawalan-cetak"
          kertas="landscape"
          tajuk="Rekod Kawalan Kelas"
          subtajuk={`Sesi ${tahunSesi}`}
          maklumat={[{ label: "Bilangan rekod", nilai: String(senarai.length) }]}
          lajur={[
            { tajuk: "Tarikh", lebar: "24mm", tengah: true },
            { tajuk: "Kelas", lebar: "24mm", tengah: true },
            { tajuk: "Guru Masuk", lebar: "42mm" },
            { tajuk: "Subjek", lebar: "30mm" },
            { tajuk: "Masa", lebar: "18mm", tengah: true },
            { tajuk: "Relief", lebar: "34mm" },
            { tajuk: "Hadir", lebar: "18mm", tengah: true },
            { tajuk: "Masalah Disiplin" },
          ]}
          baris={senarai.map((b) => [
            new Date(b.tarikh).toLocaleDateString("ms-MY"),
            b.kelas,
            b.guru_nama,
            b.subjek,
            b.masa_masuk ?? "—",
            b.relief ? `Ganti ${b.guru_relief_untuk ?? ""}`.trim() : "—",
            b.bil_murid ? `${b.bil_hadir ?? 0}/${b.bil_murid}` : "—",
            b.masalah_disiplin ?? "",
          ])}
          nota="Lajur Relief menunjukkan guru yang digantikan. Rekod ini melengkapkan Rekod Kehadiran Harian, bukan menggantikannya."
          tandatangan={[
            { label: "Disediakan oleh" },
            { label: "Disahkan oleh", jawatan: "Penolong Kanan HEM" },
          ]}
        />
        {logKelas.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
            Belum ada rekod. Rekod pertama anda akan muncul di sini sebaik dihantar/disahkan.
          </p>
        )}
        {notaLog && <p role="status" className={`mt-3 text-sm ${notaLog.ok ? "text-[#167a4b]" : "text-red-600"}`}>{notaLog.teks}</p>}
        <ul className="mt-4 space-y-2">
          {logKelas.slice(0, 40).map((g) => {
            const tarikhMY = new Date(g.tarikh).toLocaleDateString("ms-MY");
            const milikSaya = g.masuk.filter((b) => b.boleh_urus);
            const namaRekod = (b: BarisKawalanKelas) => `${b.guru_nama} · ${b.subjek}${b.masa_masuk ? ` · ${b.masa_masuk.slice(0, 5)}` : ""}`;
            const aktif = tindakan?.kunci === g.kunci ? tindakan : null;
            const dipilih = aktif ? milikSaya.find((b) => b.id === aktif.pilih) ?? null : null;
            const bolehPadamApaApa = milikSaya.length > 0 || !!g.kehadiran?.bolehPadam;
            // Buka pada tab yang ADA isinya: rekod masuk jika ada milik pengguna, kalau tidak kehadiran.
            const buka = (mod: "sunting" | "padam") => {
              const tab: TabLog = milikSaya.length > 0 ? "masuk" : "kehadiran";
              setNotaLog(null);
              setTindakan({ kunci: g.kunci, mod, tab, pilih: milikSaya.length === 1 ? milikSaya[0].id : "" });
            };
            const tutup = () => { setTindakan(null); setVersiKehadiran((v) => v + 1); router.refresh(); };
            return (
              <li key={g.kunci} className="rounded-lg border border-garis bg-white py-1.5 pl-3 pr-1 text-xs">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 py-1.5">
                    <p>
                      <span className="rounded bg-navy-800 px-1.5 py-0.5 text-[10px] font-bold text-white">REKOD KELAS</span>{" "}
                      <span className="font-semibold text-navy-800">{g.kelas}</span> · {tarikhMY} ·{" "}
                      {g.masuk.length === 0 ? "tiada rekod masuk kelas" : `${g.masuk.length} rekod masuk kelas`}
                    </p>
                    {g.masuk.length > 0 && (
                      <ul className="mt-1.5 space-y-1 text-slate-600">
                        {g.masuk.map((b) => (
                          <li key={b.id}>
                            {namaRekod(b)}
                            {b.relief && <span className="ml-1 rounded bg-[#fdf3dc] px-1.5 py-0.5 text-[10px] font-bold text-[#9a6b06]">RELIEF</span>}
                            {b.masalah_disiplin && <span className="block text-slate-500">⚠ {b.masalah_disiplin}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-1.5 text-slate-600">
                      <span className="font-semibold text-navy-800">Kehadiran:</span>{" "}
                      {!g.kehadiran ? "belum diisi" : (
                        <>
                          {g.kehadiran.bilTidakHadir === 0 ? "semua hadir" : `${g.kehadiran.bilTidakHadir} murid tidak hadir`} ·{" "}
                          {g.kehadiran.draf ? "diisi oleh" : "disahkan oleh"} {g.kehadiran.disahkanOleh ?? "—"}
                          {g.kehadiran.draf && <span className="ml-1 rounded bg-[#fdf3dc] px-1.5 py-0.5 text-[10px] font-bold text-[#7a5a12]">DRAF · BELUM DISAHKAN</span>}
                        </>
                      )}
                    </p>
                  </div>
                  <MenuTitik
                    label={`Tindakan untuk rekod kelas ${g.kelas} ${tarikhMY}`}
                    buka={menuBuka === g.kunci} sibuk={sibuk}
                    tukar={(b) => setMenuBuka(b ? g.kunci : null)}
                    sunting={() => buka("sunting")}
                    padam={bolehPadamApaApa ? () => buka("padam") : undefined}
                  />
                </div>

                {aktif && (
                  <div className="mb-1.5 mr-2 mt-1">
                    {/* TAB BERBENTUK KAD: tab aktif tiada garis bawah, jadi ia
                        bersambung dengan panel di bawahnya seperti fail berlabel.
                        Menggantikan senarai juntai — satu tekan, bukan dua
                        (permintaan pengguna 8 Okt 2026). */}
                    <div className="flex items-end gap-1">
                      <div role="tablist" aria-label={`${aktif.mod === "padam" ? "Padam" : "Sunting"} rekod kelas ${g.kelas} ${tarikhMY}`} className="flex min-w-0 flex-1 gap-1">
                        {([["masuk", "Rekod Masuk"], ["kehadiran", "Kehadiran"]] as const).map(([tab, nama]) => {
                          const terpilih = aktif.tab === tab;
                          return (
                            <button key={tab} type="button" role="tab" aria-selected={terpilih}
                              id={`tab-${g.kunci}-${tab}`} aria-controls={`panel-${g.kunci}`}
                              onClick={() => setTindakan({ ...aktif, tab })}
                              className={`relative min-h-11 touch-manipulation rounded-t-lg border px-4 text-sm font-semibold ${
                                terpilih
                                  ? "z-10 -mb-px border-garis border-b-white bg-white text-navy-800"
                                  : "border-transparent text-slate-500 hover:text-navy-800"
                              }`}>
                              {nama}
                              {tab === "masuk" && g.masuk.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-500">{g.masuk.length}</span>}
                            </button>
                          );
                        })}
                      </div>
                      <button type="button" onClick={tutup} aria-label="Tutup"
                        className="mb-1 grid h-9 w-9 shrink-0 touch-manipulation place-items-center rounded-lg text-slate-500 hover:bg-navy-50 hover:text-navy-800">
                        <svg aria-hidden="true" viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 1l12 12M13 1L1 13" /></svg>
                      </button>
                    </div>

                    <div role="tabpanel" id={`panel-${g.kunci}`} aria-labelledby={`tab-${g.kunci}-${aktif.tab}`}
                      className={`rounded-b-lg rounded-tr-lg border border-garis bg-white p-3 ${aktif.tab === "masuk" ? "" : "rounded-tl-lg"}`}>
                      {aktif.tab === "kehadiran" ? (
                        aktif.mod === "sunting" ? (
                          <PanelKehadiranMurid key={`log-${g.kunci}`} kelas={g.kelas} tarikh={g.tarikh} />
                        ) : !g.kehadiran ? (
                          <p className="text-sm text-slate-500">Kehadiran hari ini belum diisi — tiada apa untuk dipadam.</p>
                        ) : !g.kehadiran.bolehPadam ? (
                          <p className="text-sm text-slate-500">Hanya pentadbir boleh memadam rekod kehadiran.</p>
                        ) : (
                          <>
                            <p className="text-sm text-slate-600">
                              Kehadiran {g.kelas} pada {tarikhMY}: {g.kehadiran.bilTidakHadir === 0 ? "semua hadir" : `${g.kehadiran.bilTidakHadir} murid tidak hadir`}.
                            </p>
                            <button type="button" disabled={sibuk} onClick={() => void padamKehadiran(g.kehadiran!)}
                              className="mt-3 min-h-11 w-full touch-manipulation rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
                              Padam kehadiran hari ini
                            </button>
                          </>
                        )
                      ) : milikSaya.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          {g.masuk.length === 0 ? "Belum ada rekod masuk kelas untuk hari ini." : "Rekod masuk kelas hanya boleh diubah oleh guru yang mengisinya atau pentadbir."}
                        </p>
                      ) : (
                        <>
                          {/* Beberapa guru masuk kelas yang sama: pilih dengan
                              satu tekan. Satu rekod sahaja = terus dibuka. */}
                          {milikSaya.length > 1 && (
                            <div className="flex flex-wrap gap-2" role="group" aria-label="Guru yang masuk kelas">
                              {milikSaya.map((b) => (
                                <button key={b.id} type="button" aria-pressed={aktif.pilih === b.id}
                                  onClick={() => setTindakan({ ...aktif, pilih: b.id })}
                                  className={`min-h-11 touch-manipulation rounded-lg border px-3 text-left text-xs font-semibold ${
                                    aktif.pilih === b.id ? "border-navy-800 bg-navy-800 text-white" : "border-garis bg-white text-navy-800 hover:bg-navy-50"
                                  }`}>
                                  {namaRekod(b)}
                                </button>
                              ))}
                            </div>
                          )}
                          {!dipilih ? (
                            <p className="mt-3 text-sm text-slate-500">Pilih guru di atas.</p>
                          ) : aktif.mod === "padam" ? (
                            <>
                              <p className={`text-sm text-slate-600 ${milikSaya.length > 1 ? "mt-3" : ""}`}>{namaRekod(dipilih)}</p>
                              <button type="button" disabled={sibuk} onClick={() => void padam(dipilih)}
                                className="mt-3 min-h-11 w-full touch-manipulation rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
                                Padam rekod ini
                              </button>
                            </>
                          ) : (
                            <SuntingRekodMasuk
                              key={dipilih.id} baris={dipilih} tahunSesi={tahunSesi} kelas={kelas} namaGuru={namaGuru}
                              siap={(mesej) => { setNotaLog({ ok: true, teks: mesej }); setTindakan(null); router.refresh(); }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Medan({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="mb-1 block font-semibold text-navy-800">{label}</span>
      {children}
    </label>
  );
}

/** Dua tab dalam kad log: rekod masuk kelas dahulu, kehadiran murid kedua. */
type TabLog = "masuk" | "kehadiran";

/** Satu kad Log Terkini: semua rekod masuk kelas + kehadiran bagi SATU kelas pada SATU tarikh. */
interface KumpulanLog {
  kunci: string; kelas: string; tarikh: string;
  masuk: BarisKawalanKelas[];
  kehadiran: LogKehadiranMurid | null;
}

/**
 * Sunting SATU rekod masuk kelas, di dalam kad lognya sendiri.
 *
 * Dahulu Sunting memuatkan rekod ke borang "Rekod Masuk Kelas" di ATAS
 * halaman dan menatal ke sana — pentadbir hilang tempat dalam log. Kini
 * borang kecil ini terbuka di bawah kad, dengan keadaannya sendiri, dan
 * borang atas kekal untuk rekod BAHARU sahaja.
 */
function SuntingRekodMasuk({ baris, tahunSesi, kelas, namaGuru, siap }: {
  baris: BarisKawalanKelas; tahunSesi: number; kelas: string[]; namaGuru: string[];
  siap: (mesej: string) => void;
}) {
  const [tarikh, setTarikh] = useState(baris.tarikh);
  const [kelasPilih, setKelasPilih] = useState(baris.kelas);
  const [subjek, setSubjek] = useState(baris.subjek);
  const [masaMasuk, setMasaMasuk] = useState(baris.masa_masuk?.slice(0, 5) ?? "");
  const [relief, setRelief] = useState(baris.relief);
  const [reliefUntuk, setReliefUntuk] = useState(baris.guru_relief_untuk ?? "");
  const [masalah, setMasalah] = useState(baris.masalah_disiplin ?? "");
  const [bilHadir, setBilHadir] = useState(baris.bil_hadir == null ? "" : String(baris.bil_hadir));
  const [bilMurid, setBilMurid] = useState(baris.bil_murid == null ? "" : String(baris.bil_murid));
  const [sibuk, setSibuk] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const medan = "block w-full min-w-0 max-w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm";

  async function simpan() {
    try {
      setSibuk(true); setRalat(null);
      const r = await suntingKawalanKelas(baris.id, {
        tahun_sesi: tahunSesi, tarikh, kelas: kelasPilih, subjek,
        masa_masuk: masaMasuk, relief, guru_relief_untuk: reliefUntuk, masalah_disiplin: masalah,
        bil_hadir: bilHadir ? Number(bilHadir) : undefined,
        bil_murid: bilMurid ? Number(bilMurid) : undefined,
      });
      if (r.ok) siap(r.mesej); else setRalat(r.mesej);
    } catch {
      setRalat("Sambungan terputus atau pelayan tidak menjawab. Cuba lagi.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-navy-800">Guru masuk: {baris.guru_nama}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Medan label="Tarikh">
          <input type="date" value={tarikh} onChange={(e) => setTarikh(e.target.value)} className={medan} />
        </Medan>
        <Medan label="Kelas">
          <PilihCari id={`sunting-kelas-${baris.id}`} label="Kelas" sembunyiLabel nilai={kelasPilih} tukar={setKelasPilih} placeholder="Taip kelas, cth: 4 bes" pilihan={kelas.map((k) => ({ nilai: k, label: k }))} />
        </Medan>
        <Medan label="Subjek">
          <PilihCari id={`sunting-subjek-${baris.id}`} label="Mata pelajaran" sembunyiLabel nilai={subjek} tukar={setSubjek} placeholder="Taip mata pelajaran…" pilihan={SUBJEK.map((x) => ({ nilai: x.nama, label: x.nama, nota: x.kod }))} />
        </Medan>
        <Medan label="Masa Masuk">
          <input type="time" value={masaMasuk} onChange={(e) => setMasaMasuk(e.target.value)} className={medan} />
        </Medan>
        <Medan label="Bilangan Hadir">
          <input type="number" min={0} value={bilHadir} onChange={(e) => setBilHadir(e.target.value)} className={medan} />
        </Medan>
        <Medan label="Jumlah Murid Kelas">
          <input type="number" min={0} value={bilMurid} onChange={(e) => setBilMurid(e.target.value)} className={medan} />
        </Medan>
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={relief} onChange={(e) => setRelief(e.target.checked)} />
        Ganti/Relief guru yang tidak hadir
      </label>
      {relief && (
        <PilihCari id={`sunting-relief-${baris.id}`} label="Ganti untuk guru" nilai={reliefUntuk} tukar={setReliefUntuk} placeholder="Taip nama guru…" pilihan={namaGuru.map((n) => ({ nilai: n, label: n }))} />
      )}
      <div className="mt-3">
        <Medan label="Masalah Disiplin Dalam Kelas (jika ada)">
          <textarea value={masalah} onChange={(e) => setMasalah(e.target.value)} rows={2} className={medan} />
        </Medan>
      </div>
      {ralat && <p role="alert" className="mt-3 text-sm text-red-600">{ralat}</p>}
      <button type="button" disabled={sibuk || !subjek.trim()} onClick={simpan}
        className="mt-3 min-h-11 w-full touch-manipulation rounded-lg bg-navy-800 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
        {sibuk ? "Menyimpan…" : "Simpan Perubahan"}
      </button>
    </div>
  );
}

/**
 * MENU TIGA TITIK pada hujung kad log — Sunting dan Padam.
 *
 * Sebelum ini memadam rekod kehadiran memerlukan pentadbir mengisi semula
 * tarikh dan kelas di borang atas hanya untuk MENCARI rekod itu (laporan
 * pengguna 8 Okt 2026). Tindakan kini duduk pada rekod itu sendiri.
 *
 * `padam` tiada = pengguna tidak dibenarkan memadam; butang itu tidak
 * dilukis. Pelayan tetap menyemak kuasa — ini hanya paparan.
 */
function MenuTitik({ label, buka, tukar, sunting, padam, sibuk }: {
  label: string; buka: boolean; tukar: (buka: boolean) => void;
  sunting: () => void; padam?: () => void; sibuk: boolean;
}) {
  useEffect(() => {
    if (!buka) return;
    const tutup = (e: KeyboardEvent) => { if (e.key === "Escape") tukar(false); };
    window.addEventListener("keydown", tutup);
    return () => window.removeEventListener("keydown", tutup);
  }, [buka, tukar]);

  return (
    <div className="relative shrink-0">
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={buka} disabled={sibuk}
        onClick={() => tukar(!buka)}
        className="grid h-11 w-11 touch-manipulation place-items-center rounded-lg text-navy-800 hover:bg-navy-50 disabled:opacity-50">
        <svg aria-hidden="true" viewBox="0 0 4 18" className="h-[18px] w-1 fill-current">
          <circle cx="2" cy="2" r="2" /><circle cx="2" cy="9" r="2" /><circle cx="2" cy="16" r="2" />
        </svg>
      </button>
      {buka && (
        <>
          {/* Tekan di luar menutup menu, tanpa pendengar pada seluruh dokumen. */}
          <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => tukar(false)} className="fixed inset-0 z-10 cursor-default" />
          <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-garis bg-white py-1 shadow-lg">
            <button type="button" role="menuitem" onClick={() => { tukar(false); sunting(); }}
              className="block min-h-11 w-full touch-manipulation px-4 text-left text-sm font-semibold text-navy-800 hover:bg-navy-50">
              Sunting
            </button>
            {padam && (
              <button type="button" role="menuitem" onClick={() => { tukar(false); padam(); }}
                className="block min-h-11 w-full touch-manipulation px-4 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                Padam
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
