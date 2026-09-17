import Link from "next/link";
import { papanBilik } from "@/lib/tindakan-bilik";
import PanelBilik from "./PanelBilik";

export const metadata = { title: "Tempahan Bilik Khas" };

export default async function Bilik() {
  const papan = await papanBilik();

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
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Tempahan Bilik Khas</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Setiap guru boleh menempah. Anda boleh membatalkan tempahan sendiri;
        pentadbir boleh membatalkan mana-mana tempahan.
      </p>

      <PanelBilik papan={papan} />
    </main>
  );
}
