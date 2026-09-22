import Link from "next/link";
import { notFound } from "next/navigation";
import { aktivitiAwam } from "@/lib/borang-aktiviti";
import { julatTarikh } from "@/data/borang-aktiviti";
import Borang from "./Borang";

export const metadata = { title: "Surat Akuan Penyertaan Aktiviti", referrer: "no-referrer" as const };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [aktiviti] = await aktivitiAwam(id);
  if (!aktiviti) notFound();
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/borang/aktiviti" className="text-sm font-medium text-slate-600 underline underline-offset-4">← Senarai aktiviti</Link>
      <h1 className="mt-5 text-2xl font-bold leading-tight text-navy-800 sm:text-3xl">Surat Akuan Penyertaan Aktiviti</h1>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold leading-snug text-navy-800">{aktiviti.nama}</h2>
        <dl className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-[7rem_1fr]">
          <dt className="font-semibold">Tarikh</dt><dd>{julatTarikh(aktiviti.tarikh, aktiviti.tarikh_tamat, false)}</dd>
          <dt className="font-semibold">Masa</dt><dd>{aktiviti.masa}</dd>
          <dt className="font-semibold">Tempat</dt><dd>{aktiviti.tempat}</dd>
          <dt className="font-semibold">Anjuran</dt><dd>{aktiviti.anjuran}</dd>
        </dl>
      </section>
      <Borang aktivitiId={id} />
    </main>
  );
}
