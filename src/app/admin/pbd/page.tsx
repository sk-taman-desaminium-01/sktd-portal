import Link from "next/link";
import { pengguna } from "@/lib/akses";
import { boleh } from "@/lib/peranan";
import { senaraiAkses } from "@/lib/akses-urus";
import { sesiSemasa, kelasBerisi, tugasanSubjek } from "@/lib/pbd";
import PanelUrusPbd from "./PanelUrusPbd";

export const metadata = { title: "Urus ePBD" };

/**
 * Pentadbiran ePBD — sesi, murid, dan tugasan guru subjek.
 *
 * Halaman ini yang membuka sistem: tanpa murid diimport dan tanpa guru
 * subjek ditugaskan, skrin guru kosong dan tiada sesiapa boleh mengisi
 * apa-apa. Itu sebabnya kedua-duanya duduk di sini bersama, bukan
 * bertaburan.
 */
export default async function UrusPbd() {
  const saya = await pengguna();
  if (!boleh(saya?.peranan ?? null, "urus_guru_kelas")) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <p className="mt-2 text-sm text-slate-600">ePBD diurus oleh pentadbir sekolah.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  const sesi = await sesiSemasa();
  const [kelas, tugasan, orang] = await Promise.all([
    sesi ? kelasBerisi(sesi.tahun_sesi) : Promise.resolve([]),
    sesi ? tugasanSubjek(sesi.tahun_sesi) : Promise.resolve([]),
    senaraiAkses(),
  ]);

  // Hanya orang yang SUDAH dibenarkan masuk portal boleh ditugaskan —
  // kalau tidak mereka dilantik guru subjek tetapi tidak boleh log masuk
  // untuk membuat kerja itu.
  const guru = orang
    .filter((o) => o.dibenarkan)
    .map((o) => ({ emel: (o.email ?? "").trim(), nama: (o.nama ?? "").trim() }))
    .filter((o) => o.emel !== "")
    .sort((a, b) => (a.nama || a.emel).localeCompare(b.nama || b.emel, "ms"));

  const jumlahMurid = kelas.reduce((a, k) => a + k.bil, 0);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-navy-700">
        ← Urus Laman Web
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-navy-800">Urus ePBD</h1>
      <p className="mt-1 text-sm text-slate-500">
        {sesi
          ? `Sesi ${sesi.tahun_sesi} · ${jumlahMurid} murid · ${kelas.length} kelas · ${tugasan.length} tugasan guru subjek`
          : "Belum ada sesi persekolahan."}
      </p>

      {!sesi && (
        <p className="mt-6 rounded-xl border border-[#e9c4c4] bg-[#fdf1f1] p-5 text-sm leading-relaxed text-[#8f2b2b]">
          Tiada sesi dalam pangkalan data. Jalankan <code>supabase/epbd.sql</code>{" "}
          dahulu — ia mencipta sesi tahun semasa secara automatik.
        </p>
      )}

      {sesi?.status === "tutup" && (
        <p className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
          Sesi {sesi.tahun_sesi} sudah <b>ditutup</b>. Tiada import dan tiada
          perubahan keputusan dibenarkan sehingga sesi baharu dibuka.
        </p>
      )}

      {sesi && sesi.status !== "tutup" && (
        <PanelUrusPbd
          tugasanAwal={tugasan.map((t) => ({
            id: t.id, emel: t.emel, subjek: t.subjek, tahun: t.tahun, kelas: t.kelas,
          }))}
          senaraiGuru={guru}
          senaraiKelas={kelas.map((k) => ({ tahun: k.tahun, kelas: k.kelas }))}
        />
      )}
    </main>
  );
}
