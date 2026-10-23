import Link from "@/components/Pautan";
import { dataKeberhasilan } from "@/lib/keberhasilan";
import PanelKeberhasilan from "./PanelKeberhasilan";

export const metadata = { title: "e-Keberhasilan" };

/**
 * e-Keberhasilan — Borang Keberhasilan PBPPP dua hala (permintaan 16 Okt 2026).
 *
 * Setiap kakitangan ialah PYD pada borangnya sendiri; PP1/PP2 yang
 * ditetapkan pentadbir mendapat tab Pantau. Semua kuasa disemak di
 * `src/lib/keberhasilan.ts` — halaman ini hanya menghantar data.
 */
export default async function Keberhasilan() {
  const d = await dataKeberhasilan();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">e-Keberhasilan {d.tahun}</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Borang Keberhasilan PBPPP — PYD mengisi, PP1 mengesahkan, PP2 memperakui.
      </p>
      {d.belumSedia ? (
        <div className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Modul ini belum dipasang.</p>
          <p className="mt-1.5">{d.mesej}</p>
        </div>
      ) : (
        <PanelKeberhasilan data={d} />
      )}
    </main>
  );
}
