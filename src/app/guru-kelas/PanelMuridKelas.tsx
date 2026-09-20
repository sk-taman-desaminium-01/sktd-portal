"use client";

import { useState } from "react";
import {
  senaraiUrusMuridKelasTindakan,
  tambahMuridKelasTindakan,
  ubahKeadaanMuridTindakan,
  type MuridUrusKelas,
} from "@/lib/tindakan-pbd";

export interface KelasGuru {
  label: string;
  tahun: number;
  kelas: string;
  bil: number;
}

type Nota = { ok: boolean; teks: string } | null;

/**
 * Daftar murid kelas dalam kad akordion satu lajur. Semua tindakan menulis
 * pada pbd_murid/pbd_pendaftaran, iaitu sumber yang dibaca ePBD, disiplin,
 * borang, aktiviti dan cadangan murid di seluruh portal.
 */
export default function PanelMuridKelas({ kelasGuru }: { kelasGuru: KelasGuru[] }) {
  const [buka, setBuka] = useState<string | null>(null);
  const [senarai, setSenarai] = useState<Record<string, MuridUrusKelas[]>>({});
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [nota, setNota] = useState<Record<string, Nota>>({});
  const [nama, setNama] = useState("");
  const [noKp, setNoKp] = useState("");

  async function muat(k: KelasGuru) {
    const tutup = buka === k.label;
    setBuka(tutup ? null : k.label);
    if (tutup) return;
    setSibuk(k.label);
    try {
      const r = await senaraiUrusMuridKelasTindakan(k.tahun, k.kelas);
      setNota((n) => ({ ...n, [k.label]: { ok: r.ok, teks: r.mesej } }));
      if (r.ok) setSenarai((s) => ({ ...s, [k.label]: r.murid ?? [] }));
    } finally {
      setSibuk(null);
    }
  }

  async function tambah(k: KelasGuru) {
    setSibuk(k.label);
    try {
      const r = await tambahMuridKelasTindakan(k.tahun, k.kelas, nama, noKp);
      setNota((n) => ({ ...n, [k.label]: { ok: r.ok, teks: r.mesej } }));
      if (!r.ok) return;
      setNama("");
      setNoKp("");
      const segar = await senaraiUrusMuridKelasTindakan(k.tahun, k.kelas);
      if (segar.ok) setSenarai((s) => ({ ...s, [k.label]: segar.murid ?? [] }));
    } finally {
      setSibuk(null);
    }
  }

  async function ubah(k: KelasGuru, m: MuridUrusKelas, keadaan: "apung" | "pindah_keluar" | "aktif") {
    if (keadaan === "pindah_keluar" && !window.confirm(`Keluarkan ${m.nama} kerana berpindah? Nama akan dibuang daripada semua senarai aktif.`)) return;
    setSibuk(m.pendaftaran_id);
    try {
      const r = await ubahKeadaanMuridTindakan(m.pendaftaran_id, keadaan, k.tahun, k.kelas);
      setNota((n) => ({ ...n, [k.label]: { ok: r.ok, teks: r.mesej } }));
      if (!r.ok) return;
      setSenarai((s) => ({
        ...s,
        [k.label]: keadaan === "pindah_keluar"
          ? (s[k.label] ?? []).filter((x) => x.pendaftaran_id !== m.pendaftaran_id)
          : (s[k.label] ?? []).map((x) => x.pendaftaran_id === m.pendaftaran_id ? { ...x, keadaan } : x),
      }));
    } finally {
      setSibuk(null);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      {kelasGuru.map((k) => {
        const terbuka = buka === k.label;
        const murid = senarai[k.label] ?? [];
        const aktif = murid.filter((m) => m.keadaan === "aktif");
        const apung = murid.filter((m) => m.keadaan === "apung");
        return (
          <section key={k.label} className="overflow-hidden rounded-xl border border-garis bg-white">
            <button
              type="button"
              onClick={() => void muat(k)}
              aria-expanded={terbuka}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-navy-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-navy-800">{k.label}</span>
                <span className="block text-xs text-slate-500">
                  {terbuka && senarai[k.label] ? `${aktif.length} murid aktif` : `${k.bil} murid berdaftar`}
                  {apung.length > 0 && ` · ${apung.length} apung`}
                </span>
              </span>
              <span aria-hidden="true" className={`text-xl text-navy-700 transition ${terbuka ? "rotate-180" : ""}`}>⌄</span>
            </button>

            {terbuka && (
              <div className="border-t border-garis p-4">
                <div className="rounded-xl bg-navy-50 p-3">
                  <p className="text-sm font-bold text-navy-800">Tambah murid baharu</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                    <input
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Nama penuh murid"
                      autoComplete="off"
                      className="min-w-0 rounded-lg border border-garis bg-white px-3 py-2.5 text-base sm:text-sm"
                    />
                    <input
                      value={noKp}
                      onChange={(e) => setNoKp(e.target.value)}
                      placeholder="No. KP/MyKid"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={14}
                      className="min-w-0 rounded-lg border border-garis bg-white px-3 py-2.5 text-base sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void tambah(k)}
                      disabled={sibuk !== null || nama.trim().length < 3 || noKp.replace(/\D/g, "").length !== 12}
                      className="min-h-11 rounded-lg bg-navy-700 px-4 text-sm font-bold text-white disabled:opacity-40"
                    >
                      Tambah
                    </button>
                  </div>
                </div>

                {nota[k.label] && (
                  <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${nota[k.label]?.ok ? "bg-[#edf8f2] text-[#176b49]" : "bg-[#fdf1f1] text-[#982d2d]"}`}>
                    {nota[k.label]?.teks}
                  </p>
                )}

                {sibuk === k.label && !senarai[k.label] ? (
                  <p className="py-5 text-center text-sm text-slate-400">Memuatkan…</p>
                ) : (
                  <>
                    <Senarai
                      tajuk="Murid aktif"
                      kosong="Tiada murid aktif."
                      murid={aktif}
                      sibuk={sibuk}
                      tindakan={(m) => (
                        <>
                          <button onClick={() => void ubah(k, m, "apung")} className="rounded-lg border border-garis px-3 py-2 text-xs font-semibold text-navy-700">Apungkan</button>
                          <button onClick={() => void ubah(k, m, "pindah_keluar")} className="rounded-lg border border-[#e7bcbc] px-3 py-2 text-xs font-semibold text-[#982d2d]">Pindah keluar</button>
                        </>
                      )}
                    />
                    {apung.length > 0 && (
                      <Senarai
                        tajuk="Murid apung"
                        kosong=""
                        murid={apung}
                        sibuk={sibuk}
                        warna="kuning"
                        tindakan={(m) => (
                          <button onClick={() => void ubah(k, m, "aktif")} className="rounded-lg bg-navy-700 px-3 py-2 text-xs font-bold text-white">Masukkan semula</button>
                        )}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Senarai({ tajuk, kosong, murid, sibuk, tindakan, warna = "putih" }: {
  tajuk: string;
  kosong: string;
  murid: MuridUrusKelas[];
  sibuk: string | null;
  tindakan: (m: MuridUrusKelas) => React.ReactNode;
  warna?: "putih" | "kuning";
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tajuk} · {murid.length}</p>
      {murid.length === 0 ? <p className="mt-2 text-sm text-slate-400">{kosong}</p> : (
        <ul className="mt-2 space-y-2">
          {murid.map((m, i) => (
            <li key={m.pendaftaran_id} className={`rounded-xl border p-3 ${warna === "kuning" ? "border-[#e9d9ae] bg-[#fdf9f0]" : "border-garis"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-navy-800">{i + 1}. {m.nama}</span>
                  <span className="block font-mono text-xs text-slate-400">{m.no_kp ?? "Tiada No. KP"}</span>
                </span>
                <span className="flex flex-wrap gap-2 [&>button]:min-h-10 [&>button]:disabled:opacity-40">
                  <span className={sibuk === m.pendaftaran_id ? "pointer-events-none opacity-40" : "contents"}>{tindakan(m)}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
