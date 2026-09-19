import Link from "next/link";
import { pengguna } from "@/lib/akses";
import { senaraiSuratSaya, kepalaSurat } from "@/lib/surat";
import { senaraiPentadbirUntukSemua } from "@/lib/pentadbir";
import { semuaKelas, semuaKelasPPKI } from "@/data/kelas";
import PanelBorang from "../PanelBorang";

export const metadata = { title: "Urus Borang Sekolah" };

export default async function UrusBorang() {
  const saya = await pengguna();
  if (!saya?.peranan) {
    return <main className="mx-auto max-w-2xl px-5 py-16 text-center"><h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1><Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link></main>;
  }

  const [{ belumSedia, senarai }, pentadbir, kepala] = await Promise.all([
    senaraiSuratSaya(),
    senaraiPentadbirUntukSemua().catch(() => []),
    kepalaSurat(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Urus Borang Sekolah</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">Surat rasmi, rekod Kebenaran Gambar dan cetakan borang sekolah.</p>
      <Link href="/borang/aktiviti/urus" className="mt-5 block rounded-xl border border-garis bg-white p-4 font-semibold text-navy-800">Urus Surat Akuan Penyertaan Aktiviti →</Link>
      {belumSedia ? (
        <div className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Modul ini belum dipasang.</p>
          <p className="mt-1.5">Admin perlu menjalankan SQL Borang Sekolah sekali sahaja.</p>
        </div>
      ) : (
        <PanelBorang
          pentadbir={pentadbir.map((p) => ({ nama: p.nama, jawatan: p.jawatan }))}
          kelas={[...semuaKelas(), ...semuaKelasPPKI()]}
          senarai={senarai}
          kepala={kepala}
          sayaNama={saya.nama ?? saya.emel}
        />
      )}
    </main>
  );
}
