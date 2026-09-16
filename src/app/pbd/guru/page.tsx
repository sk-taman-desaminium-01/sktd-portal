import Link from "next/link";
import { kuasaPbd, sesiSemasa, labelKelas } from "@/lib/pbd";
import { namaSubjek } from "@/data/subjek";

export const metadata = { title: "ePBD-Guru" };

/**
 * ePBD-Guru — pengisian PBD oleh GURU SUBJEK.
 *
 * Diasingkan daripada ePBD-Slip (keputusan pengguna, 17 Sep 2026), dan
 * pengasingan itu mengikut pembahagian kerja sebenar di sekolah:
 *
 *   · guru SUBJEK mengisi TP dan gred — mereka membuka skrin ini berkali-kali
 *     sepanjang penggal, satu subjek satu kelas pada satu masa
 *   · guru KELAS mencetak slip — sekali atau dua kali setahun, satu kelas
 *
 * Satu skrin yang memapar kedua-duanya memaksa setiap guru mengimbas
 * bahagian yang bukan kerjanya. Dua kad, dua laluan, dua senarai pendek.
 */
export default async function PbdGuru() {
  const [k, sesi] = await Promise.all([kuasaPbd(), sesiSemasa()]);

  if (!k) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold text-navy-800">ePBD-Guru</h1>
        {sesi && (
          <p className="text-sm text-slate-500">
            Sesi {sesi.tahun_sesi}
            {sesi.status === "tutup" && (
              <span className="ml-2 rounded bg-[#fdf3dc] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9a6b06]">
                Ditutup
              </span>
            )}
          </p>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Subjek yang anda ajar. Isi Tahap Penguasaan dan gred sumatif.
      </p>

      {!sesi && (
        <p className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          Belum ada sesi persekolahan dibuka. Pentadbir perlu membuka sesi dan
          mengimport senarai murid dahulu.
        </p>
      )}

      {k.tugas.length === 0 ? (
        <p className="mt-6 rounded-xl border border-garis bg-white p-5 text-sm leading-relaxed text-slate-600">
          Anda belum ditugaskan mengajar mana-mana subjek untuk sesi ini.
          Pentadbir menetapkannya di skrin <b>Urus ePBD</b>.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {k.tugas.map((t) => (
            <li key={`${t.subjek}-${t.tahun}-${t.kelas}`}>
              <Link
                href={`/pbd/isi?tahun=${t.tahun}&kelas=${encodeURIComponent(t.kelas)}&subjek=${encodeURIComponent(t.subjek)}`}
                className="flex h-full items-center justify-between gap-3 rounded-xl border border-garis bg-white p-4 hover:border-navy-700"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-navy-800">{namaSubjek(t.subjek)}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">
                    {labelKelas(t.tahun, t.kelas)}
                  </span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-slate-300">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 rounded-xl border border-garis bg-navy-50 p-4 text-sm leading-relaxed text-navy-800">
        <b>Dua perkara sahaja yang masuk ke slip:</b> Tahap Penguasaan (TP 1–6)
        dan gred sumatif (A–E). Kedua-duanya ditaip anda sendiri — sistem tidak
        pernah mengiranya automatik, kerana tahap penguasaan ialah pertimbangan
        profesional guru.
      </p>
    </main>
  );
}
