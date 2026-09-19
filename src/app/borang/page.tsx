import Link from "next/link";
import { pengguna } from "@/lib/akses";
import { senaraiSuratSaya, kepalaSurat } from "@/lib/surat";
import { senaraiPentadbirUntukSemua } from "@/lib/pentadbir";
import { semuaKelas, semuaKelasPPKI } from "@/data/kelas";
import PanelBorang from "./PanelBorang";

export const metadata = { title: "Borang Sekolah" };

/**
 * Borang Sekolah — surat rasmi & Borang Kebenaran Gambar (permintaan A.1,
 * A.2, A.4). Diisi oleh guru, AKP, pentadbir atau kakitangan; surat rasmi
 * dihantar ke Urusan Pejabat untuk nombor rujukan kami (permintaan B.3).
 */
export default async function Borang() {
  const saya = await pengguna();
  if (!saya?.peranan) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  const [{ belumSedia, senarai }, pentadbir] = await Promise.all([
    senaraiSuratSaya(),
    senaraiPentadbirUntukSemua().catch(() => []),
  ]);
  const kelas = [...semuaKelas(), ...semuaKelasPPKI()];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Borang Sekolah</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Surat rasmi dan Borang Kebenaran Gambar. Header, alamat sekolah dan
        tandatangan Guru Besar diisi automatik.
      </p>

      <Link href="/borang/aktiviti" className="mt-5 block rounded-xl border border-garis bg-white p-4 font-semibold text-navy-800">Surat Akuan Kebenaran dan Kesihatan Penyertaan Aktiviti dan Pertandingan →</Link>
      {belumSedia ? (
        <div className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Modul ini belum dipasang.</p>
          <p className="mt-1.5">
            Admin perlu menjalankan SQL Borang Sekolah (lihat laporan
            pemasangan) sekali sahaja; selepas itu skrin ini terus berfungsi.
          </p>
        </div>
      ) : (
        <PanelBorang
          pentadbir={pentadbir.map((p) => ({ nama: p.nama, jawatan: p.jawatan }))}
          kelas={kelas}
          senarai={senarai}
          kepala={await kepalaSurat()}
          sayaNama={saya.nama ?? saya.emel}
        />
      )}
    </main>
  );
}
