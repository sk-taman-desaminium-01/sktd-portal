import Image from "next/image";
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { SEKOLAH, type AppPortal } from "@/data/sekolah";

/**
 * Hab Portal Kakitangan — pelancar semua app kakitangan.
 *
 * Hab ini PELANCAR sahaja: tiada data app lain disimpan di sini. Setiap app
 * ada subdomain & kebenaran sendiri.
 *
 * Pautan sistem KPM dipapar sebagai SENARAI TEKS di bawah kad, bukan sebagai
 * kad. Keputusan muktamad: kad bermaksud "app kita, kita jaga" — sistem KPM
 * ialah laman luar yang kita tidak kawal.
 *
 * Halaman ini hanya boleh dicapai selepas log masuk; `src/proxy.ts` menolak
 * semua yang lain sebelum render.
 */
const PORTAL = SEKOLAH.portal as AppPortal[];

export default async function Hab() {
  const user = await currentUser();
  const nama = user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? "Cikgu";

  return (
    <main className="min-h-screen bg-navy-900 text-white">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <header className="flex items-center gap-4">
          <Image src="/logo-sktd.png" alt="" width={48} height={48} className="h-11 w-auto" priority />
          <div className="min-w-0">
            <p className="text-sm font-bold">Portal Kakitangan</p>
            <p className="text-xs text-white/60">{SEKOLAH.namaPenuh}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-white/60">Selamat datang</p>
            <p className="truncate text-sm font-semibold">{nama}</p>
            <SignOutButton>
              <button className="mt-1 text-xs text-white/60 underline underline-offset-2 hover:text-white">
                Log keluar
              </button>
            </SignOutButton>
          </div>
        </header>

        <h1 className="mt-10 text-2xl font-bold sm:text-3xl">Aplikasi Kakitangan</h1>
        <p className="mt-2 text-sm text-white/70">
          Klik untuk membuka. App yang belum sedia ditandakan.
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {PORTAL.map((app) => {
            const sedia = app.status === "sedia" && app.pautan;
            const isi = (
              <>
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: app.warna }}
                >
                  {app.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.logo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    app.ikon
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{app.nama}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-white/70">
                    {app.fungsi}
                  </span>
                  <span className="mt-2 block text-xs text-white/40">
                    {app.domain}
                    {!sedia && (
                      <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 font-semibold uppercase tracking-wide">
                        {app.status === "reka" ? "Reka bentuk" : app.status === "bina" ? "Dalam pembinaan" : "Akan datang"}
                      </span>
                    )}
                  </span>
                </span>
              </>
            );
            return (
              <li key={app.id}>
                {sedia ? (
                  <a href={app.pautan} className="flex gap-4 rounded-xl bg-white/5 p-5 ring-1 ring-white/10 hover:ring-white/30">
                    {isi}
                  </a>
                ) : (
                  <div className="flex gap-4 rounded-xl bg-white/5 p-5 opacity-60 ring-1 ring-white/10">
                    {isi}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Sistem KPM — senarai teks, bukan kad. */}
        <section className="mt-12">
          <h2 className="text-lg font-bold">Sistem KPM</h2>
          <p className="mt-1 text-xs text-white/50">
            Laman rasmi KPM. Dibuka dalam tab baharu.
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {SEKOLAH.pautanKpm.map((k) => (
              <div key={k.kumpulan}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-emas">
                  {k.kumpulan}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {k.item.map((i) => (
                    <li key={i.url} className="text-sm">
                      <a href={i.url} target="_blank" rel="noreferrer" className="text-white/80 underline underline-offset-2 hover:text-white">
                        {i.nama}
                      </a>
                      <span className="ml-2 text-xs text-white/40">{i.nota}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
