import Link from "next/link";
import { sesiSemasa } from "@/lib/pbd";
import { senaraiDisiplin } from "@/lib/disiplin";
import { senaraiMuridCadangan } from "@/lib/murid-cadangan";
import { semuaKelas, semuaKelasPPKI } from "@/data/kelas";
import PanelDisiplin from "./PanelDisiplin";

export const metadata = { title: "Disiplin & Sahsiah" };

/**
 * Disiplin & Sahsiah (permintaan F). Kad ini kelihatan kepada SEMUA guru
 * (F.3) — mereka boleh merekod salah laku, tetapi hanya guru disiplin,
 * pentadbir & admin dapat membaca senarai penuh. `senaraiDisiplin()`
 * memulangkan `boleh: false` untuk guru biasa; halaman tetap memaparkan
 * borang rekod sahaja kepada mereka.
 */
export default async function Disiplin() {
  const sesi = (await sesiSemasa())?.tahun_sesi ?? new Date().getFullYear();
  const [d, cadangan] = await Promise.all([
    senaraiDisiplin(sesi),
    senaraiMuridCadangan(sesi).catch(() => []),
  ]);
  const kelas = [...semuaKelas(), ...semuaKelasPPKI()];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Disiplin & Sahsiah</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Rekod salah laku murid — tarikh, saksi & tindakan.
        {!d.boleh && " Hanya Guru Disiplin, pentadbir & admin boleh membaca senarai penuh."}
      </p>

      {d.belumSedia ? (
        <div className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Modul ini belum dipasang.</p>
          <p className="mt-1.5">Admin perlu jalankan SQL Disiplin (lihat laporan pemasangan) sekali sahaja.</p>
        </div>
      ) : (
        <PanelDisiplin
          tahunSesi={sesi} kelas={kelas} cadangan={cadangan}
          boleh={d.boleh} senarai={d.senarai} berulang={d.berulang}
        />
      )}
    </main>
  );
}
