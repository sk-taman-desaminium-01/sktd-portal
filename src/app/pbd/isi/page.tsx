import Link from "next/link";
import { senaraiIsi } from "@/lib/tindakan-pbd";
import { labelKelas } from "@/lib/pbd";
import PanelIsi from "./PanelIsi";

export const metadata = { title: "Isi PBD" };

/**
 * Skrin isi TP — satu kelas, satu subjek.
 *
 * Parameter datang dari URL supaya guru boleh menyimpan pautan kelasnya.
 * Kebenaran TIDAK datang dari URL: `senaraiIsi` menyemak sendiri sama ada
 * guru ini ditugaskan mengajar subjek itu bagi kelas itu, dan menukar
 * parameter dalam bar alamat tidak memberi akses kepada kelas lain.
 */
export default async function Isi({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; kelas?: string; subjek?: string }>;
}) {
  const q = await searchParams;
  const tahun = Number(q.tahun ?? 0);
  const kelas = (q.kelas ?? "").trim();
  const subjek = (q.subjek ?? "").trim().toUpperCase();

  if (!Number.isInteger(tahun) || tahun < 1 || tahun > 6 || !kelas || !subjek) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Pautan tidak lengkap</h1>
        <p className="mt-2 text-sm text-slate-600">Pilih subjek dari senarai ePBD.</p>
        <Link href="/pbd" className="mt-6 inline-block text-sm text-navy-700 underline">← ePBD</Link>
      </main>
    );
  }

  const hasil = await senaraiIsi(tahun, kelas, subjek);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/pbd" className="text-sm text-slate-500 hover:text-navy-700">← ePBD</Link>

      <h1 className="mt-3 text-2xl font-bold text-navy-800">
        {hasil.namaSubjek ?? subjek}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {labelKelas(tahun, kelas)}
        {hasil.tahunSesi ? ` · sesi ${hasil.tahunSesi}` : ""}
      </p>

      {!hasil.ok || !hasil.baris ? (
        <p className="mt-6 rounded-xl border border-[#e9c4c4] bg-[#fdf1f1] p-5 text-sm leading-relaxed text-[#8f2b2b]">
          {hasil.mesej}
        </p>
      ) : (
        <PanelIsi
          tahun={tahun}
          kelas={kelas}
          subjek={subjek}
          awal={hasil.baris}
          bolehTulis={hasil.bolehTulis ?? false}
          sesiTutup={hasil.sesiTutup ?? false}
          uasaAktif={hasil.uasaAktif ?? false}
        />
      )}
    </main>
  );
}
