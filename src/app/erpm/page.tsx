import Link from "next/link";
import { PANITIA } from "@/data/panitia";
import { pengguna } from "@/lib/akses";

export const metadata = { title: "eRPM — Panitia" };

/**
 * Ruang eRPM mengikut panitia.
 *
 * eRPM bukan satu app tunggal; ia satu app SETIAP panitia. Kad "eRPM" di hab
 * membawa ke sini, bukan ke mana-mana sistem tunggal, kerana itulah bentuk
 * sebenarnya: satu panitia sudah hidup, dua belas lagi belum.
 */
export default async function Erpm() {
  const saya = await pengguna();
  if (!saya?.peranan) return null; // proxy.ts sudah menghalang; ini jaring kedua

  const hidup = PANITIA.filter((p) => p.pautan);
  const belum = PANITIA.filter((p) => !p.pautan);

  return (
    <main className="min-h-screen bg-navy-900 bg-[radial-gradient(120%_70%_at_50%_0%,#17406f,var(--color-navy-900)_60%)] px-5 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Portal Kakitangan
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          eRPM <span className="text-emas-muda">Panitia</span>
        </h1>
        <div className="my-4 h-0.5 w-36 bg-gradient-to-r from-transparent via-emas to-transparent" />
        <p className="text-sm leading-relaxed text-white/75">
          Penilaian PBD dalam talian mengikut panitia mata pelajaran — Unit
          Kurikulum, Buku Pengurusan m.80–88. Setiap panitia mempunyai ruangnya
          sendiri.
        </p>

        {/* --- Yang sudah hidup --- */}
        <section className="mt-9">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-emas">
            Sudah tersedia · {hidup.length} panitia
          </h2>
          <ul className="mt-3 space-y-3">
            {hidup.map((p) => (
              <li key={p.kod}>
                <a
                  href={p.pautan!}
                  target="_blank"
                  rel="noreferrer"
                  className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm transition hover:ring-2 hover:ring-emas"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#146b56] text-xs font-bold text-white"
                  >
                    {p.kod}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold text-navy-900">
                      {p.nama} <span className="text-slate-400">↗</span>
                    </span>
                    {p.catatan && (
                      <span className="mt-1 block text-sm leading-relaxed text-slate-600">
                        {p.catatan}
                      </span>
                    )}
                    <span className="mt-2 block text-xs text-slate-400">
                      {new URL(p.pautan!).host}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* --- Yang belum --- */}
        <section className="mt-10">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-white/40">
            Belum disediakan · {belum.length} panitia
          </h2>
          <p className="mt-1.5 text-sm text-white/55">
            Disenaraikan supaya setiap panitia nampak giliran mereka ada dalam
            rancangan. Ketua panitia yang mahu didahulukan boleh beritahu
            pentadbir.
          </p>
          <ul className="mt-4 divide-y divide-white/10 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
            {belum.map((p) => (
              <li key={p.kod} className="flex items-baseline gap-3 px-4 py-3">
                <span className="w-14 shrink-0 font-mono text-xs text-white/40">
                  {p.kod}
                </span>
                <span className="min-w-0 flex-1 text-sm text-white/80">
                  {p.nama}
                  {p.catatan && (
                    <span className="block text-xs text-white/40">{p.catatan}</span>
                  )}
                </span>
                <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                  Belum
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
