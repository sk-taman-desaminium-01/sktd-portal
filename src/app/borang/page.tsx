import Link from "next/link";
import { aset } from "@/lib/laluan";

export const metadata = {
  title: "Borang Sekolah",
  description: "Borang awam SK Taman Desaminium untuk ibu bapa dan penjaga.",
  referrer: "no-referrer" as const,
};

const BORANG = [
  {
    href: "/borang/kebenaran-gambar",
    ikon: "IMG",
    tajuk: "Kebenaran Gambar",
    huraian: "Keputusan ibu bapa atau penjaga bagi rakaman gambar, video dan audio murid.",
  },
  {
    href: "/borang/aktiviti",
    ikon: "AKT",
    tajuk: "Surat Akuan Penyertaan Aktiviti",
    huraian: "Pilih aktiviti yang sedang dibuka oleh sekolah dan lengkapkan akuan penyertaan murid.",
  },
] as const;

export default function BorangAwam() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <a href="https://sktd.edu.my" className="text-sm font-medium text-slate-600 underline underline-offset-4">← Laman utama sekolah</a>
      <header className="mt-6 flex items-center gap-4 rounded-2xl bg-navy-800 p-5 text-white shadow-sm sm:p-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={aset("/logo-sktd.png")} alt="Lencana SK Taman Desaminium" className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/75">SK Taman Desaminium</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">Borang Sekolah</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/85">Borang untuk ibu bapa, penjaga dan orang awam.</p>
        </div>
      </header>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {BORANG.map((borang) => (
          <li key={borang.href}>
            <Link href={borang.href} className="flex h-full min-h-44 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-navy-700 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700">
              <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-xs font-bold text-white">{borang.ikon}</span>
              <h2 className="mt-4 text-lg font-bold leading-snug text-navy-800">{borang.tajuk}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{borang.huraian}</p>
              <span className="mt-4 text-sm font-semibold text-navy-700">Buka borang →</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">Maklumat dihantar terus kepada pihak sekolah dan digunakan untuk urusan berkaitan sahaja.</p>
    </main>
  );
}
