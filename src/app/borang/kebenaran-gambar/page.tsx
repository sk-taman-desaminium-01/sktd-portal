import Link from "next/link";
import { semuaKelas, semuaKelasPPKI } from "@/data/kelas";
import { kepalaSurat } from "@/lib/surat";
import BorangKebenaranGambar from "./BorangKebenaranGambar";

export const metadata = {
  title: "Kebenaran Gambar",
  description: "Keputusan ibu bapa atau penjaga bagi rakaman gambar, video dan audio murid SK Taman Desaminium.",
  referrer: "no-referrer" as const,
};

export default async function KebenaranGambar() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/borang" className="text-sm font-medium text-slate-600 underline underline-offset-4">← Borang Sekolah</Link>
      <h1 className="mt-5 text-2xl font-bold leading-tight text-navy-800 sm:text-3xl">Kebenaran Gambar</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Lengkapkan keputusan kebenaran ibu bapa atau penjaga. Nama, kelas dan MyKid murid akan dipadankan dengan daftar sekolah tanpa memaparkan senarai murid kepada orang awam.
      </p>
      <BorangKebenaranGambar kelas={[...semuaKelas(), ...semuaKelasPPKI()]} kepala={await kepalaSurat()} />
    </main>
  );
}
