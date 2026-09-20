"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PilihCari from "@/components/PilihCari";
import { SUBJEK, namaSubjek } from "@/data/subjek";

type Tugas = { subjek: string; tahun: number; kelas: string };
type Kelas = { tahun: number; kelas: string; bil: number };

export default function PemilihPbdGuru({ kelas, tugas, penuh }: { kelas: Kelas[]; tugas: Tugas[]; penuh: boolean }) {
  const router = useRouter();
  const pilihanKelas = useMemo(() => {
    const peta = new Map<string, Kelas>();
    for (const k of kelas) peta.set(`${k.tahun} ${k.kelas}`, k);
    return [...peta.entries()].map(([nilai, k]) => ({ nilai, label: nilai, nota: `${k.bil} murid` }));
  }, [kelas]);
  const [kelasPilih, setKelasPilih] = useState(pilihanKelas[0]?.nilai ?? "");
  const tugasKelas = penuh ? SUBJEK.map((s) => s.kod) : tugas
    .filter((t) => `${t.tahun} ${t.kelas}` === kelasPilih).map((t) => t.subjek);
  const subjekUnik = [...new Set(tugasKelas)];
  const [subjek, setSubjek] = useState(subjekUnik[0] ?? "");
  const subjekSah = subjekUnik.includes(subjek) ? subjek : (subjekUnik[0] ?? "");

  function tukarKelas(v: string) {
    setKelasPilih(v);
    const pertama = penuh ? SUBJEK[0]?.kod : tugas.find((t) => `${t.tahun} ${t.kelas}` === v)?.subjek;
    setSubjek(pertama ?? "");
  }

  function buka() {
    const [tahun, ...nama] = kelasPilih.split(" ");
    if (!tahun || !nama.length || !subjekSah) return;
    router.push(`/pbd/isi?tahun=${tahun}&kelas=${encodeURIComponent(nama.join(" "))}&subjek=${encodeURIComponent(subjekSah)}`);
  }

  if (!pilihanKelas.length) return <p className="mt-6 rounded-xl border border-garis bg-white p-5 text-sm text-slate-600">Tiada kelas tersedia.</p>;

  return (
    <div className="mt-5 rounded-xl border border-garis bg-white p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <PilihCari id="pbd-guru-kelas" label="Kelas" pilihan={pilihanKelas} nilai={kelasPilih} tukar={tukarKelas} placeholder="Cari kelas…" />
        <PilihCari
          id="pbd-guru-subjek"
          label="Subjek"
          pilihan={subjekUnik.map((s) => ({ nilai: s, label: namaSubjek(s) }))}
          nilai={subjekSah}
          tukar={setSubjek}
          placeholder="Cari subjek…"
        />
      </div>
      <button onClick={buka} disabled={!subjekSah} className="mt-4 min-h-11 rounded-lg bg-navy-700 px-5 text-sm font-bold text-white disabled:opacity-40">
        Buka pengisian PBD
      </button>
    </div>
  );
}
