"use client";

import { useState } from "react";
import { tetapGuruKelas, buangGuruKelas, type TugasanKelas } from "@/lib/guru-kelas";

/**
 * Senarai semua kelas, satu baris satu kelas, dengan pemilih guru.
 *
 * Disusun begitu kerana soalan yang pentadbir tanya ialah "kelas mana belum
 * ada guru kelas?" — bukan "guru ini pegang kelas apa?". Kelas yang kosong
 * mesti kelihatan sekali imbas.
 */
export default function PanelGuruKelas({
  kelas, awal, orang,
}: {
  kelas: string[];
  awal: Record<string, TugasanKelas>;
  orang: { id: string; nama: string; emel: string | null }[];
}) {
  const [petaan, setPetaan] = useState(awal);
  const [hasil, setHasil] = useState<{ ok: boolean; mesej: string } | null>(null);
  const [sibukKelas, setSibukKelas] = useState<string | null>(null);

  async function ubah(label: string, guruId: string) {
    setSibukKelas(label);
    setHasil(null);
    try {
      const r = guruId ? await tetapGuruKelas(guruId, label) : await buangGuruKelas(label);
      setHasil(r);
      if (r.ok) {
        setPetaan((p) => {
          const baharu = { ...p };
          if (!guruId) delete baharu[label];
          else {
            const g = orang.find((o) => o.id === guruId);
            const [tahun, ...sisa] = label.split(" ");
            baharu[label] = {
              guru_id: guruId,
              nama: g?.nama ?? "",
              emel: g?.emel ?? null,
              tahun: Number(tahun),
              kelas: sisa.join(" "),
              label,
            };
          }
          return baharu;
        });
      }
    } catch (e) {
      setHasil({ ok: false, mesej: e instanceof Error ? e.message : "Gagal mengemas kini." });
    } finally {
      setSibukKelas(null);
    }
  }

  const kosong = kelas.filter((k) => !petaan[k]).length;

  return (
    <>
      {hasil && (
        <p
          role="status"
          className={`mt-5 rounded-xl p-4 text-sm leading-relaxed ${
            hasil.ok ? "bg-[#e5f4ec] text-[#14603c]" : "bg-[#fbeaea] text-[#8f2424]"
          }`}
        >
          {hasil.mesej}
        </p>
      )}

      {kosong > 0 && (
        <p className="mt-5 text-sm text-slate-600">
          <b>{kosong} kelas</b> belum ada guru kelas.
        </p>
      )}

      <ul className="mt-3 divide-y divide-garis rounded-xl border border-garis bg-white">
        {kelas.map((k) => {
          const ada = petaan[k];
          return (
            <li key={k} className="flex flex-wrap items-center gap-3 p-4">
              <span className="w-24 shrink-0 font-semibold text-navy-800">{k}</span>

              <select
                value={ada?.guru_id ?? ""}
                disabled={sibukKelas === k}
                onChange={(e) => ubah(k, e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">— belum ditetapkan —</option>
                {orang.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nama}
                  </option>
                ))}
              </select>

              <span className="w-24 shrink-0 text-right text-xs">
                {sibukKelas === k ? (
                  <span className="text-slate-400">Menyimpan…</span>
                ) : ada ? (
                  <span className="rounded bg-[#e5f4ec] px-2 py-1 font-bold uppercase tracking-wide text-[#167a4b]">
                    Ditetapkan
                  </span>
                ) : (
                  <span className="text-slate-400">Kosong</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Perubahan disimpan sebaik anda memilih — tiada butang simpan. Satu
        kelas hanya boleh ada seorang guru kelas; memilih orang baharu
        menggantikan yang lama.
      </p>
    </>
  );
}
