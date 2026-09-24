import Link from "next/link";
import { bacaKuota, type JadualSaiz } from "@/lib/kuota";

export const metadata = { title: "Kuota Sistem" };

/**
 * Halaman kuota — supaya "sistem terkunci" tidak pernah menjadi kejutan.
 *
 * Peraturan keras #8: amaran pada 70%, bukan 100%. Halaman ini memaparkan
 * nombor; kerja harian `semak_kuota()` dalam supabase/pemantau-kuota.sql
 * yang MEMBERITAHU pentadbir, kerana halaman yang tiada siapa buka tidak
 * memberi amaran kepada sesiapa.
 */

function mb(bait: number): string {
  return bait >= 1024 * 1024 * 1024
    ? `${(bait / 1024 / 1024 / 1024).toFixed(2)} GB`
    : `${(bait / 1024 / 1024).toFixed(1)} MB`;
}

/** Hijau di bawah 70%, kuning 70–89%, merah 90% ke atas. */
function warna(peratus: number): { bar: string; teks: string; label: string } {
  if (peratus >= 90) return { bar: "bg-red-600", teks: "text-red-700", label: "Kritikal" };
  if (peratus >= 70) return { bar: "bg-amber-500", teks: "text-amber-700", label: "Perlu tindakan" };
  return { bar: "bg-emerald-600", teks: "text-emerald-700", label: "Selamat" };
}

function Palang({ nama, guna, had, peratus, nota }: {
  nama: string; guna: number; had: number; peratus: number; nota?: string;
}) {
  const w = warna(peratus);
  return (
    <div className="rounded-xl border border-garis bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-navy-800">{nama}</h2>
        <span className={`text-sm font-bold ${w.teks}`}>{peratus}% · {w.label}</span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${w.bar}`}
          style={{ width: `${Math.min(100, Math.max(1.5, peratus))}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {mb(guna)} daripada {mb(had)}
      </p>
      {nota && <p className="mt-1 text-xs text-slate-500">{nota}</p>}
    </div>
  );
}

export default async function KuotaPage() {
  const hasil = await bacaKuota();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-navy-700">
        ← Urus Laman
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Kuota Sistem</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Kuota penuh bermakna sistem <b>berhenti</b>, bukan perlahan: borang
        tidak tersimpan dan muat naik gagal. Pentadbir menerima notifikasi
        automatik apabila mana-mana kuota melepasi 70%.
      </p>

      {!hasil.ok ? (
        <div className={`mt-6 rounded-xl border p-4 text-sm leading-relaxed ${
          hasil.pasang
            ? "border-[#e9d9ae] bg-[#fdf9f0] text-[#7a5a12]"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          <p>{hasil.mesej}</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Palang
              nama="Pangkalan data"
              guna={hasil.kuota.pangkalan_data.bait}
              had={hasil.kuota.pangkalan_data.had}
              peratus={hasil.kuota.pangkalan_data.peratus}
              nota="Murid, gred, borang, notifikasi. Teks — pos hampir tidak memakan ruang."
            />
            <Palang
              nama="Storan fail"
              guna={hasil.kuota.storan.bait}
              had={hasil.kuota.storan.had}
              peratus={hasil.kuota.storan.peratus}
              nota={`${hasil.kuota.storan.fail} fail — poster, PDF, imbasan.`}
            />
          </div>

          <div className="mt-4 rounded-xl border border-garis bg-white p-4">
            <h2 className="font-semibold text-navy-800">Jadual terbesar</h2>
            <p className="mt-1 text-xs text-slate-500">
              Bila pangkalan data membesar, ini yang memberitahu sebabnya.
            </p>
            <ul className="mt-3 divide-y divide-garis text-sm">
              {hasil.kuota.jadual.map((j: JadualSaiz) => (
                <li key={j.jadual} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="truncate font-medium text-navy-800">{j.jadual}</span>
                  <span className="shrink-0 text-slate-500">
                    {mb(j.bait)} · {j.baris.toLocaleString("ms-MY")} baris
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Dibaca {new Date(hasil.kuota.pada).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}
          </p>
        </>
      )}

      {/* Egress tidak boleh diukur dari dalam pangkalan data — jangan
          berpura-pura ia boleh. Katakan di mana ia berada. */}
      <div className="mt-8 rounded-xl border border-garis bg-navy-50/40 p-4 text-sm leading-relaxed text-slate-600">
        <p>
          <b>Lebar jalur (egress) tidak terpapar di sini</b> — Supabase tidak
          mendedahkannya kepada pangkalan data. Ia ada di{" "}
          <a
            href="https://supabase.com/dashboard/project/_/settings/billing/usage"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-navy-800 underline underline-offset-2"
          >
            Supabase → Usage
          </a>
          . Sejak 24 Sep 2026 semua gambar dihidangkan melalui cache tepi
          Cloudflare, jadi angka itu sepatutnya kekal rendah walaupun
          bilangan pelawat meningkat.
        </p>
      </div>
    </main>
  );
}
