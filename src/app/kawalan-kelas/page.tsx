import Link from "next/link";
import { sesiSemasa } from "@/lib/pbd";
import { senaraiKawalanKelas } from "@/lib/kawalan-kelas";
import { namaGuruKelasSemua } from "@/lib/guru-kelas";
import { semuaKelas, semuaKelasPPKI } from "@/data/kelas";
import PanelKawalanKelas from "./PanelKawalanKelas";

export const metadata = { title: "Rekod Kawalan Kelas & Kehadiran" };

const HARI_INI = () => new Date().toISOString().slice(0, 10);

/**
 * Rekod Kawalan Kelas & Kehadiran (permintaan G) — kad baharu, log
 * BERSAMA semua guru (bukan sulit seperti Disiplin).
 */
export default async function KawalanKelas() {
  const sesi = (await sesiSemasa())?.tahun_sesi ?? new Date().getFullYear();
  const [k, namaGuruKelas] = await Promise.all([
    senaraiKawalanKelas(sesi),
    namaGuruKelasSemua().catch(() => ({}) as Record<string, string>),
  ]);
  const kelas = [...semuaKelas(), ...semuaKelasPPKI()];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Rekod Kawalan Kelas & Kehadiran</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Log bersama — siapa masuk kelas, subjek, relief, dan bilangan kehadiran harian.
      </p>

      {k.belumSedia ? (
        <div className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Modul ini belum dipasang.</p>
          <p className="mt-1.5">Admin perlu jalankan SQL Kawalan Kelas (lihat laporan pemasangan) sekali sahaja.</p>
        </div>
      ) : (
        <PanelKawalanKelas
          tahunSesi={sesi} kelas={kelas} namaGuruKelas={namaGuruKelas}
          senarai={k.senarai} tarikhAwal={HARI_INI()}
        />
      )}
    </main>
  );
}
