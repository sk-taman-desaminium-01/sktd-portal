import Link from "next/link";
import { notFound } from "next/navigation";
import { resitAkuan } from "@/lib/borang-aktiviti";
import CetakAkuan from "@/components/CetakAkuan";
export const metadata={title:"Resit Akuan",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rekod = await resitAkuan(token);
  if (!rekod) notFound();
  return <main className="mx-auto max-w-6xl p-4 sm:p-6"><Link href="/borang/aktiviti" className="text-sm underline print:hidden">← Senarai aktiviti</Link><h1 className="mt-4 text-xl font-bold print:hidden">Akuan diterima</h1><p className="mt-1 text-sm text-slate-600 print:hidden">Simpan pautan ini secara peribadi. Pautan sah selama 90 hari.</p><CetakAkuan aktiviti={rekod.aktiviti} data={rekod.jawapan.data} tarikh={rekod.jawapan.dicipta} /></main>;
}
