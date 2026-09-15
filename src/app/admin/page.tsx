import Link from "next/link";
import { senaraiPos } from "@/lib/cms";

export const metadata = { title: "Urus Laman Web" };

/** Senarai pos — draf ditunjukkan dengan JELAS supaya tiada silap terbit. */
export default async function Admin() {
  const pos = await senaraiPos();
  const draf = pos.filter((p) => p.status === "draf").length;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Urus Laman Web</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pos.length} pos · {draf} draf
          </p>
        </div>
        <Link
          href="/admin/pos"
          className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700"
        >
          + Pos baharu
        </Link>
      </div>

      {pos.length === 0 ? (
        <p className="mt-8 rounded-xl border border-garis bg-white p-6 text-center text-sm text-slate-500">
          Belum ada pos. Tekan “Pos baharu” untuk mula.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-garis overflow-hidden rounded-xl border border-garis bg-white">
          {pos.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/pos?id=${p.id}`} className="flex items-start gap-3 p-4 hover:bg-navy-50">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy-800">{p.tajuk}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {p.jenis} · /{p.slug}
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
                  {p.keutamaan === "segera" && (
                    <span className="rounded bg-[#fbeaea] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#a32a2a]">
                      Segera
                    </span>
                  )}
                  {/* Draf mesti kelihatan sangat berbeza — silap di sini
                      bermakna sesuatu terbit sebelum masanya. */}
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      p.status === "terbit"
                        ? "bg-[#e5f4ec] text-[#167a4b]"
                        : "bg-[#fdf3dc] text-[#9a6b06]"
                    }`}
                  >
                    {p.status}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Pos <b>draf</b> tidak kelihatan di laman awam — pelawat mendapat 404.
        Pos <b>terbit</b> mencetuskan binaan semula laman awam; ia muncul dalam 1–2 minit.
      </p>
    </main>
  );
}
