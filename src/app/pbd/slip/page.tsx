import Link from "next/link";
import { SEKOLAH } from "@/data/sekolah";
import { slipKelas } from "@/lib/tindakan-pbd";
import PanelSlip from "./PanelSlip";

export const metadata = { title: "Slip PBD" };

/**
 * Slip PBD satu kelas — untuk guru kelas menyemak, menulis ulasan, mencetak.
 *
 * 🔴 Kebenaran per kelas dikuatkuasakan dalam `slipKelas`, bukan di sini.
 * Ini pembetulan terus kepada lubang yang tercatat dalam repo gpi:
 * `/api/slip/*` di sana tiada semakan per-kelas, dan selamat hanya kerana
 * tersembunyi dalam tab admin. Menukar `?kelas=` dalam bar alamat di sini
 * tidak membuka kelas orang lain.
 */
export default async function Slip({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; kelas?: string }>;
}) {
  const q = await searchParams;
  const tahun = Number(q.tahun ?? 0);
  const kelas = (q.kelas ?? "").trim();

  if (!Number.isInteger(tahun) || tahun < 1 || tahun > 6 || !kelas) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Pautan tidak lengkap</h1>
        <Link href="/pbd" className="mt-6 inline-block text-sm text-navy-700 underline">← ePBD</Link>
      </main>
    );
  }

  const hasil = await slipKelas(tahun, kelas);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/pbd" className="tiada-cetak text-sm text-slate-500 hover:text-navy-700">
        ← ePBD
      </Link>

      <div className="tiada-cetak mt-3">
        <h1 className="text-2xl font-bold text-navy-800">Slip PBD {tahun} {kelas}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {hasil.ok ? `Sesi ${hasil.tahunSesi} · ${hasil.mesej}` : "Laporan pentaksiran bilik darjah."}
        </p>
      </div>

      {!hasil.ok || !hasil.baris ? (
        <p className="mt-6 rounded-xl border border-[#e9c4c4] bg-[#fdf1f1] p-5 text-sm leading-relaxed text-[#8f2b2b]">
          {hasil.mesej}
        </p>
      ) : (
        <PanelSlip
          tahun={tahun}
          kelas={kelas}
          tahunSesi={hasil.tahunSesi ?? new Date().getFullYear()}
          namaSekolah={SEKOLAH.namaPenuh}
          baris={hasil.baris}
          subjekAda={hasil.subjekAda ?? []}
        />
      )}
    </main>
  );
}
