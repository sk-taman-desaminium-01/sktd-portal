import Link from "next/link";
import { senaraiGuruKelas } from "@/lib/guru-kelas";
import { senaraiAkses } from "@/lib/akses-urus";
import { semuaKelas } from "@/data/kelas";
import PanelGuruKelas from "./PanelGuruKelas";

export const metadata = { title: "Guru Kelas" };

/**
 * Tetapkan siapa guru kelas bagi setiap kelas.
 *
 * Skrin ini ialah PASANGAN kepada Jadual Waktu: guru kelas hanya boleh
 * menyunting jadual kelas yang ditugaskan kepadanya DI SINI. Tanpa skrin ini,
 * keupayaan itu wujud dalam kod tetapi tiada sesiapa boleh menggunakannya.
 */
export default async function GuruKelas() {
  const [tugasan, orang] = await Promise.all([senaraiGuruKelas(), senaraiAkses()]);

  // Hanya orang yang SUDAH dibenarkan masuk portal boleh ditugaskan — kalau
  // tidak, mereka dilantik guru kelas tetapi tidak boleh log masuk untuk
  // membuat kerja itu.
  const boleh = orang
    .filter((o) => o.dibenarkan)
    .map((o) => ({ id: o.id, nama: o.nama, emel: o.email }));

  const kelas = semuaKelas();
  const petaan = Object.fromEntries(tugasan.map((t) => [t.label, t]));

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-navy-700">
        ← Urus Laman
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-navy-800">Guru Kelas</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {tugasan.length} daripada {kelas.length} kelas sudah ada guru kelas.
      </p>

      <p className="mt-5 rounded-xl border border-garis bg-navy-50 p-4 text-sm leading-relaxed text-navy-800">
        Guru kelas boleh menyunting <b>jadual waktu kelasnya sendiri sahaja</b>.
        Pentadbir dan admin boleh menyunting semua kelas. Seorang guru boleh
        memegang lebih daripada satu kelas.
      </p>

      {boleh.length === 0 ? (
        <p className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          Belum ada sesiapa dalam senarai akses yang dibenarkan masuk portal,
          jadi tiada siapa boleh ditugaskan lagi. Luluskan guru di{" "}
          <Link href="/admin/akses" className="font-semibold underline">
            Senarai Akses
          </Link>{" "}
          dahulu.
        </p>
      ) : (
        <PanelGuruKelas kelas={kelas} awal={petaan} orang={boleh} />
      )}
    </main>
  );
}
