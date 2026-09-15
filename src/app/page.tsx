import Image from "next/image";
import { aset } from "@/lib/laluan";
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { SEKOLAH } from "@/data/sekolah";
import { kadIkutBahagian } from "@/data/bahagian";
import KadApp from "@/components/KadApp";
import { NAMA_PERANAN } from "@/lib/peranan";
import { pengguna } from "@/lib/akses";
import { boleh } from "@/lib/peranan";
import Link from "next/link";

/**
 * Hab Portal Kakitangan — padanan `skrinPortal()` dalam mockup yang dibekukan.
 *
 * Reka bentuk diambil terus dari mockup: latar gradien navy, kad PUTIH,
 * tajuk dengan perkataan kedua berwarna emas, pembahagi emas, lencana status
 * setiap app, dan pautan KPM sebagai senarai teks DI BAWAH kad.
 *
 * Hab ini PELANCAR sahaja — tiada data app lain di sini.
 */

function BelumDiberiAkses({
  nama, emel, rasmi,
}: { nama: string; emel: string; rasmi: boolean }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-900 bg-[radial-gradient(120%_70%_at_50%_0%,#17406f,var(--color-navy-900)_60%)] px-5 py-14 text-white">
      <div className="w-full max-w-lg text-center">
        <Image src={aset("/logo-sktd.png")} alt="" width={72} height={72} priority className="mx-auto w-16" />
        <h1 className="mt-5 text-2xl font-bold sm:text-3xl">
          Akses belum diberikan
        </h1>
        <div className="mx-auto my-4 h-0.5 w-36 bg-gradient-to-r from-transparent via-emas to-transparent" />

        <div className="rounded-xl bg-white/5 p-5 text-left ring-1 ring-white/10">
          <p className="text-sm leading-relaxed text-white/80">
            Log masuk anda <b>berjaya</b>, {nama}. Akaun anda sah — cuma belum
            dimasukkan ke dalam senarai akses portal.
          </p>
          <p className="mt-3 rounded-lg bg-navy-900/60 px-3 py-2 font-mono text-xs text-white/70">
            {emel}
          </p>
          {!rasmi && (
            <p className="mt-3 rounded-lg bg-[#fdf3dc] px-3 py-2 text-xs leading-relaxed text-[#9a6b06]">
              Emel ini bukan dari domain rasmi sekolah. Portal ini untuk akaun{" "}
              <b>@moe-dl.edu.my</b> sahaja — sila log keluar dan masuk semula
              dengan akaun rasmi anda.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white/5 p-5 text-left ring-1 ring-white/10">
          <p className="text-sm font-semibold text-emas-muda">Apa perlu dibuat</p>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Hubungi <b>pentadbir sekolah</b> dan minta akaun anda ditambah ke
            senarai akses portal. Beritahu mereka emel di atas — itu yang
            mereka perlukan.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-white/50">
            Selepas ditambah, log keluar dan masuk semula.
          </p>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <SignOutButton>
            <button className="rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10">
              Log keluar
            </button>
          </SignOutButton>
          <a href="https://sktd.edu.my"
            className="rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10">
            ← Laman Sekolah
          </a>
        </div>
      </div>
    </main>
  );
}

export default async function Hab() {
  const user = await currentUser();
  const saya = await pengguna();
  const admin = saya?.peranan === "admin" || saya?.peranan === "admin_mutlak";

  const nama = user?.fullName ?? user?.firstName ?? "Cikgu";
  const emel = user?.emailAddresses[0]?.emailAddress ?? "";

  // Log masuk berjaya TETAPI belum ada dalam senarai akses.
  // Tanpa skrin ini guru nampak hab kosong dan fikir sistem rosak — dan pada
  // hari pertama, 150 guru yang keliru bermakna 150 soalan kepada pentadbir.
  if (!saya?.peranan) {
    return <BelumDiberiAkses nama={nama} emel={emel} rasmi={saya?.rasmi ?? false} />;
  }

  return (
    <main className="min-h-screen bg-navy-900 bg-[radial-gradient(120%_70%_at_50%_0%,#17406f,var(--color-navy-900)_60%)] px-5 py-14 text-white">
      {/* ---------- Kepala ---------- */}
      <header className="mx-auto flex max-w-xl flex-col items-center text-center">
        <Image src={aset("/logo-sktd.png")} alt="" width={72} height={72} priority className="w-16 sm:w-[72px]" />
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
              {NAMA_PERANAN[saya.peranan]}
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

      {/* ---------- Pentadbiran: hanya untuk yang berkuasa ----------
          Tanpa bahagian ini, skrin /admin dan /admin/akses wujud tetapi TIADA
          sesiapa boleh menemuinya. Dipapar ikut keupayaan, bukan ikut peranan
          — jadi menambah peranan baharu tidak memerlukan perubahan di sini. */}
      {(boleh(saya.peranan, "terbit_kandungan") || boleh(saya.peranan, "urus_akses")) && (
        <section className="mx-auto mt-9 max-w-4xl">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-emas">
            Pentadbiran
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {boleh(saya.peranan, "terbit_kandungan") && (
              <li>
                <Link href="/admin"
                  className="block rounded-xl bg-white/5 p-4 ring-1 ring-white/10 hover:ring-emas">
                  <span className="block font-semibold text-white">Urus Laman Web</span>
                  <span className="mt-1 block text-sm text-white/65">
                    Pengumuman &amp; aktiviti. Terbit terus ke sktd.edu.my.
                  </span>
                </Link>
              </li>
            )}
            {boleh(saya.peranan, "urus_akses") && (
              <li>
                <Link href="/admin/akses"
                  className="block rounded-xl bg-white/5 p-4 ring-1 ring-white/10 hover:ring-emas">
                  <span className="block font-semibold text-white">Senarai Akses</span>
                  <span className="mt-1 block text-sm text-white/65">
                    Siapa boleh masuk portal, dan apa peranan mereka.
                  </span>
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* ---------- Kad app, dikumpul ikut unit Buku Pengurusan ----------
          Sebelum ini semua app dalam SATU grid rata: guru terpaksa mengimbas
          setiap kad untuk mencari satu. Buku Pengurusan sudah membahagikan
          kerja sekolah kepada unit dan setiap guru sudah tahu unit mereka,
          jadi hab mengikut pembahagian yang sama. Rujukan muka surat
          dikekalkan supaya sesiapa boleh menyemak dari mana ia datang. */}
      {kadIkutBahagian().map(({ bahagian, kad }) => (
        <section key={bahagian.kod} className="mx-auto mt-10 max-w-4xl">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-emas">
              {bahagian.nama}
            </h2>
            {bahagian.muka && (
              <span className="text-[11px] text-white/35">
                Buku Pengurusan m.{bahagian.muka}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/55">{bahagian.ringkas}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {kad.map((app) => (
              <KadApp
                key={app.id}
                app={app}
                // Paparan sahaja — kawalan sebenar di pelayan pada setiap laluan.
                terkunci={Boolean(app.perluPentadbir) && !admin}
              />
            ))}
          </div>
        </section>
      ))}

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
