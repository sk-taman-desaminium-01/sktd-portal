"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  hantarKawalanKelas, padamKawalanKelas, suntingKawalanKelas,
  type BarisKawalanKelas,
} from "@/lib/kawalan-kelas";
import { cartaKehadiranHarian } from "@/lib/kawalan-kelas-carta";
import PilihCari from "@/components/PilihCari";

export default function PanelKawalanKelas({
  tahunSesi, kelas, namaGuruKelas, senarai, tarikhAwal,
}: {
  tahunSesi: number;
  kelas: string[];
  namaGuruKelas: Record<string, string>;
  senarai: BarisKawalanKelas[];
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
  const [sunting, setSunting] = useState<string | null>(null);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);

  const carta = useMemo(() => cartaKehadiranHarian(senarai, kelasPilih), [senarai, kelasPilih]);

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
      const r = sunting
        ? await suntingKawalanKelas(sunting, input)
        : await hantarKawalanKelas(input);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setSubjek(""); setMasaMasuk(""); setRelief(false); setReliefUntuk("");
        setMasalah(""); setBilHadir(""); setBilMurid(""); setSunting(null); router.refresh();
      }
      setSibuk(false);
    } catch {
      setNota({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  function mulaSunting(b: BarisKawalanKelas) {
    setSunting(b.id); setTarikh(b.tarikh); setKelasPilih(b.kelas); setSubjek(b.subjek);
    setMasaMasuk(b.masa_masuk ?? ""); setRelief(b.relief); setReliefUntuk(b.guru_relief_untuk ?? "");
    setMasalah(b.masalah_disiplin ?? ""); setBilHadir(b.bil_hadir == null ? "" : String(b.bil_hadir));
    setBilMurid(b.bil_murid == null ? "" : String(b.bil_murid)); setNota(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function batalSunting() {
    setSunting(null); setSubjek(""); setMasaMasuk(""); setRelief(false); setReliefUntuk("");
    setMasalah(""); setBilHadir(""); setBilMurid(""); setNota(null);
  }

  async function padam(b: BarisKawalanKelas) {
    if (!window.confirm(`Padam rekod ${b.subjek} untuk ${b.kelas}?`)) return;
    try {
      setSibuk(true); setNota(null);
      const r = await padamKawalanKelas(b.id);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) { if (sunting === b.id) batalSunting(); router.refresh(); }
      setSibuk(false);
    } catch {
      setNota({ ok: false, teks: "Sambungan terputus atau pelayan tidak menjawab. Cuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mt-6 space-y-10">
      <section className="rounded-xl border border-garis bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-navy-800">{sunting ? "Sunting Rekod Masuk Kelas" : "Rekod Masuk Kelas"}</h2>
          {sunting && <button type="button" onClick={batalSunting} className="min-h-11 touch-manipulation px-1 text-xs font-semibold text-navy-700 underline">Batal sunting</button>}
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
            <input value={subjek} onChange={(e) => setSubjek(e.target.value)}
              className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
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
          <input value={reliefUntuk} onChange={(e) => setReliefUntuk(e.target.value)}
            placeholder="Ganti untuk guru…" className="mt-2 block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
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
          {sunting ? "Simpan Perubahan" : "Simpan Rekod"}
        </button>
      </section>

      {carta.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-navy-800">Carta Kehadiran Harian — {kelasPilih}</h2>
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
        <h2 className="text-lg font-bold text-navy-800">Log Terkini ({senarai.length})</h2>
        {senarai.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
            Belum ada rekod kawalan kelas. Rekod pertama anda akan muncul di sini sebaik dihantar.
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {senarai.slice(0, 40).map((b) => (
            <li key={b.id} className="rounded-lg border border-garis bg-white p-3 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-navy-800">{b.kelas}</span> · {b.subjek} ·{" "}
                  {new Date(b.tarikh).toLocaleDateString("ms-MY")} · {b.guru_nama}
                  {b.relief && <span className="ml-1 rounded bg-[#fdf3dc] px-1.5 py-0.5 text-[10px] font-bold text-[#9a6b06]">RELIEF</span>}
                  {b.masalah_disiplin && <p className="mt-1 text-slate-500">⚠ {b.masalah_disiplin}</p>}
                </div>
                {b.boleh_urus && <div className="flex shrink-0 gap-2">
                  <button type="button" disabled={sibuk} onClick={() => mulaSunting(b)} className="min-h-11 touch-manipulation px-1 font-semibold text-navy-700 underline disabled:opacity-50">Sunting</button>
                  <button type="button" disabled={sibuk} onClick={() => void padam(b)} className="min-h-11 touch-manipulation px-1 font-semibold text-red-600 underline disabled:opacity-50">Padam</button>
                </div>}
              </div>
            </li>
          ))}
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
