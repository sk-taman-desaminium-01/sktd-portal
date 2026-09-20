"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PilihCari from "@/components/PilihCari";

export default function PemilihKelasSlip({ kelas }: { kelas: { tahun: number; kelas: string; bil: number }[] }) {
  const router = useRouter();
  const pilihan = kelas.map((k) => ({ nilai: `${k.tahun} ${k.kelas}`, label: `${k.tahun} ${k.kelas}`, nota: `${k.bil} murid` }));
  const [nilai, setNilai] = useState(pilihan[0]?.nilai ?? "");
  function buka() {
    const [tahun, ...nama] = nilai.split(" ");
    if (!tahun || !nama.length) return;
    router.push(`/pbd/slip?tahun=${tahun}&kelas=${encodeURIComponent(nama.join(" "))}`);
  }
  return (
    <div className="mt-5 max-w-lg rounded-xl border border-garis bg-white p-4">
      <PilihCari id="slip-kelas" label="Kelas" pilihan={pilihan} nilai={nilai} tukar={setNilai} placeholder="Cari kelas…" />
      <button onClick={buka} className="mt-3 min-h-11 rounded-lg bg-navy-700 px-5 text-sm font-bold text-white">Buka slip kelas</button>
    </div>
  );
}
