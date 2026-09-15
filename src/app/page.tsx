import Image from "next/image";
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { SEKOLAH, type AppPortal, type StatusApp } from "@/data/sekolah";
import { adakahAdmin } from "@/lib/akses";

/**
 * Hab Portal Kakitangan — padanan `skrinPortal()` dalam mockup yang dibekukan.
 *
 * Reka bentuk diambil terus dari mockup: latar gradien navy, kad PUTIH,
 * tajuk dengan perkataan kedua berwarna emas, pembahagi emas, lencana status
 * setiap app, dan pautan KPM sebagai senarai teks DI BAWAH kad.
 *
 * Hab ini PELANCAR sahaja — tiada data app lain di sini.
 */

const PORTAL = SEKOLAH.portal as AppPortal[];

const LABEL: Record<StatusApp, { teks: string; kelas: string }> = {
  sedia: { teks: "Sedia", kelas: "bg-[#e5f4ec] text-[#167a4b]" },
  bina: { teks: "Dalam pembinaan", kelas: "bg-[#fdf3dc] text-[#9a6b06]" },
  reka: { teks: "Peringkat reka bentuk", kelas: "bg-navy-100 text-navy-700" },
  akan: { teks: "Akan datang", kelas: "bg-[#eef1f5] text-slate-500" },
};

export default async function Hab() {
  const user = await currentUser();
  const admin = await adakahAdmin();

  const nama = user?.fullName ?? user?.firstName ?? "Cikgu";
  const emel = user?.emailAddresses[0]?.emailAddress ?? "";

  return (
    <main className="min-h-screen bg-navy-900 bg-[radial-gradient(120%_70%_at_50%_0%,#17406f,var(--color-navy-900)_60%)] px-5 py-14 text-white">
      {/* ---------- Kepala ---------- */}
      <header className="mx-auto flex max-w-xl flex-col items-center text-center">
        <Image src="/logo-sktd.png" alt="" width={72} height={72} priority className="w-16 sm:w-[72px]" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Portal <span className="text-emas-muda">Kakitangan</span>
        </h1>
        <div className="my-4 h-0.5 w-36 bg-gradient-to-r from-transparent via-emas to-transparent" />
        <p className="text-sm leading-relaxed text-white/75">
          Untuk guru dan kakitangan {SEKOLAH.nama}. Semua aplikasi di{" "}
          <b>sktd.edu.my</b> berkongsi satu log masuk.
        </p>
      </header>

      {/* ---------- Sesi: siapa yang log masuk ---------- */}
      <section className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center gap-4 rounded-xl bg-white/5 px-5 py-4 ring-1 ring-white/10">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emas text-lg font-bold text-navy-900">
          {(nama || "?").charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-sm font-bold">
            {nama}
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                admin ? "bg-emas text-navy-900" : "bg-white/15 text-white/70"
              }`}
            >
              {admin ? "Pentadbir" : "Kakitangan"}
            </span>
          </span>
          {emel && <span className="mt-0.5 block truncate text-xs text-white/60">{emel}</span>}
        </span>
        <SignOutButton>
          <button className="shrink-0 rounded-lg border border-white/25 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10">
            Log keluar
          </button>
        </SignOutButton>
      </section>

      {/* ---------- Kad app ---------- */}
      <section className="mx-auto mt-9 grid max-w-4xl gap-4 sm:grid-cols-2">
        {PORTAL.map((app) => {
          // Kad yang perlu peranan pentadbir: guru biasa nampak kad TERKUNCI,
          // bukan pautan. Ini paparan sahaja — kawalan sebenar di pelayan.
          const terkunci = Boolean(app.perluPentadbir) && !admin;
          const lencana = terkunci
            ? { teks: "Tiada akses", kelas: "bg-[#eef1f5] text-slate-500" }
            : LABEL[app.status];
          const bolehBuka = Boolean(app.pautan) && !terkunci;

          const isi = (
            <>
              <div className="flex items-start justify-between gap-3">
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
                <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${lencana.kelas}`}>
                  {lencana.teks}
                </span>
              </div>

              <h2 className="mt-3.5 text-lg font-bold text-navy-900">
                {app.nama}
                {app.luaran && <span title="Laman luar" className="ml-1.5 text-slate-400">↗</span>}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{app.fungsi}</p>
              {app.catatan && <p className="mt-2 text-xs leading-relaxed text-slate-500">{app.catatan}</p>}
              {app.akses && <p className="mt-2 text-xs text-slate-500">🔒 {app.akses}</p>}

              <div className="mt-auto flex items-end justify-between gap-3 pt-4 text-xs">
                <span className="min-w-0 truncate text-slate-400">
                  {app.domain}
                  {app.domainCadangan && <i> (cadangan)</i>}
                </span>
                {bolehBuka && (
                  <span className="shrink-0 font-semibold text-navy-700">
                    {app.luaran ? "Buka laman ↗" : "Buka →"}
                  </span>
                )}
              </div>
            </>
          );

          const kelas = "flex h-full flex-col rounded-2xl bg-white p-5 text-left";
          return (
            <div key={app.id}>
              {bolehBuka ? (
                <a
                  href={app.pautan}
                  {...(app.luaran ? { target: "_blank", rel: "noreferrer" } : {})}
                  className={`${kelas} shadow-sm ring-1 ring-white/10 transition hover:ring-2 hover:ring-emas`}
                >
                  {isi}
                </a>
              ) : (
                <div className={`${kelas} opacity-70`}>{isi}</div>
              )}
            </div>
          );
        })}
      </section>

      {/* ---------- Pautan KPM: senarai teks, BUKAN kad ---------- */}
      <section className="mx-auto mt-14 max-w-4xl">
        <div className="text-center">
          <h2 className="text-xl font-bold">Pautan Sistem KPM</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
            Sistem rasmi KPM dan ANM — bukan sebahagian portal ini. Semuanya
            dibuka di tab baharu dan ada log masuk sendiri. Sejak 2026, banyak
            sistem KPM masuk melalui <b>idMe</b> guna ID DELIMa.
          </p>
        </div>

        <div className="mt-7 grid gap-7 text-left sm:grid-cols-2">
          {SEKOLAH.pautanKpm.map((k) => (
            <div key={k.kumpulan}>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-emas">
                {k.kumpulan}
              </h3>
              <ul className="mt-2.5 space-y-2">
                {k.item.map((x) => (
                  <li key={x.url} className="text-sm leading-snug">
                    <a
                      href={x.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-white/85 underline underline-offset-2 hover:text-white"
                    >
                      {x.nama} <span className="text-white/40">↗</span>
                    </a>
                    {x.nota && <span className="mt-0.5 block text-xs text-white/45">{x.nota}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className="mx-auto mt-12 max-w-2xl text-center text-xs leading-relaxed text-white/45">
        Aplikasi bertanda ↗ dibina dan diurus oleh pasukan lain; ia dibuka di
        tab baharu dengan log masuknya sendiri.
      </p>

      <div className="mt-8 flex justify-center">
        <a
          href="https://sktd.edu.my"
          className="rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          ← Laman Sekolah
        </a>
      </div>
    </main>
  );
}
