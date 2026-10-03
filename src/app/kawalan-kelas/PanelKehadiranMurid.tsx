"use client";

import { useEffect, useState } from "react";
import PilihCari from "@/components/PilihCari";
import {
  senaraiMuridKelas, statusKehadiran, simpanTidakHadir, sahkanKehadiran, padamKehadiranMurid,
  type MuridRoster, type TidakHadirMurid,
} from "@/lib/kehadiran-murid";
import { SENARAI_KATEGORI, sebabUntukKategori } from "@/data/sebab-tidak-hadir";

/**
 * Kehadiran murid satu-satu — di DALAM kad Kawalan Kelas (permintaan
 * pengguna 29 Sep 2026: "guna dari rekod kawalan kelas je", bukan
 * kad/laluan berasingan).
 *
 * Guru kelas tanda SIAPA tidak hadir + kategori/sebab, klik SAHKAN. Selepas
 * disahkan, `GET /api/kehadiran` (extension iSPEL) boleh menariknya —
 * lihat `src/app/api/kehadiran/route.ts` dan
 * `~/Projects/ispel-kehadiran/README.md` untuk sebelah sana jambatan ini.
 *
 * `key={`${kelas}-${tarikh}`}` pada pemanggil me-remount komponen ini bila
 * kelas/tarikh bertukar — mudah, tanpa perlu effect dependency yang rumit.
 */
export default function PanelKehadiranMurid({ kelas, tarikh }: { kelas: string; tarikh: string }) {
  const [memuat, setMemuat] = useState(true);
  const [roster, setRoster] = useState<MuridRoster[]>([]);
  const [belumSedia, setBelumSedia] = useState(false);
  const [bolehSahkan, setBolehSahkan] = useState(true);
  const [bolehPadam, setBolehPadam] = useState(false);
  const [disahkanPada, setDisahkanPada] = useState<string | null>(null);
  const [disahkanOleh, setDisahkanOleh] = useState<string | null>(null);
  const [draf, setDraf] = useState<{ murid_id: string; nama_murid: string; kategori: string; sebab: string }[]>([]);
  const [muridPilih, setMuridPilih] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);

  useEffect(() => {
    let hidup = true;
    (async () => {
      setMemuat(true);
      const [r, s] = await Promise.all([senaraiMuridKelas(kelas), statusKehadiran(tarikh, kelas)]);
      if (!hidup) return;
      setRoster(r);
      setBelumSedia(s.belumSedia);
      setBolehSahkan(s.bolehSahkan);
      setBolehPadam(s.bolehPadam);
      setDisahkanPada(s.disahkanPada);
      setDisahkanOleh(s.disahkanOleh);
      setDraf(s.tidakHadir.map((t: TidakHadirMurid) => ({ ...t })));
      setMemuat(false);
    })();
    return () => { hidup = false; };
  }, [kelas, tarikh]);

  if (memuat) return <p className="py-4 text-center text-sm text-slate-500">Memuatkan senarai murid…</p>;
  if (belumSedia) {
    return (
      <div className="rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
        Ciri Kehadiran Murid belum dipasang — admin perlu jalankan SQL Kehadiran Murid dahulu.
      </div>
    );
  }

  const belumDitambah = roster.filter((m) => !draf.some((d) => d.murid_id === m.murid_id));

  // Lalai "Masalah Kesihatan / Demam" — sebab TERBANYAK berbanding lain
  // (lihat sebab-tidak-hadir.ts). Guru kelas boleh tukar bila perlu, tapi
  // lalai ini elak klik berulang untuk kes biasa — penting bila kejar
  // balik banyak hari sekali gus (laporan pengguna 2 Okt 2026: "kalau dia
  // tangguh pengisian macam saya 3 bulan... default ini membantu dia").
  const KATEGORI_LALAI = "MASALAH KESIHATAN", SEBAB_LALAI = "DEMAM";

  function tambah() {
    const m = roster.find((x) => x.murid_id === muridPilih);
    if (!m) return;
    setDraf((d) => [...d, { murid_id: m.murid_id, nama_murid: m.nama, kategori: KATEGORI_LALAI, sebab: SEBAB_LALAI }]);
    setMuridPilih("");
  }

  function buang(muridId: string) {
    setDraf((d) => d.filter((x) => x.murid_id !== muridId));
  }

  function tukarKategori(muridId: string, kategori: string) {
    // Tukar kategori membatalkan sebab lama — sebab tersenarai ikut
    // kategori SAMA seperti borang iSPEL sendiri; sebab kategori lama
    // tidak bermakna lagi selepas kategori ditukar.
    setDraf((d) => d.map((x) => (x.murid_id === muridId ? { ...x, kategori, sebab: "" } : x)));
  }
  function tukarSebab(muridId: string, sebab: string) {
    setDraf((d) => d.map((x) => (x.murid_id === muridId ? { ...x, sebab } : x)));
  }

  async function simpan() {
    setSibuk(true); setNota(null);
    const r = await simpanTidakHadir(tarikh, kelas, draf.map(({ murid_id, kategori, sebab }) => ({ murid_id, kategori, sebab })));
    setNota({ ok: r.ok, teks: r.mesej });
    setSibuk(false);
  }

  async function sahkan() {
    if (draf.some((d) => !d.kategori.trim() || !d.sebab.trim())) {
      setNota({ ok: false, teks: "Setiap murid tidak hadir mesti ada Kategori dan Sebab." });
      return;
    }
    setSibuk(true); setNota(null);
    const simpanDulu = await simpanTidakHadir(tarikh, kelas, draf.map(({ murid_id, kategori, sebab }) => ({ murid_id, kategori, sebab })));
    if (!simpanDulu.ok) { setNota({ ok: false, teks: simpanDulu.mesej }); setSibuk(false); return; }
    const r = await sahkanKehadiran(tarikh, kelas);
    setNota({ ok: r.ok, teks: r.mesej });
    if (r.ok) { setDisahkanPada(new Date().toISOString()); }
    setSibuk(false);
  }

  async function padam() {
    if (!window.confirm(`Padam SEPENUHNYA rekod kehadiran ${kelas} bagi ${tarikh}? Tindakan ini tidak boleh dibatalkan.`)) return;
    setSibuk(true); setNota(null);
    const r = await padamKehadiranMurid(tarikh, kelas);
    setNota({ ok: r.ok, teks: r.mesej });
    if (r.ok) { setDraf([]); setDisahkanPada(null); setDisahkanOleh(null); }
    setSibuk(false);
  }

  return (
    <div className="rounded-xl border border-garis bg-white p-4">
      <p className="text-sm font-bold text-navy-800">Murid tidak hadir — {tarikh}</p>

      {disahkanPada ? (
        <p className="mt-1 rounded-lg bg-[#edf8f2] px-3 py-2 text-xs font-semibold text-[#176b49]">
          ✓ Disahkan oleh {disahkanOleh ?? "—"} — boleh sunting terus bila perlu.
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          Kosong = semua murid hadir. Sahkan bila selesai.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <a href="https://sktd.edu.my/bantuan-ispel#pasang" target="_blank" rel="noreferrer"
          className="inline-block text-xs font-semibold text-navy-700 underline underline-offset-2">
          Pasang extension Kehadiran IDME →
        </a>
        <a href="https://sktd.edu.my/bantuan-ispel#guna" target="_blank" rel="noreferrer"
          className="inline-block text-xs font-semibold text-navy-700 underline underline-offset-2">
          Dah pasang? Cara guna →
        </a>
      </div>

      {draf.length > 0 && (
        <ul className="mt-3 space-y-2">
          {draf.map((d) => (
            <li key={d.murid_id} className="rounded-lg border border-garis p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-navy-800">{d.nama_murid}</span>
                <button type="button" onClick={() => buang(d.murid_id)} className="min-h-8 touch-manipulation text-xs font-semibold text-red-600 underline">Buang</button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <PilihCari
                  id={`kategori-${d.murid_id}`} label="Kategori" sembunyiLabel
                  nilai={d.kategori} tukar={(v) => tukarKategori(d.murid_id, v)}
                  placeholder="Kategori…"
                  pilihan={SENARAI_KATEGORI.map((k) => ({ nilai: k, label: k }))}
                />
                <PilihCari
                  id={`sebab-${d.murid_id}`} label="Sebab" sembunyiLabel
                  nilai={d.sebab} tukar={(v) => tukarSebab(d.murid_id, v)}
                  placeholder={d.kategori ? "Sebab…" : "Pilih kategori dahulu"}
                  disabled={!d.kategori}
                  pilihan={sebabUntukKategori(d.kategori).map((s) => ({ nilai: s, label: s }))}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {belumDitambah.length > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <PilihCari
              id="kehadiran-murid" label="Tambah murid tidak hadir" sembunyiLabel
              nilai={muridPilih} tukar={setMuridPilih}
              placeholder="Taip nama murid…"
              pilihan={belumDitambah.map((m) => ({ nilai: m.murid_id, label: m.nama }))}
            />
          </div>
          <button type="button" disabled={!muridPilih} onClick={tambah}
            className="min-h-11 touch-manipulation rounded-lg border border-garis px-4 text-sm font-semibold text-navy-700 disabled:opacity-40">
            + Tambah
          </button>
        </div>
      )}

      {nota && <p className={`mt-3 text-sm ${nota.ok ? "text-[#167a4b]" : "text-red-600"}`}>{nota.teks}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={sibuk} onClick={() => void simpan()}
          className="min-h-11 touch-manipulation rounded-lg border border-navy-700 px-4 text-sm font-semibold text-navy-700 disabled:opacity-50">
          Simpan draf
        </button>
        {bolehSahkan ? (
          <button type="button" disabled={sibuk} onClick={() => void sahkan()}
            className="min-h-11 touch-manipulation rounded-lg bg-navy-800 px-4 text-sm font-bold text-white disabled:opacity-50">
            Sahkan Kehadiran
          </button>
        ) : (
          <span className="text-xs italic text-slate-400">
            Hanya guru kelas boleh sahkan — draf anda tetap tersimpan untuk mereka teruskan.
          </span>
        )}
        {bolehPadam && (disahkanPada || draf.length > 0) && (
          <button type="button" disabled={sibuk} onClick={() => void padam()}
            className="min-h-11 touch-manipulation rounded-lg border border-[#e7bcbc] px-4 text-sm font-bold text-red-600 disabled:opacity-50">
            🗑 Padam rekod (pentadbir)
          </button>
        )}
      </div>
    </div>
  );
}
