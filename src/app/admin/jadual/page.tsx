import Link from "next/link";
import { ambilJadual } from "@/lib/jadual";
import { semuaKelas } from "@/data/kelas";
import PanelJadual from "./PanelJadual";

export const metadata = { title: "Jadual Waktu" };

export default async function JadualAdmin() {
  const jadual = await ambilJadual();
  const kelas = semuaKelas();
  const diisi = kelas.filter((k) => {
    const h = jadual.kelas[k]?.hari;
    return h && Object.values(h).some((w) => w && Object.keys(w).length > 0);
  }).length;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-navy-700">
        ← Urus Laman Web
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-navy-800">Jadual Waktu</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {diisi} daripada {kelas.length} kelas sudah ada jadual. Ibu bapa
        melihatnya di laman sekolah.
      </p>

      <p className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
        <b>Semak waktu dahulu.</b> Waktu yang dipaparkan sekarang ialah corak
        biasa sekolah rendah, bukan waktu rasmi SKTD. Betulkan di bahagian
        &ldquo;Waktu sesi&rdquo; sebelum mengisi jadual — menukarnya kemudian
        akan mengubah paparan semua kelas sekaligus.
      </p>

      <PanelJadual awal={jadual} kelas={kelas} />
    </main>
  );
}
