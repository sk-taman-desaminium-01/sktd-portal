import Link from "next/link";
import { notFound } from "next/navigation";
import { kadAsal } from "@/data/bahagian";
import { BAHAGIAN } from "@/data/bahagian";
import { pengguna } from "@/lib/akses";

/**
 * TAPAK PEMBINAAN — satu halaman untuk setiap modul yang belum siap.
 *
 * Keputusan pengguna (16 Sep 2026): "kalau projek tu dalam pembinaan,
 * siapkan tapak pembinaan sahaja."
 *
 * Satu laluan dinamik, bukan sembilan halaman terpisah. Isinya datang dari
 * `KAD_TAMBAHAN` dalam `src/data/bahagian.ts` — jadi menambah modul baharu
 * bermakna menambah SATU objek data, bukan menulis halaman baharu yang akan
 * lari sedikit demi sedikit daripada yang lain.
 */

const STATUS: Record<string, { tajuk: string; huraian: string; kelas: string }> = {
  bina: {
    tajuk: "Dalam pembinaan",
    huraian: "Kerja sedang berjalan. Sebahagian fungsi mungkin sudah boleh diuji.",
    kelas: "bg-[#fdf3dc] text-[#9a6b06]",
  },
  reka: {
    tajuk: "Peringkat reka bentuk",
    huraian: "Bentuk dan aliran sedang diputuskan. Kod belum ditulis.",
    kelas: "bg-navy-100 text-navy-700",
  },
  akan: {
    tajuk: "Akan datang",
    huraian: "Sudah dipersetujui dan ada dalam senarai, tetapi kerja belum bermula.",
    kelas: "bg-[#eef1f5] text-slate-500",
  },
  sedia: {
    tajuk: "Sedia",
    huraian: "Modul ini sudah boleh digunakan.",
    kelas: "bg-[#e5f4ec] text-[#167a4b]",
  },
};

export async function generateMetadata({
  params,
}: { params: Promise<{ modul: string }> }) {
  const { modul } = await params;
  const app = kadAsal().find((a) => a.id === modul);
  return { title: app ? app.nama : "Tapak Pembinaan" };
}

export default async function TapakPembinaan({
  params,
}: { params: Promise<{ modul: string }> }) {
  const { modul } = await params;
  const saya = await pengguna();
  if (!saya?.peranan) return null; // proxy.ts sudah menghalang; ini jaring kedua

  const app = kadAsal().find((a) => a.id === modul);
  if (!app) notFound();

  const unit = BAHAGIAN.find((b) => b.kod === app.bahagian);
  const st = STATUS[app.status];

  return (
    <main className="min-h-screen bg-navy-900 bg-[radial-gradient(120%_70%_at_50%_0%,#17406f,var(--color-navy-900)_60%)] px-5 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Portal Kakitangan
        </Link>

        <div className="mt-6 flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: app.warna }}
          >
            {app.ikon}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{app.nama}</h1>
            <p className="mt-1 text-sm text-white/55">
              {unit?.nama}
              {unit?.muka && ` · Buku Pengurusan m.${unit.muka}`}
            </p>
          </div>
        </div>

        <div className="my-6 h-0.5 w-36 bg-gradient-to-r from-transparent via-emas to-transparent" />

        <div className="rounded-2xl bg-white p-6 text-slate-700 shadow-sm">
          <span className={`inline-block rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${st.kelas}`}>
            {st.tajuk}
          </span>
          <p className="mt-3 text-sm leading-relaxed">{st.huraian}</p>

          <h2 className="mt-6 text-base font-bold text-navy-800">Apa modul ini buat</h2>
          <p className="mt-1.5 text-sm leading-relaxed">{app.fungsi}</p>
          {app.catatan && (
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{app.catatan}</p>
          )}

          {app.rancangan && app.rancangan.length > 0 && (
            <>
              <h2 className="mt-6 text-base font-bold text-navy-800">Yang dirancang</h2>
              <ul className="mt-2 space-y-2">
                {app.rancangan.map((r) => (
                  <li key={r} className="flex gap-2.5 text-sm leading-relaxed">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emas" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-6 rounded-xl bg-navy-50 p-4">
            <p className="text-sm leading-relaxed text-navy-800">
              <b>Alamat yang dirancang:</b>{" "}
              <span className="font-mono text-xs">{app.domain}</span>
              {app.domainCadangan && (
                <span className="text-slate-500"> — masih cadangan, belum disahkan.</span>
              )}
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-white/55">
          Ada pandangan tentang modul ini? Beritahu pentadbir sebelum ia dibina —
          jauh lebih murah mengubah rancangan daripada mengubah sistem yang
          sudah siap.
        </p>
      </div>
    </main>
  );
}
