import Link from "next/link";
import { papanInventori } from "@/lib/tindakan-inventori";
import PanelInventori from "./PanelInventori";

export const metadata = { title: "Inventori ICT" };

export default async function Inventori() {
  const papan = await papanInventori();

  if (!papan) {
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
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Inventori ICT</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Apa yang unit ICT selenggara, dan permohonan barang daripada guru.
        Unit dimaklumkan setiap kali permohonan masuk.
      </p>

      {papan.belumSedia ? (
        <div className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Modul ini belum dipasang.</p>
          <p className="mt-1.5">
            Jadual pangkalan datanya belum dicipta. Admin perlu menjalankan{" "}
            <code className="rounded bg-white/70 px-1 py-0.5 text-xs">supabase/inventori.sql</code>{" "}
            sekali sahaja.
          </p>
          <p className="mt-1.5 text-xs">Tiada apa yang rosak — tiada data hilang.</p>
        </div>
      ) : (
        <PanelInventori papan={papan} />
      )}
    </main>
  );
}
