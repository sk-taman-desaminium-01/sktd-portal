import Link from "next/link";
import { aktivitiAwam } from "@/lib/borang-aktiviti";
import { julatTarikh } from "@/data/borang-aktiviti";

export const metadata = {
  title: "Surat Akuan Penyertaan Aktiviti",
  description: "Aktiviti SK Taman Desaminium yang sedang menerima akuan ibu bapa atau penjaga.",
  referrer: "no-referrer" as const,
};

function tarikhMY(nilai: string) {
  const tarikh = new Date(`${nilai}T12:00:00`);
  return Number.isNaN(tarikh.getTime()) ? nilai : tarikh.toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" });
}

export default async function AktivitiAwam() {
  const senarai = await aktivitiAwam();
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/borang" className="text-sm font-medium text-slate-600 underline underline-offset-4">← Borang Sekolah</Link>
      <h1 className="mt-5 text-2xl font-bold leading-tight text-navy-800 sm:text-3xl">Surat Akuan Penyertaan Aktiviti</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">Hanya aktiviti yang sedang dibuka dipaparkan. Pilih aktiviti anak atau jagaan anda untuk mengisi akuan.</p>

      {senarai.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {senarai.map((aktiviti) => (
            <li key={aktiviti.id}>
              <Link href={`/kebenaran/${aktiviti.id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-navy-700 hover:shadow-md">
                <h2 className="font-bold leading-snug text-navy-800">{aktiviti.nama}</h2>
                <dl className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-[7rem_1fr]">
                  <dt className="font-semibold">Tarikh</dt><dd>{julatTarikh(aktiviti.tarikh, aktiviti.tarikh_tamat, false)}</dd>
                  <dt className="font-semibold">Masa</dt><dd>{aktiviti.masa}</dd>
                  <dt className="font-semibold">Tempat</dt><dd>{aktiviti.tempat}</dd>
                  <dt className="font-semibold">Anjuran</dt><dd>{aktiviti.anjuran}</dd>
                </dl>
                <p className="mt-4 text-xs font-semibold text-[#8a5a00]">Borang ditutup {tarikhMY(aktiviti.tutup)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-semibold text-navy-800">Tiada aktiviti dibuka buat masa ini.</p>
          <p className="mt-2 text-sm text-slate-500">Aktiviti akan muncul di sini selepas pihak sekolah membukanya.</p>
        </div>
      )}
    </main>
  );
}
