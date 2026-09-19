import Link from "next/link";
import { hariIniMY } from "@/lib/bilik";
import { sesiSemasa } from "@/lib/pbd";
import { senaraiRosterRmt, hadirRmtTarikh, kelasBolehUrusRosterRmt } from "@/lib/rmt";
import { semuaKelas, semuaKelasPPKI } from "@/data/kelas";
import PanelRmt from "./PanelRmt";

export const metadata = { title: "Rancangan Makanan Tambahan (RMT)" };

const HARI_INI = hariIniMY;

/**
 * RMT (permintaan pengguna E) — dipisahkan daripada Disiplin & Sahsiah
 * (dahulu satu kad "Kehadiran & RMT").
 */
export default async function Rmt() {
  const sesi = (await sesiSemasa())?.tahun_sesi ?? new Date().getFullYear();
  const tarikh = HARI_INI();
  const [r, kelasRoster, hadir] = await Promise.all([
    senaraiRosterRmt(sesi),
    kelasBolehUrusRosterRmt(),
    hadirRmtTarikh(sesi, tarikh),
  ]);
  const semua = [...semuaKelas(), ...semuaKelasPPKI()];
  const kelas = kelasRoster === null ? semua : kelasRoster;
  const bolehRoster = kelasRoster === null || kelasRoster.length > 0;
  const rosterUrus = kelasRoster === null
    ? r.senarai
    : r.senarai.filter((m) => kelasRoster.includes(m.tahun === 0 ? m.kelas : `${m.tahun} ${m.kelas}`));

  if (!r.boleh) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Rancangan Makanan Tambahan</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Senarai murid RMT & kehadiran harian — sesiapa guru boleh isi kehadiran; guru kelas mengurus murid kelas sendiri.
      </p>

      {r.belumSedia ? (
        <div className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Modul ini belum dipasang.</p>
          <p className="mt-1.5">Admin perlu jalankan SQL RMT (lihat laporan pemasangan) sekali sahaja.</p>
        </div>
      ) : (
        <PanelRmt
          tahunSesi={sesi} kelas={kelas} bolehRoster={bolehRoster}
          senarai={r.senarai} rosterUrus={rosterUrus} tarikhAwal={tarikh} hadirAwal={hadir.hadir}
        />
      )}
    </main>
  );
}
