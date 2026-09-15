import { senaraiAkses } from "@/lib/akses-urus";
import { pengguna } from "@/lib/akses";
import {
  NAMA_PERANAN, HURAIAN_PERANAN, perananBolehDiberi,
} from "@/lib/peranan";
import PanelAkses from "./PanelAkses";

export const metadata = { title: "Senarai Akses" };

/**
 * KENAPA HALAMAN INI MENAPIS IKUT SIAPA YANG MELIHAT
 *
 * Versi pertama memapar senarai penuh emel admin mutlak kepada sesiapa yang
 * mempunyai `urus_akses` — termasuk setiap pentadbir. Itu membocorkan dua
 * perkara yang pengguna mahu rahsiakan (16 Sep 2026): bahawa lapisan mutlak
 * WUJUD, dan SIAPA di dalamnya.
 *
 * Sekarang: bahagian mutlak dan senarai jawatankuasa admin hanya dipapar
 * kepada admin mutlak. Penapisan berlaku di PELAYAN — baris `admin` tidak
 * pernah meninggalkan `senaraiAkses()` untuk bukan-mutlak, jadi ia tidak
 * wujud dalam payload RSC walaupun tersembunyi dari skrin.
 */
export default async function Akses() {
  const [baris, saya] = await Promise.all([senaraiAkses(), pengguna()]);
  const mutlak = saya?.peranan === "admin_mutlak";

  const senaraiEmelMutlak = mutlak
    ? (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean)
    : [];

  const perananDipapar = mutlak
    ? (["admin_mutlak", ...perananBolehDiberi(saya?.peranan ?? null)] as const)
    : perananBolehDiberi(saya?.peranan ?? null);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-bold text-navy-800">Senarai Akses</h1>
      <p className="mt-1 text-sm text-slate-500">
        Siapa boleh masuk portal, dan apa kuasa mereka.
      </p>

      {mutlak && (
        <section className="mt-7 rounded-xl border-2 border-emas bg-[#fdf9f0] p-5">
          <h2 className="text-base font-bold text-navy-900">
            Admin Mutlak · {senaraiEmelMutlak.length} orang
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            {HURAIAN_PERANAN.admin_mutlak}
          </p>
          <ul className="mt-3 space-y-1">
            {senaraiEmelMutlak.map((e) => (
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
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Tidak boleh ditambah atau dibuang di skrin ini — ia ditetapkan
            dalam env pelayan. Ini disengajakan: ia kunci pendua supaya sekolah
            tidak boleh terkunci keluar dari portalnya sendiri.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[#9a6b06]">
            Bahagian ini, dan senarai ahli jawatankuasa admin, hanya kelihatan
            kepada admin mutlak. Pentadbir dan admin lain tidak nampak.
          </p>
        </section>
      )}

      <PanelAkses baris={baris} peranan={[...perananBolehDiberi(saya?.peranan ?? null)]} />

      <section className="mt-10">
        <h2 className="text-base font-bold text-navy-800">Maksud setiap peranan</h2>
        <dl className="mt-3 divide-y divide-garis overflow-hidden rounded-xl border border-garis bg-white">
          {perananDipapar.map((p) => (
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
