import { senaraiAkses } from "@/lib/akses-urus";
import { pengguna } from "@/lib/akses";
import { NAMA_PERANAN, HURAIAN_PERANAN, PERANAN } from "@/lib/peranan";
import PanelAkses from "./PanelAkses";

export const metadata = { title: "Senarai Akses" };

export default async function Akses() {
  const [baris, saya] = await Promise.all([senaraiAkses(), pengguna()]);
  const mutlak = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-bold text-navy-800">Senarai Akses</h1>
      <p className="mt-1 text-sm text-slate-500">
        Siapa boleh masuk portal, dan apa kuasa mereka.
      </p>

      {/* Admin mutlak dipapar berasingan supaya perbezaannya jelas. */}
      <section className="mt-7 rounded-xl border-2 border-emas bg-[#fdf9f0] p-5">
        <h2 className="text-base font-bold text-navy-900">
          Admin Mutlak · {mutlak.length} orang
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {HURAIAN_PERANAN.admin_mutlak}
        </p>
        <ul className="mt-3 space-y-1">
          {mutlak.map((e) => (
            <li key={e} className="font-mono text-sm text-navy-800">
              {e}
              {saya?.emel === e.toLowerCase() && (
                <span className="ml-2 rounded bg-emas px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-900">
                  Anda
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Tidak boleh ditambah atau dibuang di skrin ini — ia ditetapkan dalam
          env pelayan. Ini disengajakan: ia kunci pendua supaya sekolah tidak
          boleh terkunci keluar dari portalnya sendiri.
        </p>
      </section>

      <PanelAkses baris={baris} />

      <section className="mt-10">
        <h2 className="text-base font-bold text-navy-800">Maksud setiap peranan</h2>
        <dl className="mt-3 divide-y divide-garis overflow-hidden rounded-xl border border-garis bg-white">
          {(["admin_mutlak", ...PERANAN] as const).map((p) => (
            <div key={p} className="p-4">
              <dt className="text-sm font-semibold text-navy-800">{NAMA_PERANAN[p]}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-600">
                {HURAIAN_PERANAN[p]}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
